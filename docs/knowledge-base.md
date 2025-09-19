## ServiceM8 + Supabase Client Portal — Engineering Knowledge Base

This document defines the development context and implementation plan for core portal functionality that integrates Supabase and ServiceM8. It focuses on frontend integration, backend API design, data flow, and architecture decisions. Webhooks and emails are explicitly out of scope here and handled elsewhere.

### Scope

- Admin and Customer Portal features required for day-to-day operations
- API surfaces and service layers to support the UI
- Data ownership, flow, and synchronization contracts
- Security, RBAC/RLS, auditing, and observability choices
- Realtime update pathways via Supabase Realtime
- Explicitly excludes: webhook handling and email delivery/templating

---

## 1. High-Level Architecture

- **Next.js (App Router)** hosts UI pages under `app/` and server routes under `app/api/`.
- **Supabase** is the system of record for portal state, auth, RBAC, and realtime.
- **ServiceM8** is the field ops system. We mirror a minimal subset of entities in Supabase for fast UI and offline-resilient UX. ServiceM8 remains the authoritative source for job lifecycle, invoices, and documents.
- **Integration Layer** lives in `lib/servicem8.ts`, `lib/sync-service.ts`, and route handlers under `app/api/servicem8/*` and domain-specific API routes. This layer mediates reads/writes, validation, and error translation.
- **Realtime** uses Supabase Realtime to push UI updates. Server code updates Supabase tables; changes are streamed to subscribed clients via `hooks/useRealtime.ts`.
- **Auditing/Observability** use existing libraries in `lib/audit-logging.ts`, `lib/api-logging.ts`, `lib/document-monitoring.ts`. These are called from API routes and services.

Key Principle: Supabase-first UX with opportunistic sync from ServiceM8. Reads prefer Supabase caches; writes record intent in Supabase then call ServiceM8. Conflicts are resolved by last-write-wins with traceable audit logs.

---

## 2. Core Domains and Data Ownership

- **Customers**: Primary record exists in Supabase (`customers` table). We persist `client_uuid` to link with ServiceM8 clients.
- **Jobs**: Indexed in Supabase (`jobs` table) for portal display and realtime; detailed source of truth in ServiceM8.
- **Quotes**: Portal stores quote rows/approvals in Supabase (`quotes` table), and updates status in ServiceM8 via integration.
- **Documents**: Supabase stores metadata/links in `documents` for portal listing; binary storage and canonical attachments in ServiceM8.
- **Payments**: Supabase stores references/status in `payments`; canonical payment settlement in ServiceM8.
- **Feedback**: Text-only feedback stored in Supabase `feedback` table; optionally mirrored as notes in ServiceM8 via integration.
- **Bans/Access Control**: Status and auth state are managed in Supabase (Auth + `customers.status`).

Note: Table creation and RLS are maintained in `supabase/migrations/`. API code must respect those constraints.

---

## 3. Tech Stack & Libraries

- **Next.js 14+ App Router**, React, TypeScript
- **Supabase JS** client in `lib/supabase/` and auth utilities in `lib/auth/*`
- **ServiceM8 API** integration via `lib/servicem8.ts` and `app/api/servicem8/*`
- **Input validation/sanitization** via `lib/servicem8-validation.ts` and `lib/input-sanitization.ts`
- **Logging & Audit**: `lib/api-logging.ts`, `lib/audit-logging.ts`, `lib/document-monitoring.ts`
- **Realtime** hooks: `hooks/useRealtime.ts`

Conventions:

- Always validate and sanitize incoming data.
- Wrap all ServiceM8 calls in a thin service that normalizes errors.
- Log external calls and important state transitions.
- Prefer explicit, typed request/response DTOs.

---

## 4. Backend API Surface (excluding webhooks and emails)

The app exposes Next.js route handlers under `app/api/*`. These are the only endpoints the frontend should call.

### 4.1 Admin — Customers

Routes in `app/api/admin/customers/*` (already scaffolded in repo) should provide:

- POST `/api/admin/customers` — Create a new customer in Supabase and (optionally) sync to ServiceM8 client.
  - Request: `{ name, email, phone, address, ... }`
  - Response: `{ customerId, client_uuid? }`
  - Side effects: create Supabase customer row; call ServiceM8 client create if not linking an existing one; persist `client_uuid`.

- POST `/api/admin/customers/link` — Link an existing ServiceM8 client to a Supabase customer record.
  - Request: `{ client_uuid, email?, name? }`
  - Response: `{ customerId, client_uuid }`

- PATCH `/api/admin/customers/{customerId}` — Update Supabase customer profile; propagate necessary fields to ServiceM8.
- POST `/api/admin/customers/{customerId}/ban` — Ban customer: set `status = banned` and disable login.
- POST `/api/admin/customers/{customerId}/unban` — Reverse of ban.

Authorization: Admin roles only, enforced in `lib/auth/server.ts` and RLS where applicable.

### 4.2 Admin — Jobs/Documents/Payments Indexing

