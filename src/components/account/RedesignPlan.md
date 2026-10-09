# Unified Account Pages Experience

## Standing scope instruction
“Account pages” means all website pages landlords, administrators, and tenants interact with while signed in, including shared operational pages and standalone receipt and assigned-maintenance views. This instruction is recorded in this redesign plan, not as a change to the user's global instructions.

## Approved goal
Refresh the complete signed-in experience to feel cohesive with the public home page and make common tasks easier to find and complete. Deliver the refresh as one coordinated phase, with a reusable visual and interaction system for future account-page work.

## Design and implementation guidance
- Use the public home page's cool-grey and blue brand tokens, typography, spacing, rounded surfaces, and practical hierarchy. Keep operational information readable rather than decorative.
- Use the shared AccountShell for landlord, administrator, and tenant layouts. Use AccountSurface for standalone authenticated views and portal theming.
- Group existing destinations by user task. Retain existing URLs, labels, badges, account identity, sign-out, tenant prompts, and approval notices. Show one unambiguous active destination.
- Keep desktop navigation persistent; use a keyboard-accessible, focus-managed drawer on tablets and phones. Preserve reduced-motion support, focus visibility, and a skip link.
- Keep tables horizontally scrollable without hiding data; keep primary actions and section headers responsive.
- Do not modify business flows, data operations, authentication, authorization, role permissions, integrations, or status meanings as part of visual work.
- Apply shared presentation through account-scoped styles and existing shared page components, avoiding copies of every page or new feature-specific business logic.

## Implementation coverage
All existing landlord, admin, and tenant route families use the shared shell. Dashboard metrics, page headers, section cards, empty states, tables, controls, tabs, and dialog presentation share account styling. Standalone receipts and assigned work share account tokens. Public marketing pages and authentication flows retain their existing presentation and behavior.

## Validation
Run a production build and targeted static checks. Functional journey QA is a separate Testing Agent run: landlord portfolio navigation; admin oversight and user management; tenant rent, tenancy, applications, maintenance, documents, notices, feedback, and profile. Do not claim these journeys were exercised from static checks alone.