# PropWiz — Implementation Prompt: Public Surface & Onboarding Pipeline (Refined)

## Context

Rentals-only platform. Sale/Lease removed. Entities: `Property`, `Unit`, `Listing` (Rent only), `Application`, `Tenancy`, `Tenant`, `Payment`, `RentCharge`, `Maintenance`, `Inspection`, `Notice`, `Document`, `Expense`, `Contractor`, `Feedback`, `VacationRequest`, `Notification`, `Settings`, `AuditLog`, `StaffPermission`, `User`.

**Current state:** `/` is the authenticated landlord dashboard; unauthenticated visitors bounce to `/login`. Tenant browsing/applications live behind `/portal/*`. Landlord `Applications.jsx` has the full workflow (Submitted → … → Payment Verified → Completed). Tenant `MyApplications` does not yet expose matching actions.

**Auth constraint (decided):** Unauthenticated visitors cannot write entities (no token). So "Apply" / "Enquire" CTAs are auth-gated: logged-in tenants create an `Application` directly; logged-out visitors are redirected to `/register` with listing/unit context, and the application is auto-created on registration.

**Four onboarding paths:**
1. New applicant tenant — applies from a public listing; landlord decides on agreement.
2. Invited existing tenant — landlord-sent invite link for a unit; skips application; lands on pre-approved path.
3. Landlord registration — self-register landowner; pending until admin approval.
4. Admin — platform oversight (exists).

---

## Phase 1 — Public Landing & Public Listings

**Routes (public, no auth):** `/` → `PublicHome`; `/listings` → `PublicListings`; `/listings/:id` → `PublicListingDetail`.
**Route moves (to avoid conflicts):** landlord dashboard `/` → `/dashboard`; landlord listing management `/listings` → `/my-listings` (update `LANDLORD_NAV`, `ADMIN_NAV`, `LandlordRoutes`, `AdminRoutes`). `PublicHome` redirects authenticated users to their role home (`/dashboard` | `/portal` | `/admin` | `/guest`).

- **PublicHome:** hero + search (location, type, max price → `/listings?…`), featured published listings, how-it-works, CTA to `/register`.
- **PublicListings:** reuse filter logic from `BrowseListings.jsx` but fetch `Listing`/`Property`/`Unit` directly (RLS public reads). Filter to `status === "Published"`. Separate "Coming soon" section: `Unit` with `status === "Available"` and no published listing.
- **PublicListingDetail:** images, description, unit specs, address, rent/deposit/service charge. CTA "Apply Now": authenticated tenant → create `Application` (status `Submitted`) → redirect `/portal/applications`; unauthenticated → `/register?returnTo=/listings/:id&listing=<id>&unit=<unitId>`.

**RLS:** `Listing` read public when `Published`; `Unit` read public when `Available`; `Property` read public when `Active`. No schema changes.

---

## Phase 2 — Tenant Self-Registration from Listings

Extend `Register.jsx`:
- Read `listing` / `unit` query params on load.
- For client registrations with a listing context: after OTP + `updateMe`, create the `Application` linked to `listing_id` + `unit_id` from the params (not the manual property picker), stamp `owner_user_id` from the listing, `status: "Submitted"`.
- Keep existing invite-code path (resolves `Unit` by `invite_code`).
- Redirect client → `/portal`; landowner → `/dashboard`.

---

## Phase 3 — Property & Unit Creation Wizard with Map

- Steps: property basics → map location (react-leaflet, drop pin) → units (one or more) → review & publish.
- Add `latitude` / `longitude` (number) to `Property`.
- On submit: create `Property` (owner-stamped), `bulkCreate` `Unit`s (inherit owner), optionally create a `Listing` per unit (`Draft`/`Published`).
- Replace/augment `Properties.jsx` create flow; show pin on `PropertyDetail`.

---

## Phase 4 — Invite-Based Onboarding for Existing Tenants

- Landlord invites tenant for a unit (Occupied or Available): enters name/email, optional rent/deposit/start.
- Backend `generateInvite`: validate ownership, generate short unique `invite_code` on `Unit`, return invite link `https://<domain>/register?invite=<code>`. Landlord copies link or emails via `SendEmail` (non-registered recipients need paid plan + custom domain — surface in UI).
- Backend `redeemInvite`: resolve code → `Unit`, validate caller email matches invited email, create `Tenant` + `Tenancy` directly (skip application) for already-occupied units; for Available units with deposit pending, create a pre-approved `Application` jumping to `Agreement Issued`/`Payment Requested`. Rotate/clear code after redemption.

---

## Phase 5 — Tenant-Side Application Pipeline

Mirror landlord workflow in `MyApplications.jsx` with status-appropriate tenant actions:

| Status | Tenant action |
|---|---|
| Submitted / Under Review | Wait; show landlord response |
| More Information Required | Provide info + upload docs → "Information Provided" |
| Site Visit Requested | View proposed date; confirm / request reschedule |
| Site Visit Scheduled | View date; cancel/reschedule |
| Agreement Issued | Download agreement; upload executed copy → "Agreement Executed" |
| Payment Requested | View amount/due/method/instructions; upload payment proof → "Payment Proof Submitted" |
| Payment Verified | Wait |
| Completed | Link to `/portal/tenancy` |
| Rejected | Show landlord response |

Reuse `FileUploadButton`; notify landlord on each action; respect Application update RLS (tenant can update own).

---

## Phase 6 — File Upload/Download Infrastructure

- Upload: `FileUploadButton` → `UploadPrivateFile` → `file_uri` (keep).
- Download: add `downloadFile(file_uri)` helper → `CreateFileSignedUrl` → open signed URL. Replace raw `<a href={file_url}>` patterns in `Applications.jsx`, `Documents.jsx`, `MyDocuments.jsx`, maintenance/inspection viewers.

---

## Cross-Cutting

- **Routing:** public routes outside `ProtectedRoute`; `/portal/*` stays protected; `PublicHome` redirects authed users to role home.
- **Notifications:** every status transition (both sides) creates a `Notification` for the other party via `notify`.
- **Audit:** every workflow action logs via `logAudit`.
- **Design:** emerald/gold premium aesthetic; `ui-bits` components; `Image` from `@/components/ui/image` for content images.
- **Responsive:** mobile + desktop.
- **Dates:** display in `Africa/Nairobi`.

## Build Order

1. Phase 1 (public home + listings) — public surface.
2. Phase 2 (registration from listings) — wires public → application pipeline.
3. Phase 5 (tenant-side application actions) — end-to-end workflow.
4. Phase 6 (file infra) — secure document handling.
5. Phase 3 (property/unit wizard + map).
6. Phase 4 (invite onboarding) — depends on solid pipeline.