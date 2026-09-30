import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { DARAJA_BASE, getDarajaConfig, getDarajaToken, stkCredentials } from '../../shared/daraja.ts';

function normalizePhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  const p = d.startsWith('254') ? d : d.startsWith('0') ? '254' + d.slice(1) : '254' + d;
  return /^254[17]\d{8}$/.test(p) ? p : null;
}

// Sends an M-Pesa STK push (PIN prompt) to the tenant's phone for their application's payment.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { application_id, phone } = await req.json();
    const app = await base44.asServiceRole.entities.Application.get(application_id).catch(() => null);
    if (!app || app.tenant_user_id !== user.id) return Response.json({ error: 'Application not found' }, { status: 404 });
    if (app.status !== 'Payment Requested') return Response.json({ error: 'This application is not awaiting payment.' }, { status: 409 });

    const msisdn = normalizePhone(phone);
    if (!msisdn) return Response.json({ error: 'Enter a valid Safaricom number, e.g. 0712345678.' }, { status: 400 });

    const cfg = getDarajaConfig();
    if (!cfg) {
      return Response.json({ unavailable: true, message: 'Instant M-Pesa prompt is not available yet. Please use the manual paybill or bank option.' });
    }

    const token = await getDarajaToken(cfg);
    const { timestamp, password } = stkCredentials(cfg);
    const res = await fetch(`${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: cfg.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.max(1, Math.round(Number(app.payment_amount || 0))),
        PartyA: msisdn,
        PartyB: cfg.paybill,
        PhoneNumber: msisdn,
        CallBackURL: 'https://propwiz.base44.app/functions/verifyMpesaPayment',
        AccountReference: String(app.application_reference || 'PropWiz').slice(0, 12),
        TransactionDesc: 'Deposit and rent',
      }),
    });
    const out = await res.json();
    if (out.ResponseCode !== '0') {
      return Response.json({ error: out.errorMessage || out.ResponseDescription || 'M-Pesa could not send the prompt.' }, { status: 502 });
    }

    await base44.asServiceRole.entities.Application.update(app.id, {
      mpesa_checkout_id: out.CheckoutRequestID,
      payment_method: 'M-Pesa',
      payment_status: 'Requested',
    });
    return Response.json({ ok: true, message: 'Prompt sent. Enter your M-Pesa PIN on your phone.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}