Provide list endpoints for admin dashboards to query cached Supabase state while allowing on-demand refresh from ServiceM8:

- GET `/api/admin/jobs?customerId=...` → reads Supabase `jobs`, optional `?refresh=true` to trigger sync pull from ServiceM8.
- GET `/api/admin/documents?jobId=...` → reads `documents`.
- GET `/api/admin/payments?customerId=...` → reads `payments`.

### 4.3 Customer Portal

Routes in `app/api/customer-portal/*` should provide:

- GET `/api/customer-portal/jobs` — Job list for the authenticated customer.
  - Reads from Supabase `jobs` filtered by `client_uuid` or `customerId` derived from the session.
  - Optional `?refresh=true` to trigger background sync from ServiceM8 and return latest cached snapshot.

- GET `/api/customer-portal/jobs/{jobId}` — Detailed job view; returns Supabase snapshot with selected fields from ServiceM8 when available.

- POST `/api/customer-portal/quotes/{quoteId}/approve` — Record quote approval in Supabase. A separate background process updates ServiceM8.

- POST `/api/customer-portal/feedback` — Create a text-only feedback row in Supabase.

- GET `/api/customer-portal/documents?jobId=...` — List document metadata/links from Supabase; direct downloads happen from canonical source.

- GET `/api/customer-portal/payments` — List payment references from Supabase.

All customer routes must authorize via Supabase Auth and enforce RLS-compatible filters. Avoid leaking cross-tenant data by always applying `customerId`/`client_uuid` scoping derived from the authenticated session.

---

## 5. Service Layer Responsibilities

Implement thin, testable services in `lib/` that APIs call. This keeps route handlers minimal and enforces consistency.

- `lib/servicem8.ts` — Low-level HTTP client and helpers to call ServiceM8 endpoints; responsible for auth headers, retries, and error normalization.
- `lib/sync-service.ts` — Orchestrates read-through caching and write propagation:
  - For reads: If `refresh=true`, fetch from ServiceM8, upsert normalized rows into Supabase, and return the updated Supabase snapshot.
  - For writes: Persist intent in Supabase first, then call ServiceM8. Persist both the request and response for auditability.
- `lib/customer-portal-api.ts` — Convenience facades for job list/detail, documents, quotes, and payments as used by the portal pages/components.
- `lib/access-revocation.ts` and `lib/admin-override.ts` — Centralized access control helper operations for ban/unban/override flows.
- Validation helpers: `lib/servicem8-validation.ts`, `lib/input-sanitization.ts` are applied at the service entry points.

All services must log via `lib/api-logging.ts` and, for sensitive actions, `lib/audit-logging.ts`.

---

## 6. Frontend Composition

Pages under `app/` rely on typed client utilities and API routes. Key components already exist and should consume the APIs above:

- Admin
  - `app/admin/customers/new/page.tsx` + `components/admin/customer-creation-form.tsx` — POST `/api/admin/customers` and optionally `/link`.
  - `app/admin/customers/[customerId]/page.tsx` + `components/admin/customer-details-view.tsx` — GET/PATCH customer; ban/unban actions.
  - `app/admin/jobs/page.tsx` + `components/job-card.tsx` — GET jobs; opt-in refresh.
  - `app/admin/documents/page.tsx` — GET documents.
  - `app/admin/dashboard/page.tsx` — Aggregates list endpoints.

- Customer Portal
  - `app/jobs/page.tsx` and `app/jobs/[jobId]/page.tsx` — GET lists/details from `/api/customer-portal/jobs*`.
  - `components/quote-approval-form.tsx` — POST quote approval.
  - `components/customer-feedback.tsx` — POST feedback.
  - `components/document-viewer.tsx` / `components/documents/live-document-viewer.tsx` — GET documents listing; read-only downloads.
  - `components/payment-status.tsx` — GET payments.
  - `components/realtime-status-indicator.tsx` + `hooks/useRealtime.ts` — Subscribe to table changes to reflect updates.

UI Guidelines:

- Prefer suspense-friendly data fetching via route handlers; avoid direct ServiceM8 calls from the client.
- Use optimistic UI for quote approvals and feedback while persisting to Supabase, then rely on realtime updates for confirmation.
- Ensure customer-scoped queries always use session-derived identifiers.

---

## 7. Data Flow Patterns

### 7.1 Read-Through Cache (Jobs/Documents/Payments)

1) Client requests list/detail → API reads Supabase.
2) If `refresh=true`, API fetches from ServiceM8, normalizes/upserts into Supabase, and returns the Supabase snapshot.
3) Supabase Realtime notifies subscribed clients of updates.

Benefits: Fast initial loads, consistent shape, and minimized third-party latency.

### 7.2 Write-Back (Quote Approval, Feedback)

1) Client submits action → API writes an intent row to Supabase with status `pending`.
2) API (or background task) calls ServiceM8 and updates the local row to `confirmed`/`failed`.
3) Realtime propagates status to the UI.

### 7.3 Access Control (Ban/Unban)

