import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { DARAJA_BASE, getDarajaConfig, getDarajaToken, stkCredentials } from '../../shared/daraja.ts';

const ACK = { ResultCode: 0, ResultDesc: 'Accepted' };

// Daraja callback. Never trusts the posted body alone: confirms the result with Daraja's STK query first.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json();
    const cb = body?.Body?.stkCallback;
    if (!cb?.CheckoutRequestID) return Response.json(ACK);

    const cfg = getDarajaConfig();
    if (!cfg) return Response.json(ACK);

    const app = (await sr.entities.Application.filter({ mpesa_checkout_id: cb.CheckoutRequestID }))[0];
    if (!app || app.status !== 'Payment Requested') return Response.json(ACK);

    const token = await getDarajaToken(cfg);
    const { timestamp, password } = stkCredentials(cfg);
    const q = await fetch(`${DARAJA_BASE}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ BusinessShortCode: cfg.shortcode, Password: password, Timestamp: timestamp, CheckoutRequestID: cb.CheckoutRequestID }),
    });
    const result = await q.json();
    if (String(result.ResultCode) !== '0') return Response.json(ACK);

    const items = cb.CallbackMetadata?.Item || [];
    const pick = (n) => items.find((i) => i.Name === n)?.Value;
    const receipt = String(pick('MpesaReceiptNumber') || '');
    const paid = Number(pick('Amount') || 0);
    const full = paid >= Number(app.payment_amount || 0);

    await sr.entities.Application.update(app.id, {
      payment_method: 'M-Pesa',
      payment_reference: receipt,
      payment_status: full ? 'Verified' : 'Proof Submitted',
      status: full ? 'Payment Verified' : 'Payment Proof Submitted',
    });

    const msg = full ? `M-Pesa payment ${receipt} received for ${app.unit_number}.` : `M-Pesa payment ${receipt} is less than the amount due for ${app.unit_number}. Please review.`;
    for (const uid of [app.owner_user_id, app.tenant_user_id].filter(Boolean)) {
      await sr.entities.Notification.create({
        recipient_user_id: uid, type: 'Payment', title: full ? 'Payment received' : 'Payment needs review', message: msg,
        related_entity: 'Application', related_id: app.id,
        action_link: uid === app.tenant_user_id ? '/portal/applications' : '/applications',
        date: new Date().toISOString(), read: false,
      });
    }
    return Response.json(ACK);
  } catch (error) {
    return Response.json(ACK);
  }
}