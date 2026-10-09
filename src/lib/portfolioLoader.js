import {loadDocuments} from '@/lib/documentList';
import {loadTenantDirectory} from '@/lib/tenantAccess';
import loadAllRecords from '@/lib/loadAllRecords';
import reconcileInitialRent from '@/lib/reconcileInitialRent';
import {occupancySummary} from '@/lib/occupancy';
import portfolioRequest from '@/lib/portfolioRequest';

export const emptyPortfolio = Object.fromEntries(['properties','units','tenants','tenancies','charges','payments','applications','maintenance','inspections','notices','expenses','contractors','feedback','vacationRequests','notifications','documents','listings'].map(key => [key, []]));

export default async function portfolioLoader(user, excludeFinancial) {
  const isAdmin = user.role === 'admin';
  const scope = isAdmin ? {} : {owner_user_id: user.id};
  const owned = (entity, sort) => loadAllRecords(entity, scope, sort, portfolioRequest);
  const [properties, units, tenants, tenancies, charges, payments, applications, maintenance, inspections, notices, expenses, contractors, feedback, vacationRequests, documents, listings] = await Promise.all([
    owned('Property', '-created_date'), owned('Unit', '-created_date'),
    isAdmin || user.account_type === 'landowner' ? loadTenantDirectory(portfolioRequest) : Promise.resolve([]),
    owned('Tenancy', '-created_date'),
    excludeFinancial ? Promise.resolve([]) : owned('RentCharge', '-due_date'),
    excludeFinancial ? Promise.resolve([]) : owned('Payment', '-payment_date'),
    excludeFinancial ? Promise.resolve([]) : owned('Application', '-created_date'),
    owned('Maintenance', '-created_date'), owned('Inspection', '-created_date'), owned('Notice', '-created_date'),
    owned('Expense', '-created_date'), owned('Contractor', '-created_date'), owned('Feedback', '-created_date'),
    owned('VacationRequest', '-created_date'), loadDocuments(portfolioRequest), owned('Listing', '-created_date'),
  ]);
  // Lightweight financial screens must not trigger reconciliation or a second ledger scan.
  const reconciled = !excludeFinancial && await reconcileInitialRent(tenancies, portfolioRequest);
  return {...emptyPortfolio, properties, units: occupancySummary(units, tenancies).units, tenants, tenancies,
    charges: reconciled ? await owned('RentCharge', '-due_date') : charges,
    payments, applications, maintenance, inspections, notices, expenses, contractors, feedback, vacationRequests, documents, listings};
}