1) Admin action → API updates Supabase `customers.status` and revokes access via Auth utilities.
2) RLS ensures banned users cannot query any data.
3) UI reflects banned status on next query or via realtime updates.

---

## 8. Security & RBAC

- Supabase Auth sessions are required for all routes; admin routes additionally check server-side admin claims using `lib/auth/server.ts`.
- Enforce RLS on all tables with row filters by `user_id`, `customerId`, or `client_uuid` as appropriate (see migrations `0012_banned_customer_rls.sql` and others).
- Always derive scoping from the authenticated session on the server. Never trust client-provided identifiers for cross-tenant resources.
- Sanitization/validation at API boundaries; reject ambiguous or overscoped requests.
- Log notable reads/writes for auditing, redacting sensitive fields.

---

## 9. Error Handling & Resilience

- Normalize errors from ServiceM8 into a typed error shape: `{ code, message, retryable, details? }`.
- Return safe HTTP statuses from route handlers (4xx for client issues, 5xx for upstream failures).
- Use idempotency keys for write actions prone to retries (e.g., quote approvals) to avoid duplicates.
- Timeouts on ServiceM8 calls with bounded retries (e.g., 3 attempts with backoff) inside `lib/servicem8.ts`.
- Surface partial data with `stale=true` flags when upstream is unavailable; allow the UI to continue functioning on cached data.

---

## 10. Realtime Updates

- Tables emitting UI-facing changes (e.g., `jobs`, `quotes`, `documents`, `payments`) should be subscribed to via `hooks/useRealtime.ts`.
- APIs update Supabase rows; no direct websocket fan-out from the route handlers.
- UI displays connection status via `components/realtime-status-indicator.tsx` and updates views on change events.

---

## 11. Observability & Logging

- Use `lib/api-logging.ts` to log inbound API calls, arguments (redacted), and outcomes.
- Use `lib/audit-logging.ts` for security-sensitive actions (ban/unban, access changes, approvals).
- Document views/downloads are tracked via `lib/document-monitoring.ts`.
- Store aggregated logs in Supabase tables defined in `supabase/migrations/0015_audit_logs.sql` and `0016_api_logs.sql`.

---

## 12. Performance Considerations

- Batch ServiceM8 reads when possible and page through results.
- Avoid N+1 in route handlers; prefer single joins/queries against Supabase mirrors.
- Cache normalized, minimal shapes in Supabase that match UI needs.
- Defer heavy upstream refreshes unless `?refresh=true` is passed or a background sync is scheduled.

---

## 13. Testing Strategy

- Unit tests for services: mock ServiceM8 HTTP and Supabase client.
- Contract tests for route handlers: verify DTO validation, auth guards, and RLS-compatible scoping.
- Realtime tests: publish test rows and assert client hook reactions.
- Integration tests for read-through and write-back flows using fixture data.

---

## 14. Implementation Checklist (Frontend/Backend)

Backend

- Ensure all `app/api/admin/customers/*` routes implement create/link/update/ban/unban and call services.
- Implement `/api/customer-portal/*` routes for jobs, job detail, quote approval, feedback, documents, payments.
- Add optional `?refresh=true` handling for list/detail reads that triggers ServiceM8 fetch+upsert.
- Centralize ServiceM8 access in `lib/servicem8.ts`; add error normalization and retries.
- Use `lib/sync-service.ts` for read-through/write-back orchestration.
- Apply validation/sanitization at the route boundary.
- Call logging/auditing utilities from routes and services.

Frontend

- Wire admin pages/components to corresponding APIs with proper loading and error states.
- Wire customer portal pages/components to customer-portal APIs with optimistic updates where applicable.
- Subscribe to realtime changes for jobs/quotes/documents/payments.
- Ensure all list/detail views support manual refresh that passes `?refresh=true`.

---

## 15. Non-Goals (Explicitly Out of Scope Here)

- Webhook handling from ServiceM8 or elsewhere
- Email composition, queuing, and delivery
- Payment processing beyond reflecting status from ServiceM8

---

## 16. Reference: Repo Map

- Pages
  - `app/admin/*`, `app/jobs/*`, `app/payments/page.tsx`, `app/profile/page.tsx`
- API Routes
  - `app/api/admin/*`, `app/api/customer-portal/*`, `app/api/jobs/*`, `app/api/documents/*`, `app/api/payments/*`
- Libraries
  - `lib/servicem8.ts`, `lib/sync-service.ts`, `lib/customer-portal-api.ts`
  - `lib/auth/*`, `lib/supabase/*`, `lib/utils.ts`
  - `lib/audit-logging.ts`, `lib/api-logging.ts`, `lib/document-monitoring.ts`
- Hooks
  - `hooks/useAuth.ts`, `hooks/useRealtime.ts`
- Components
  - `components/*` including admin/customer portal UIs
- Supabase
  - `supabase/migrations/*` for schema and RLS

This knowledge base should guide day-to-day implementation and review. Keep it updated as APIs and schemas evolve.


