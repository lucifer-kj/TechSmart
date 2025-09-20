## Client Portal – Total Replacement Strategy (Context-Aware Plan)

### Purpose
Replace the current password-based customer access model with an invitation-first, passwordless-capable architecture while keeping the same tech stack (Next.js, Supabase, ServiceM8). This document is split into context-aware chunks. Implement one section at a time and verify acceptance criteria before moving on.

### How to Use This Document
- Each section is prefixed with a Context Awareness marker: [Context Awareness: XX - Title]
- Complete sections in order unless stated otherwise.
- At the end of each section: Deliverables, Acceptance Criteria, and Out-of-Scope are listed to bound the work.

---

### [Context Awareness: 00 - Execution Protocol]
- Scope
  - Define implementation cadence and guardrails for chunk-by-chunk execution.
- Protocol
  - Work strictly one section at a time; do not parallelize across sections unless explicitly called out.
  - After finishing a section, run lints and minimal smoke tests for the affected code.
  - Update docs and deprecation notes as you go.
  - Maintain backward compatibility behind feature flags until Section 09 rolls the switch.
- Deliverables
  - Agreed sequence, feature flags registered, minimal smoke-test checklist per section.
- Acceptance Criteria
  - Feature flag scaffolding present and togglable.
  - Section-by-section checklists added to repo docs.
- Out-of-Scope
  - Full E2E tests (covered in Section 13).

---

### [Context Awareness: 01 - Database & RLS]
- Goals
  - Introduce invitation and access-grant models.
  - Shift RLS to derive tenant via `user_profiles` joined by `auth.uid()`.
- Changes
  - New tables (admin-only RLS):
    - `portal_invitations(id, customer_id, email, token_hash, status, expires_at, accepted_at, revoked_at, created_by, created_at, updated_at)`
    - `portal_access_grants(id, customer_id, user_id, status, created_at, updated_at)` with unique (customer_id, user_id)
  - `user_profiles` adjustments:
    - Ensure fields: `id (auth.user id)`, `customer_id`, `email`, `full_name`, `role`, `is_active`, `created_at`, `updated_at`.
    - Optional new fields: `status` (mirror of is_active), `banned_reason`, `last_invited_at`.
  - Replace `request_customer_id()` to read from `user_profiles` where `id = auth.uid()` and `is_active = true`.
  - Update RLS policies for `customers`, `jobs`, `documents`, `payments`, `audit_logs` to use `customer_id = request_customer_id()`.
- Deliverables
  - SQL migrations for new tables and updated policies.
  - Backwards-compatible view or function updates if needed.
- Acceptance Criteria
  - Queries for customer resources filter correctly per `auth.uid()` via `user_profiles` mapping.
  - Admin can select across tenants; customers cannot.
- Out-of-Scope
  - Data backfill (Section 08).

---

### [Context Awareness: 02 - Auth & Identity (Passwordless + Invitations)]
- Goals
  - Default customer auth to magic link/OTP; no plaintext passwords.
  - Implement invitation acceptance and JIT provisioning.
- Flows
  - Invitation Accept: verifies token → finds/creates `auth.users` by email → upserts `user_profiles` → creates `portal_access_grants(active)` → invalidates invite.
  - Magic-link Login: customers use email OTP; first successful sign-in with a pending invite triggers JIT provisioning.
- Endpoints
  - `POST /api/auth/invitations/accept` { token }
  - Leverage Supabase built-in OTP for magic-link; no custom password endpoints.
- Deliverables
  - Accept endpoint with token hashing (argon2/bcrypt) and expiry enforcement.
  - JIT provisioning hook on sign-in callback or accept endpoint.
- Acceptance Criteria
  - No endpoints return or log plaintext passwords.
  - Invitation acceptance creates active access without manual admin steps.
- Out-of-Scope
  - Email templates (defined in Section 10 Observability/Notifications).

---

### [Context Awareness: 03 - Admin API (Invitations, Linking, Access Lifecycle)]
- Goals
  - Replace ad-hoc user creation with explicit invitations and linking.
- Endpoints
  - `POST /api/admin/customers/[customerId]/invitations` → create invite (idempotent: pending invite per email/customer).
  - `GET /api/admin/customers/[customerId]/invitations` → list invites.
  - `POST /api/admin/invitations/[invitationId]/resend`
  - `POST /api/admin/invitations/[invitationId]/revoke`
  - `POST /api/admin/customers/[customerId]/link-user` { email } → link existing `auth.users` to `customer_id` and activate.
  - `POST /api/admin/customers/[customerId]/suspend` / `restore` → update `user_profiles.is_active` and `portal_access_grants.status`, revoke sessions.
- Deliverables
  - Server routes with admin authorization checks via `user_profiles.role`.
  - Audit logs for every action.
- Acceptance Criteria
  - All admin actions are idempotent and audited.
  - Session revocation occurs on suspend.
- Out-of-Scope
  - Admin UI (Section 05).

---

### [Context Awareness: 04 - Customer Portal API (Compatibility on New RLS)]
- Goals
  - Keep existing features (jobs, quotes, feedback, documents, payments) but ensure they rely on the new RLS derivation.
- Tasks
  - Validate `app/api/customer-portal/*` routes function with `request_customer_id()` from `user_profiles`.
  - Ensure idempotency keys are used with ServiceM8 write operations where applicable.
- Deliverables
  - Minimal edits to use new auth mapping and remove assumptions about JWT customer_id claims.
- Acceptance Criteria
  - No regression in portal capabilities.
- Out-of-Scope
  - New features (none).

---

### [Context Awareness: 05 - Admin UI]
- Goals
  - Add invitation management and access lifecycle controls.
