// Test Profile sandbox mode — fully client-side, never touches real data.
// Approach (b): no User record, no entity writes. All data lives in localStorage.
// Two independent role stores (landlord, tenant) are managed by testStore.js.

import { initStore, clearAllTestStores } from '@/lib/testStore';

export { isTestMode } from '@/lib/testStore';

const TEST_PROFILE_KEY = 'propwiz_test_profile';
const TEST_APPS_KEY = 'propwiz_test_applications';
const TEST_NOTIFS_KEY = 'propwiz_test_notifications';

export function getTestProfile() {
  try {
    const stored = localStorage.getItem(TEST_PROFILE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function setTestProfile(data) {
  localStorage.setItem(TEST_PROFILE_KEY, JSON.stringify(data));
}

export function clearTestProfile() {
  localStorage.removeItem(TEST_PROFILE_KEY);
  localStorage.removeItem(TEST_APPS_KEY);
  localStorage.removeItem(TEST_NOTIFS_KEY);
  clearAllTestStores();
}

export function getTestApplications() {
  try {
    return JSON.parse(localStorage.getItem(TEST_APPS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getTestNotifications() {
  try {
    return JSON.parse(localStorage.getItem(TEST_NOTIFS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function startTestProfile() {
  // Initialize both role stores with fresh randomized data
  initStore('tenant');
  initStore('landlord');

  // Legacy keys for backward compat with guest pages on /guest routes
  const mockUser = {
    id: 'test-' + Date.now(),
    full_name: 'Test User',
    email: 'test@propwiz.app',
    account_type: 'guest',
    approval_status: 'approved',
    phone: '', address: '', city: '', region: '', postal_code: '', country: '', profile_image: '',
  };
  setTestProfile(mockUser);
  localStorage.setItem(TEST_APPS_KEY, JSON.stringify([]));
  localStorage.setItem(TEST_NOTIFS_KEY, JSON.stringify([
    { id: 'n1', title: 'Welcome to Test Profile', body: 'This is a demo mode — no data is saved to the real system.', created_date: new Date().toISOString() },
  ]));

  // Drop straight into the tenant experience by default
  window.location.href = '/test-profile';
}