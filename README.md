## ServiceM8 Customer Portal

A secure, self-service customer portal for ServiceM8 users to view job status, approve quotes, download documents, and track payments. Built with Next.js (App Router) and Supabase, integrated with the ServiceM8 API and real-time webhooks.

### Why it’s useful
- **Reduce back-and-forth**: Customers can self-serve job info, invoices, and approvals.
- **Faster approvals**: Digital quote approval with signature speeds up job kickoff.
- **Single source of truth**: Data syncs from ServiceM8 and is cached for performance.
- **Secure access**: Customer-specific isolation and audit logging.

### Who uses it
- **Customers**: View their jobs, download invoices/quotes, approve quotes, check payment status.
- **Internal staff (optional)**: Monitor customer activity and sync status via Supabase.

---

## Core User Flows

### 1) Customer dashboard
- Navigate to `/dashboard`.
- See total/active jobs, recent activity, upcoming schedule, pending approvals, and total value.
- Data is served via `GET /api/customer-portal/dashboard` backed by cached ServiceM8 sync.

### 2) Browse and filter jobs
- Navigate to `/jobs`.
- View list of jobs with status and key details.
- Filter by status/date; data from `GET /api/customer-portal/jobs`.

### 3) Document center (quotes, invoices, photos)
- From a job, open documents.
- Preview PDFs/images in the built-in viewer.
- Download via `GET /api/servicem8/attachments/[attachmentId]`.

### 4) Quote approval
- Open a quote and submit approval with signature and notes.
- Calls `POST /api/servicem8/jobs/[jobId]/approve`.
- Job status is updated and cached data is refreshed.

### 5) Payment tracking
- Navigate to `/payments`.
- View payment history, outstanding invoices, and statuses.
- Data from `GET /api/customer-portal/payments`.

---

## Features
- ServiceM8 API integration with rate limiting and retries.
- Real-time sync via webhooks (`/api/webhooks/servicem8`).
- Caching layer in Supabase for performance and quota management.
- Document management with previews and secure downloads.
- Quote approval workflow with digital signature.
- Access control and audit logging foundations.

---

## Architecture
- Next.js 15 App Router with API routes under `app/api/*`.
- Supabase Postgres for cached data and audit logs.
- ServiceM8 client for upstream data (jobs, attachments, materials, activities).
- Webhooks keep cache fresh on job, attachment, and material updates.

---

## Getting Started

### Prerequisites
- Node 18+
- ServiceM8 API key
- Supabase project (anon key + URL)

### Environment variables
- `SERVICEM8_API_KEY` – live data; if omitted, API serves safe mock data so the UI works
- `SERVICEM8_CUSTOMER_UUID` – default customer/company UUID to scope jobs for the portal
- `SERVICEM8_WEBHOOK_SECRET` (optional, recommended in production)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 

Notes:
- If `SERVICEM8_API_KEY` is not set, `GET /api/servicem8/jobs` returns mock jobs to keep the dashboard functional for demos and development.
- You can override the company on any request with `?customerId=UUID`.

### Install & run
```bash
npm install
npm run dev
# build: npm run build
# start: npm run start
```

### Quick verification
- Open `/dashboard` and confirm cards populate.
- Visit `/api/servicem8/jobs` to see JSON output. Use `?customerId=YOUR_COMPANY_UUID` to test another customer.

---

## API Surface (Selected)
- `GET /api/customer-portal/dashboard` – Dashboard metrics for a customer/company UUID.
- `GET /api/customer-portal/jobs` – Jobs list with optional filters.
- `GET /api/customer-portal/payments` – Derived payment history from jobs.
- `GET /api/servicem8/attachments/[attachmentId]` – Secure attachment download proxy.
- `POST /api/servicem8/jobs/[jobId]/approve` – Quote approval with signature.
- `POST /api/webhooks/servicem8` – Webhook receiver to trigger cache sync.

---

## Security & Compliance
- Session-based access with Supabase Auth (App Router).
- Customer data isolation enforced in queries.
- Audit logging and rate limiting foundations.
- Recommended: enable RLS policies and encryption for sensitive fields.

---

## Limitations & Next Steps
- Add email/password or magic-link providers for authentication.
- Complete RLS policies and data encryption.
- Add tests (unit/integration/E2E) and deployment docs.

---

## Contributing
Issues and PRs are welcome. Please avoid committing secrets and ensure changes pass linting and type checks.


