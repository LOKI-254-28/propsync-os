// Mock data store for Test Profile mode.
// Two independent stores (landlord, tenant) persisted in localStorage.
// The base44 proxy reads/writes these instead of the real API when in test mode.

import { generateSeed } from '@/lib/testSeed';

const LANDLORD_KEY = 'propwiz_test_landlord';
const TENANT_KEY = 'propwiz_test_tenant';

let currentRole = 'tenant';

export function isTestMode() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/test-profile');
}

export function setTestRole(role) { currentRole = role; }
export function getTestRole() { return currentRole; }

function storeKey(role = currentRole) {
  return role === 'landlord' ? LANDLORD_KEY : TENANT_KEY;
}

export function getStore(role = currentRole) {
  try {
    const stored = localStorage.getItem(storeKey(role));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function setStore(data, role = currentRole) {
  localStorage.setItem(storeKey(role), JSON.stringify(data));
}

export function initStore(role) {
  localStorage.setItem(storeKey(role), JSON.stringify(generateSeed(role)));
}

export function hasStore(role) {
  return !!localStorage.getItem(storeKey(role));
}

export function clearAllTestStores() {
  localStorage.removeItem(LANDLORD_KEY);
  localStorage.removeItem(TENANT_KEY);
}