- Components/Pages
  - Extend `app/admin/customers/page.tsx` and `components/admin/customer-list-table.tsx` with actions: Invite, Resend, Revoke, Suspend/Restore, Link User.
  - `components/admin/invitation-management.tsx`: list and controls per customer.
- Hooks
  - `useInvitations(customerId)`, `useAccessState(customerId)`, `useCustomerLinking()`.
- Deliverables
  - UI with optimistic updates and error toasts.
- Acceptance Criteria
  - Admin can invite, manage invites, and toggle access without seeing or setting passwords.
- Out-of-Scope
  - Styling overhaul; keep to existing design system.

---

### [Context Awareness: 06 - Customer UI]
- Goals
  - Passwordless-first login and invite acceptance.
- Pages
  - Update `app/(auth)/login/page.tsx`: Admin tab (email+password), Customer tab (magic link).
  - New `app/(auth)/invite/accept/page.tsx` to handle token acceptance.
- Deliverables
  - Functional flows with clear UX states (sent, error, expired).
- Acceptance Criteria
  - Customer can onboard from invite to active without admin manual steps.
- Out-of-Scope
  - Account recovery beyond OTP (handled by Supabase standard flows).

---

### [Context Awareness: 07 - ServiceM8 Integration]
- Goals
  - Keep current sync behavior; ensure writes are resilient with idempotency.
- Tasks
  - Verify `lib/servicem8` uses idempotency keys on quote approvals, notes, and client creation.
  - Optional: move writes to background jobs (Edge Functions/cron) after MVP.
- Deliverables
  - Confirmed idempotency and error handling.
- Acceptance Criteria
  - No duplicate updates on retries; failures do not block core UX.
- Out-of-Scope
  - Background queue (can be phased later).

---

### [Context Awareness: 08 - Data Backfill & Migration]
- Goals
  - Migrate existing customers to the new access model.
- Steps
  - For each active `user_profiles` entry: create `portal_access_grants(active)` if missing.
  - For banned/suspended: set `portal_access_grants.status` accordingly.
  - Generate pending invites for customers with no linked `auth.users` and known email (optional).
- Deliverables
  - One-off SQL or script to backfill.
- Acceptance Criteria
  - Parity of access before and after cutover; no orphaned links.
- Out-of-Scope
  - Email notifications (see Section 10).

---

### [Context Awareness: 09 - Rollout & Feature Flags]
- Goals
  - Safe cutover with the ability to rollback.
- Flags
  - `features.invitations.enabled`
  - `features.passwordless.customer_login`
  - `features.admin.link_existing_user`
- Steps
  - Ship behind flags → migrate → enable for internal → enable for production groups → remove legacy code.
- Deliverables
  - Flag checks around routes and UI; documented switch procedure.
- Acceptance Criteria
  - Toggle produces predictable behavior with no broken paths.
- Out-of-Scope
  - Long-lived dual-mode beyond migration window.

---

### [Context Awareness: 10 - Observability, Notifications, Security]
- Goals
  - Strong audit trail, email events, and security posture.
- Tasks
  - Audit logs on invitation create/resend/revoke, accept, link, suspend/restore.
  - Email events (send, delivered, bounced) tracked in `audit_logs` or `email_events` table.
  - Token storage: `token_hash` only; short expiries; single-use.
  - Revoke Supabase sessions on suspend/ban.
- Deliverables
  - Logging utilities and minimal dashboards/queries.
- Acceptance Criteria
  - Every admin action is auditable; tokens never stored in plaintext.
- Out-of-Scope
  - Full SIEM integration.

---

### [Context Awareness: 11 - Deprecations & Removals]
- Replace password-based customer creation flows:
  - Remove returning `tempPassword` from admin endpoints.
  - Deprecate or rewrite:
    - `POST /api/admin/customers` → no plaintext passwords; returns invitation hints if requested.
    - `PUT/POST /api/admin/customers/[customerId]/portal-access` → split into invitation + suspend/restore APIs.
- Deliverables
  - Deprecation notices in code comments and docs; guard with feature flags during transition.
- Acceptance Criteria
  - No server responses leak passwords; legacy endpoints either disabled or return 410/redirect with migration hints when flag is on.

---

### [Context Awareness: 12 - Testing & QA]
- Goals
  - High confidence in auth and data isolation.
- Tests
  - Unit: token hashing/verification, invitation lifecycles, RLS helper function.
  - Integration: invite → accept → login → resource access; suspend → session revoke; link existing user.
  - RLS: authenticated customer cannot access other tenants’ rows.
- Deliverables
  - Test plan + minimum test suite.
- Acceptance Criteria
  - Green tests for core flows; manual smoke tests documented.

---

### [Context Awareness: 13 - Timeline & Phasing]
- Phase 1: Section 01–03 (DB, Auth accept, Admin API)
- Phase 2: Section 05–06 (Admin/Customer UI)
- Phase 3: Section 04 & 07 (Portal API adjustments, SM8 confirmation)
- Phase 4: Section 08–09 (Backfill, Flags cutover)
- Phase 5: Section 10–12 (Obs/Sec, Deprecations, Testing)

---

### [Context Awareness: 14 - Old → New Mapping]
- Old
  - Admin creates customer and returns temp password.
  - Single endpoint toggles portal access ad-hoc.
- New
  - Admin invites by email; customer completes via magic link; JIT provisioning.
  - Access lifecycle managed via explicit endpoints and grants; sessions revoked on suspend.

---

### Appendix: Implementation Hints
- Use Supabase Admin API only on server routes with Service Role.
- Use `argon2id` for token hashing; store only `token_hash`, never raw tokens.
- Prefer idempotency keys on all ServiceM8 mutations.
- Keep migrations reversible; include `DROP POLICY IF EXISTS` before re-creating.


