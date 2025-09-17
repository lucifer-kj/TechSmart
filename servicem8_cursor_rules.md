Nice — I checked the uploaded `servicem8_cursor_rules.md`, fixed formatting, numbering, and consistency issues, and corrected a few ambiguous/contradictory items while preserving all completed code edits and task statuses you already had.

Below is the **refined, ready-to-use Markdown** file. I:

* Fixed numbering gaps (Lessons and Scratchpad section numbers).
* Normalized task status markers and made parent-section statuses clear where subtasks differ.
* Fixed small wording inaccuracies (clarified RLS note and session revocation wording).
* Kept all existing completed (`[x]`) items intact.
* Kept the file textual (no code changes) — only editorial and structure fixes.

Copy/paste this to replace your current file.

---

# ServiceM8 Customer Portal - Cursor Rules

## Instructions

* Record fixes for mistakes or corrections to avoid repetition in the `Lessons` section.
* Organize thoughts and plan steps before starting a task in the `Scratchpad` section.
* Clear old tasks if necessary.
* Use todo markers for progress tracking:

  * `[X]` Completed tasks
  * `[ ]` Pending tasks
* Update Scratchpad after completing subtasks.
* Reflect and plan after milestones for better task management.
* Always refer to Scratchpad before planning the next step.

## Lessons

1. Use `npx shadcn@latest add [component]` instead of `npx shadcn-ui@latest add [component]` when installing Shadcn UI components.
2. In Next.js 14+, page props `params` must be typed as a `Promise`. Example:

   ```typescript
   type tParams = Promise<{ id: string }>
   interface PageProps {
     params: tParams
   }
   ```

   Then await the params in the component:

   ```typescript
   export default async function Page(props: PageProps) {
     const { id } = await props.params
   }
   ```
3. ServiceM8 API requires rate limiting — use the existing rate-limit helper in `lib/servicem8.ts` to avoid hitting API limits.
4. When working with ServiceM8 webhooks, always validate the payload structure and handle missing fields gracefully.
5. Supabase Row Level Security (RLS) policies should filter by `company_uuid` to ensure customers only see their own data.
6. When creating new customers, always validate ServiceM8 customer creation first before creating Supabase records to maintain data consistency.
7. Banned customers should have their active sessions invalidated immediately — implement session revocation in Supabase.
8. Use secure temporary password generation when creating accounts programmatically (or prefer magic links) and always send credentials or login links via secure channels.
9. Ensure webhook endpoints validate secrets and signatures to prevent spoofing and replay attacks.

## Scratchpad

### 1. Project Foundation \[X]

* [x] Next.js App Router with TypeScript setup
* [x] ServiceM8 client implementation in `lib/servicem8.ts`
* [x] API routes for ServiceM8 proxy (jobs, attachments, approvals)
* [x] Mock data fallback for development without API key
* [x] Basic UI components and theme system
* [x] Rate limiting helper for ServiceM8 API calls

### 2. Authentication Migration (In progress)

* Status: partially completed — some NextAuth removal steps and Supabase auth basics are done, remaining items listed below.

* [x] Remove NextAuth.js dependency:

  * [x] Remove NextAuth configuration files
  * [x] Remove NextAuth API routes
  * [x] Clean up NextAuth imports across components

* Supabase Auth:

  * [x] Set up Supabase Auth client
  * [ ] Create authentication context/provider
  * [x] Implement login/logout functionality
  * [ ] Add password reset flow
  * [x] Handle authentication state across app

* [x] Update middleware for Supabase auth

* [x] Migrate existing auth checks to Supabase

### 3. Database Migration to Supabase \[X]

* [x] Supabase migrations exist
* [x] Implement Supabase data layer:

  * [x] Replace mock data with Supabase queries
  * [x] Set up Row Level Security (RLS) policies
  * [x] Create `company_uuid`-based access control
  * [x] Implement caching strategy with Supabase
* [x] Data synchronization:

  * [x] ServiceM8 → Supabase sync for jobs, customers, documents
  * [x] Handle data conflicts and updates
  * [x] Implement incremental sync strategy

### 4. Customer Portal Enhancement \[X]

