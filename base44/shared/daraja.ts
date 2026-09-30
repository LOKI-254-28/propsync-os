import { secrets } from 'base44:runtime';

export const DARAJA_BASE = 'https://api.safaricom.co.ke';

function safeGet(name) {
  try { return secrets.get(name) || ''; } catch (e) { return ''; }
}

// Returns null when any Daraja credential has not been provided yet.
export function getDarajaConfig() {
  const cfg = {
    key: safeGet('DARAJA_CONSUMER_KEY'),
    secret: safeGet('DARAJA_CONSUMER_SECRET'),
    passkey: safeGet('DARAJA_PASSKEY'),
    shortcode: safeGet('DARAJA_SHORTCODE'),
    paybill: safeGet('MPESA_PAYBILL'),
  };
  if (!cfg.key || !cfg.secret || !cfg.passkey || !cfg.shortcode) return null;
  if (!cfg.paybill) cfg.paybill = cfg.shortcode;
  return cfg;
}

export async function getDarajaToken(cfg) {
  const res = await fetch(`${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: 'Basic ' + btoa(`${cfg.key}:${cfg.secret}`) },
  });
  if (!res.ok) throw new Error('Could not authenticate with M-Pesa');
  return (await res.json()).access_token;
}

export function stkCredentials(cfg) {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const password = btoa(`${cfg.shortcode}${cfg.passkey}${timestamp}`);
  return { timestamp, password };
}