import { base44 } from "@/api/base44Client";

// Secure create for provider-owned entities (Property, Unit, Listing, etc.).
// Routes through the createOwnedRecord backend function which:
//  - verifies the user is an approved landowner (or admin)
//  - validates parent-entity ownership for child records
//  - stamps owner_user_id from the authenticated user (never from the client)
// Returns the created record, or throws with a human-readable error.
export async function secureCreate(entity, data) {
  try {
    const response = await base44.functions.invoke("createOwnedRecord", { entity, data });
    return response.data.record;
  } catch (e) {
    const msg = e.data?.error || e.response?.data?.error || e.message || "Could not create record. Please try again.";
    throw new Error(msg);
  }
}

// Bulk-create units with server-stamped owner_user_id + invite codes.
// Fixes the units-not-viewable bug (owner stamping) and auto-numbers server-side trust.
export async function secureBulkCreateUnits(records) {
  try {
    const response = await base44.functions.invoke("createOwnedRecord", { entity: "Unit", bulk: true, records });
    return response.data.records;
  } catch (e) {
    const msg = e.data?.error || e.response?.data?.error || e.message || "Could not create units. Please try again.";
    throw new Error(msg);
  }
}