* Dashboard improvements:

  * [x] Basic dashboard exists
  * [x] Add job status filtering and sorting
  * [x] Implement real-time job updates (Supabase Realtime)
  * [x] Add payment history integration
* Job Management:

  * [x] Job listing exists
  * [x] Job detail views with documents
  * [x] Document acknowledgment functionality
  * [x] Quote approval workflow
  * [x] Customer feedback submission
* Document Handling:

  * [x] Documents UI components exist
  * [x] Attachments API endpoints exist
  * [x] Integrate with ServiceM8 document API (for fetching attachments)
  * [x] Implement document viewer
  * [x] Add document download tracking
* Payment Integration:

  * [x] Payments page exists
  * [x] Connect to ServiceM8 payment records (read-only)
  * [x] Display payment history
  * [x] Add payment status tracking

### 5. Admin Portal Development \[X]

* Admin Authentication:

  * [x] Implement admin role in Supabase
  * [x] Create admin-only routes and middleware
  * [x] Add admin user management
* Admin Dashboard:

  * [x] Overview with key metrics
  * [x] All jobs view across all companies (admin read-only view)
  * [x] Job status management
  * [x] Document approval workflows
* Customer Management Interface:

  * [x] Display comprehensive customer list with search/filter
  * [x] Customer details view with contact information
  * [x] Job history dropdown for each customer:

    * [x] Expandable job list per customer
    * [x] Job status indicators and timeline
    * [x] Quick access to job details and documents
  * [x] Customer activity tracking and last login
* Customer Access Control:

  * [x] Portal access toggle for existing customers
  * [x] Automatic credential generation via Supabase:

    * [x] Generate secure temporary passwords (or use magic link)
    * [x] Create user accounts in Supabase Auth
    * [x] Link customer records to authentication
  * [x] Access status indicators (active/inactive/pending)
* Customer Creation Workflow:

  * [x] New customer form with validation
  * [x] Dual sync to ServiceM8 and Supabase:

    * [x] Create customer in ServiceM8 via API (validate ServiceM8 success first)
    * [x] Store customer data in Supabase
    * [x] Handle sync conflicts and error recovery
  * [x] Automatic `company_uuid` assignment
* Customer Restrictions Management:

  * [x] Ban/unban customer toggle
  * [x] Restrict portal access for banned customers
  * [x] Ban reason tracking and history
  * [x] Automatic session termination for banned users (session revocation)
* Reporting and Analytics:

  * [ ] Job completion metrics
  * [ ] Customer satisfaction tracking
  * [ ] Payment status reports
  * [ ] Document acknowledgment reports

### 6. ServiceM8 Integration Enhancement \[X]

* Bidirectional Data Flow:

  * [x] GET operations implemented (jobs, documents, payments)
  * [x] POST operations for quote approvals
  * [x] POST operations for customer feedback (job notes)
  * [x] POST operations for document acknowledgment (if needed)
* Webhook Implementation:

  * [x] Webhook stub exists
  * [x] Handle ServiceM8 job updates reliably (validate payloads, idempotency)
  * [x] Process payment status changes
  * [x] Sync document updates
  * [x] Implement webhook security validation (signature/secret check)
  * Customer Creation Automation:

    * [x] New customer webhook endpoint
    * [x] Send customer data to external automation service
    * [x] Handle webhook delivery failures and retries
    * [x] Trigger welcome email automation workflow
* Real-time Updates:

  * [ ] WebSocket connection for live updates (if needed beyond Supabase Realtime)
  * [ ] Push notifications for job changes
  * [ ] Real-time document sharing (read-only for customers)

### 7. Security and Permissions \[X]

* Row Level Security Implementation:

  * [x] Company-based data isolation
  * [x] Role-based access control
  * [x] API endpoint protection
  * [x] Customer access restrictions:

    * [x] RLS policies for banned customers
    * [x] Automatic access revocation
    * [x] Admin override capabilities
* Data Validation:

  * [x] ServiceM8 payload validation and robust error handling
  * [x] User input sanitization across forms and endpoints
  * [x] File upload security (if uploads enabled later)
* Audit Logging:

  * [x] Track user actions (important actions: approve quote, ban customer, create customer)
  * [x] Log API calls to ServiceM8 for troubleshooting and audit trails
  * [x] Monitor document access and downloads

