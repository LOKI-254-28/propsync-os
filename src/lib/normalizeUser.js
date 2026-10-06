// Normalizes the user object returned by base44.auth.me().
// SDK versions differ on whether custom user fields (account_type, approval_status)
// are returned at the top level or nested under `data`.
// This flattens them so the rest of the app can always read them directly.
export function normalizeUser(rawUser) {
  if (!rawUser) return rawUser;
  return {
    ...rawUser,
    account_type: rawUser.role === 'admin' ? 'admin' : (rawUser.account_type || rawUser.data?.account_type) === 'admin' ? 'client' : rawUser.account_type || rawUser.data?.account_type,
    approval_status: rawUser.approval_status || rawUser.data?.approval_status,
  };
}