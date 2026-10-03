import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req: Request): Promise<Response> {
  try {
    const b = createClientFromRequest(req);
    if (!await b.auth.isAuthenticated()) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const caller = await b.auth.me();
    if (!caller || caller.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
    const entities = b.asServiceRole.entities;
    const protectedUser = u => u.role === 'admin' || (u.account_type || u.data?.account_type) === 'admin' || (u.account_type || u.data?.account_type) === 'landowner';
    const protectedIds = new Set([caller.id]), targets = [];
    let userCount = 0, skip = 0;
    // User does not support cursor pages; collect account IDs before any deletion.
    while (true) {
      const users = await entities.User.list('-created_date', 200, skip);
      userCount += users.length;
      for (const user of users) {
        if (protectedUser(user)) protectedIds.add(user.id);
        else targets.push(user.id);
      }
      if (users.length < 200) break;
      skip += users.length;
    }
    const names = ['Application', 'Tenancy', 'Payment', 'RentCharge', 'Maintenance', 'Inspection', 'Notice', 'VacationRequest', 'Feedback', 'TenancyReview', 'TenantReview', 'PropertyReview', 'ChatMessage', 'Document', 'NextOfKin'];
    const report = { tenantUsersRemoved: 0, tenantUsersKept: userCount, deletedRecords: Object.fromEntries(['Tenant', ...names, 'Notification'].map(name => [name, 0])), unitResets: 0, errors: [] };
    const recordError = (entity, target, error) => report.errors.push({ entity, target, error: error.message || String(error) });
    const tenantIds = new Set(), tenancyIds = new Set(), applicationIds = new Set(), tenantUserIds = new Set(targets);
    const scan = async (name, fields, handle) => {
      let cursor;
      do {
        const page = await entities[name].list({ limit: 200, cursor, fields, sort: '-created_date' });
        await handle(page.items);
        cursor = page.has_more ? page.next_cursor : null;
      } while (cursor);
    };
    const owned = row => {
      if (row.tenant_user_id && protectedIds.has(row.tenant_user_id)) return false;
      return Boolean((row.tenant_user_id && !protectedIds.has(row.tenant_user_id)) || tenantIds.has(row.tenant_id) || tenancyIds.has(row.tenancy_id) || applicationIds.has(row.application_id));
    };
    // Include tenant profiles left behind by previous account-only purges and
    // legacy records linked through tenant_id rather than tenant_user_id.
    await scan('Tenant', ['id', 'user_id'], async rows => {
      for (const row of rows) if (!protectedIds.has(row.user_id)) {
        tenantIds.add(row.id);
        if (row.user_id) tenantUserIds.add(row.user_id);
      }
    });
    await scan('Tenancy', ['id', 'tenant_user_id', 'tenant_id'], async rows => {
      for (const row of rows) if (owned(row)) {
        tenancyIds.add(row.id);
        if (row.tenant_id) tenantIds.add(row.tenant_id);
        if (row.tenant_user_id) tenantUserIds.add(row.tenant_user_id);
      }
    });
    await scan('Application', ['id', 'tenant_user_id', 'tenant_id'], async rows => {
      for (const row of rows) if (owned(row)) {
        applicationIds.add(row.id);
        if (row.tenant_id) tenantIds.add(row.tenant_id);
        if (row.tenant_user_id) tenantUserIds.add(row.tenant_user_id);
      }
    });
    const remove = async (name, query) => {
      const result = await entities[name].deleteMany(query);
      if (result.success === false || !Number.isFinite(result.deleted)) throw new Error('Deletion did not return a confirmed count.');
      report.deletedRecords[name] += result.deleted;
    };
    for (const name of names) {
      try {
        await scan(name, ['id', 'tenant_user_id', 'tenant_id', 'tenancy_id', 'application_id'], async rows => {
          const selected = rows.filter(owned);
          if (!selected.length) return;
          const identities = [];
          for (const field of ['tenant_user_id', 'tenant_id', 'tenancy_id', 'application_id']) {
            const values = [...new Set(selected.map(row => row[field]).filter(Boolean))];
            if (values.length) identities.push({ [field]: { $in: values } });
          }
          for (const row of selected) if (row.tenant_user_id) tenantUserIds.add(row.tenant_user_id);
          try { await remove(name, { id: { $in: selected.map(row => row.id) }, $or: identities }); }
          catch (error) { recordError(name, selected.map(row => row.id).join(','), error); }
        });
      } catch (error) { recordError(name, 'scan', error); }
    }
    try {
      await scan('Tenant', ['id', 'user_id'], async rows => {
        const selected = rows.filter(row => tenantIds.has(row.id) && !protectedIds.has(row.user_id));
        if (!selected.length) return;
        try { await remove('Tenant', { id: { $in: selected.map(row => row.id) }, user_id: { $nin: [...protectedIds] } }); }
        catch (error) { recordError('Tenant', selected.map(row => row.id).join(','), error); }
      });
    } catch (error) { recordError('Tenant', 'scan', error); }
    const recipients = [...tenantUserIds].filter(id => id && !protectedIds.has(id));
    for (let offset = 0; offset < recipients.length; offset += 200) {
      try { await remove('Notification', { recipient_user_id: { $in: recipients.slice(offset, offset + 200) } }); }
      catch (error) { recordError('Notification', 'tenant recipients', error); }
    }
    // Reset only broken tenancy pointers. A tenancy whose deletion failed still
    // exists and must not accidentally release its unit.
    try {
      const remaining = new Set();
      await scan('Tenancy', ['id'], async rows => rows.forEach(row => remaining.add(row.id)));
      await scan('Unit', ['id', 'current_tenancy_id'], async rows => {
        for (const unit of rows) if (unit.current_tenancy_id && !remaining.has(unit.current_tenancy_id)) {
          try {
            await entities.Unit.update(unit.id, { status: 'Available', current_tenancy_id: '', current_tenant_name: '' });
            report.unitResets++;
          } catch (error) { recordError('Unit', unit.id, error); }
        }
      });
    } catch (error) { recordError('Unit', 'tenancy reconciliation', error); }
    for (const id of targets) {
      try {
        const current = await entities.User.get(id);
        if (protectedUser(current)) continue;
        await entities.User.delete(id);
        report.tenantUsersRemoved++;
      } catch (error) { recordError('User', id, error); }
    }
    report.tenantUsersKept = userCount - report.tenantUsersRemoved;
    const recordCount = Object.values(report.deletedRecords).reduce((total, count) => total + count, 0);
    try {
      await entities.AuditLog.create({ user_id: caller.id, user_email: caller.email, user_role: 'admin', action: 'Purged Tenant Data', entity: 'User', entity_id: '', entity_name: `${report.tenantUsersRemoved} tenant accounts + ${recordCount} records removed`, timestamp: new Date().toISOString() });
    } catch (error) { recordError('AuditLog', 'summary', error); }
    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message || 'Tenant cleanup failed' }, { status: 500 });
  }
}