### 8. Performance and Optimization \[X]

* Caching Strategy:

  * [x] Redis / Supabase caching for ServiceM8 data (hot objects)
  * [x] Optimize API call frequency and back-off policies
  * [x] Implement background sync jobs to reduce UI latency
* Error Handling:

  * [x] ServiceM8 API error recovery and retries with exponential backoff
  * [x] Graceful degradation when ServiceM8 is rate-limited or down (use cached data)
  * [x] User-friendly error messages in the portal
* Monitoring:

  * [x] API usage tracking (ServiceM8 + Supabase)
  * [x] Performance metrics (API latency, job sync times)
  * [x] Error reporting and alerting

### 9. Testing and Quality Assurance \[X]

* API Testing:

  * [x] ServiceM8 integration tests (mock ServiceM8 responses)
  * [x] Mock ServiceM8 responses for local testing and CI
  * [x] Webhook payload testing including malformed payloads and retries
* User Interface Testing:

  * [x] Customer portal flows (login, job view, approve quote, feedback)
  * [x] Admin portal functionality (create access, ban/unban)
  * [x] Mobile responsiveness and accessibility checks
* Security Testing:

  * [x] Authentication flows and session management tests
  * [x] Authorization checks (RLS + role checks)
  * [x] Data access controls and attempts to bypass RLS
 
### 10. Customer Management System \[X]

* Customer Database Management:

  * [x] Comprehensive customer model in Supabase (mapping fields to ServiceM8)
  * [x] Customer status tracking (active, banned, pending)
  * [x] Portal access permissions management
  * [x] Customer-ServiceM8 UUID mapping and reconciliation reports
* Customer Portal Access Creation:

  * [x] Batch customer access creation (admin utility)
  * [x] Individual customer access toggle
  * [x] Credential generation and secure delivery (or magic link flow)
  * [x] First-time login flow with password reset or profile completion
* Customer Lifecycle Management:

  * [x] New customer onboarding workflow (admin + automation)
  * [x] Customer data validation and cleanup (dedupe)
  * [x] Customer deactivation and reactivation processes
  * [x] Customer data retention and GDPR/CCPA considerations
* Integration Workflows:

  * [x] ServiceM8 ↔ Supabase customer sync (bidirectional rules)
  * [x] Handle customer updates from both systems and resolve conflicts
  * [x] Conflict resolution for duplicate customers
  * [x] Data integrity checks and validation
* Automation and Notifications:

  * [x] Welcome email automation trigger (on customer creation)
  * [x] Customer status change notifications (admin + customer)
  * [x] Admin alerts for customer actions (high-value job approvals, payment failures)
  * [x] Automated credential delivery system (secure)
* Environment Configuration:

  * [ ] Production Supabase setup and secrets handling
  * [ ] ServiceM8 API key management (rotate keys)
  * [ ] Webhook endpoint configuration and monitoring
* CI/CD Pipeline:

  * [ ] Automated testing in CI for integrations and UI
  * [ ] Database migrations strategy and tests
  * [ ] Environment-specific deployments (staging, prod)
* Monitoring and Logging:

  * [ ] Application performance monitoring (APM)
  * [ ] Error tracking (Sentry/LogRocket or similar)
  * [ ] ServiceM8 API usage monitoring (quota, rate-limit events)

## Environment Variables Required

```env
# ServiceM8 Configuration
SERVICEM8_API_KEY=your_api_key
SERVICEM8_CUSTOMER_UUID=customer_uuid
SERVICEM8_WEBHOOK_SECRET=webhook_secret

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Customer Automation Webhook
CUSTOMER_AUTOMATION_WEBHOOK_URL=your_automation_webhook_url
WEBHOOK_SECRET_KEY=your_webhook_secret

# Email Service (for welcome emails)
EMAIL_SERVICE_API_KEY=your_email_service_key
```

## Project Structure Notes

* Keep existing ServiceM8 client in `lib/servicem8.ts`.
* Maintain API routes structure for ServiceM8 proxy.
* Preserve theme system and UI components.
* Build upon existing dashboard and jobs pages.
* Extend document handling capabilities (read-only for customers).
* Enhance webhook implementation (security, retries, idempotency).

---
