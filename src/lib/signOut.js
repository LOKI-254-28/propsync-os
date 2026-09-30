import { base44 } from "@/api/base44Client";

// Fully ends the session: clears the token, and replaces (not pushes) the history entry so Back can't return to a signed-in page.
export async function signOut() {
  try { await base44.auth.logout(); } catch (e) {}
  localStorage.removeItem("base44_access_token");
  localStorage.removeItem("token");
  window.location.replace("/login");
}