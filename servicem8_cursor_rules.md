# ServiceM8 Customer Portal - Cursor Rules

## Project Overview
A secure customer portal for ServiceM8 users to view job status, download documents, approve quotes, and track payments. Built with Next.js, integrated with ServiceM8 API, and hosted on Vercel.

## Instructions

- Record fixes for mistakes or corrections to avoid repetition in the `Lessons` section.
- Organize thoughts and plan steps before starting a task in the `Scratchpad` section.
- Clear old tasks if necessary.
- Use todo markers for progress tracking:
  - `[X]` Completed tasks
  - `[ ]` Pending tasks
- Update Scratchpad after completing subtasks.
- Reflect and plan after milestones for better task management.
- Always refer to Scratchpad before planning the next step.
- Follow security-first approach for all customer data handling.

## Technology Stack

- **Frontend**: React.js/Next.js 15+ with TypeScript
- **Backend**: Next.js API routes (serverless)
- **Database**: PostgreSQL via Supabase
- **Integration**: ServiceM8 API
- **Hosting**: Vercel
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **File Uploads**: Uploadthing (for document handling)

## Lessons

1. **ServiceM8 API Integration**:
   - Always use proper error handling for ServiceM8 API calls as they can be rate-limited
   - Store ServiceM8 webhooks data immediately in Supabase to avoid data loss
   - Use incremental sync for large datasets to prevent timeouts

2. **Next.js 15+ Specific**:
   - Use `npx shadcn@latest add [component]` for Shadcn UI components
   - Page props params must be typed as Promise:
     ```typescript
     type tParams = Promise<{ id: string }>
     interface PageProps {
       params: tParams
     }
     ```
   - Always await params: `const { id } = await props.params`

3. **Authentication & Security**:
   - Use `const { data: { user } } = await supabase.auth.getUser()` for Supabase Auth
   - Implement customer-specific data isolation in database queries
   - Always validate customer access to job data before serving

4. **Database & Supabase**:
   - Use Row Level Security (RLS) for customer data protection
   - Implement proper indexing for job queries by customer_id
   - Cache frequently accessed ServiceM8 data locally to reduce API calls

5. **File Handling**:
   - Use Uploadthing for secure document uploads/downloads
   - Implement proper file type validation for invoices/quotes
   - Store file metadata in Supabase, actual files in Uploadthing

6. **Build & Lint Fixes (2025-09-16)**:
   - For NextAuth v4 in App Router, export handlers with `export const { GET, POST } = NextAuth(authOptions)` and use `getServerSession(authOptions)` for `auth()` in server code
   - Replace `<img>` with `next/image` for optimized LCP and bandwidth
   - Remove unused imports and explicitly void unused parameters to satisfy ESLint without disabling rules
   - Ensure API route files export valid `GET/POST` to avoid Turbopack “handlers undefined” build error

## Project Status Summary

**Overall Progress: ~85% Complete**

### ✅ **Completed Areas:**
- **Project Setup**: Next.js 15 + TypeScript + all dependencies installed
- **Database Schema**: Complete ServiceM8-aligned schema with all tables and migrations
- **ServiceM8 API Integration**: Complete client with rate limiting, error handling, and all endpoints
- **Data Synchronization**: Webhook handlers, real-time sync, intelligent caching
- **Authentication**: NextAuth setup with security middleware
- **Advanced Features**: Document management, quote approval, payment tracking
- **Customer Portal API**: Comprehensive dashboard, jobs, documents, and payments
- **Security**: Audit logging, data protection, access control
- **Real-time Features**: Webhook integration for live updates

### 🚧 **In Progress Areas:**
- **UI/UX**: Basic components done, needs advanced features and polish
- **Authentication**: NextAuth basic setup done, needs email/password providers

### ❌ **Pending Areas:**
- **Testing & Deployment**: Unit tests, E2E tests, Vercel deployment
- **Documentation**: User guides and technical documentation

## Scratchpad

### 1. Project Setup and Infrastructure [X]

- [x] Initialize Next.js 15 project with TypeScript
- [ ] Set up Vercel deployment pipeline
- [x] Configure environment variables for:
  - ServiceM8 API credentials
  - Supabase connection
  - Uploadthing keys
- [x] Install dependencies:
  - Supabase client
  - Shadcn UI + Tailwind CSS
  - Zod validation
  - React Hook Form
  - Zustand
  - Uploadthing

### 2. Database Schema Design [X]

- [x] Supabase Database Setup:
  - [x] Create customers table (synced from ServiceM8)
  - [x] Create jobs table with status tracking
  - [x] Create documents table (invoices, quotes, etc.)
  - [x] Create payments table
  - [x] Create audit_logs table for security
  - [x] Create job_materials table (ServiceM8 line items)
  - [x] Create job_activities table (ServiceM8 scheduling/time)
- [ ] Row Level Security (RLS):
  - [ ] Implement customer data isolation
  - [ ] Create security policies for all tables
  - [ ] Test data access controls
- [x] ServiceM8 API Alignment:
  - [x] Add missing ServiceM8 fields to all tables
  - [x] Create migration for schema updates
  - [x] Remove RLS policies (as requested)

### 3. ServiceM8 API Integration [X]

- [x] API Client Setup:
  - [x] Create ServiceM8 client with proper authentication
  - [x] Implement rate limiting and retry logic
  - [x] Add comprehensive error handling
- [x] Data Synchronization:
  - [x] Initial data sync from ServiceM8
  - [x] Webhook handlers for real-time updates
  - [x] Incremental sync for performance
- [x] Core API Endpoints:
  - [x] Jobs endpoints (GET /api/servicem8/jobs)
  - [x] Companies endpoints (GET /company.json, GET /company/{uuid}.json)
  - [x] Job Materials endpoints (GET /jobmaterial.json?$filter=job_uuid eq '{uuid}')
  - [x] Attachments endpoints (GET /attachment.json?$filter=related_object_uuid eq '{uuid}')
  - [x] Job Activities endpoints (GET /jobactivity.json?$filter=job_uuid eq '{uuid}')
  - [x] Attachment download endpoints (GET /attachment/{uuid}.json?$attachment)
- [x] Advanced API Features:
  - [x] Quote approval workflow
  - [x] Document management system
  - [x] Customer data endpoints
  - [x] Real-time webhook integration

### 4. Authentication & Security [PARTIAL]

- [x] NextAuth Configuration:
  - [x] Basic NextAuth setup
  - [ ] Email/password authentication
  - [ ] Magic link authentication
  - [ ] Customer-specific user management
- [x] Security Middleware:
  - [x] Rate limiting on API routes
  - [x] Request validation
  - [x] Authentication middleware on all endpoints
- [x] Data Protection:
  - [x] Implement audit logging (audit_logs table)
  - [x] Customer data access control
  - [ ] Encrypt sensitive customer data
  - [ ] GDPR compliance measures

### 5. Customer Portal Features [X]

- [x] Dashboard:
  - [x] Job status overview
  - [x] Basic jobs list display
  - [x] Job status indicators
  - [x] Recent activity feed
  - [x] Quick actions (approve quotes, download docs)
- [x] Jobs Management:
  - [x] Jobs list with basic display
  - [x] Jobs list with filtering/sorting
  - [x] Job detail pages with progress tracking
  - [x] Job materials/line items display
  - [x] Job activities/scheduling display
  - [x] Status updates and notifications
- [x] Document Center:
  - [x] Download invoices and quotes
  - [x] Document preview functionality
  - [x] Attachment management (quotes, invoices, photos)
  - [x] Version history tracking
  - [x] File type validation and security
- [x] Quote Approval System:
  - [x] Quote review interface with line items
  - [x] Digital approval workflow
  - [x] Customer signature capture
  - [x] Approval history and status
- [x] Payment Tracking:
  - [x] Payment history
  - [x] Outstanding invoices
  - [x] Payment status indicators
- [x] Company/Customer Management:
  - [x] Customer profile management
  - [x] Address and contact updates
  - [x] Customer-specific data isolation

### 6. UI/UX Development [PARTIAL]

- [x] Responsive Design:
  - [x] Basic responsive layout with Tailwind CSS
  - [x] Mobile-first approach
  - [ ] Tablet and desktop optimization
  - [ ] Touch-friendly interfaces
- [x] Component Library:
  - [x] Basic job status cards
  - [x] Document viewer components
  - [ ] Approval forms
  - [ ] Payment status indicators
- [x] User Experience:
  - [x] Loading states and error handling
  - [ ] Error boundaries and fallbacks
  - [ ] Progressive enhancement

### 7. Real-time Features [X]

- [x] ServiceM8 Webhook Integration:
  - [x] Webhook endpoint setup (/api/webhooks/servicem8)
  - [x] Job update webhooks (job.updated)
  - [x] Attachment creation webhooks (attachment.created)
  - [x] Material update webhooks (jobmaterial.updated)
  - [x] Webhook signature verification
- [x] Real-time Data Sync:
  - [x] Real-time job status updates
  - [x] Live notifications
  - [x] Connection management
- [ ] Push Notifications:
  - [ ] Browser notifications
  - [ ] Email notifications
  - [ ] SMS integration (optional)

### 8. Performance & Optimization [X]

- [x] Caching Strategy:
  - [x] ServiceM8 data caching in Supabase
  - [x] Rate limiting implementation (20,000 requests/day limit)
  - [x] Exponential backoff for 429 responses
  - [x] Intelligent cache validity checking
  - [ ] Redis for session caching (if needed)
  - [ ] CDN optimization for documents
- [x] Database Optimization:
  - [x] Query optimization
  - [x] Index optimization
  - [x] Connection pooling
- [x] API Performance:
  - [x] Request batching
  - [x] Background job processing
  - [x] Error monitoring
  - [x] ServiceM8 API usage monitoring

### 9. Testing & Quality Assurance [ ]

- [ ] Unit Testing:
  - [ ] API route testing
  - [ ] Component testing
  - [ ] Utility function testing
- [ ] Integration Testing:
  - [ ] ServiceM8 API integration
  - [ ] Database operations
  - [ ] Supabase Auth flows
- [ ] E2E Testing:
  - [ ] Customer portal workflows
  - [ ] Quote approval process
  - [ ] Document download flows
- [ ] Security Testing:
  - [ ] Supabase Auth bypass tests
  - [ ] Data access control tests
  - [ ] SQL injection prevention

### 10. Deployment & Monitoring [ ]

- [ ] Production Setup:
  - [ ] Vercel deployment configuration
  - [ ] Environment variable management
  - [ ] SSL certificate setup
- [ ] Monitoring:
  - [ ] Error tracking (Sentry/similar)
  - [ ] Performance monitoring
  - [ ] API usage analytics
- [ ] Backup & Recovery:
  - [ ] Database backup strategy
  - [ ] Disaster recovery plan
  - [ ] Data retention policies

### 11. Documentation & Training [ ]

- [ ] Technical Documentation:
  - [ ] API documentation
  - [ ] Database schema documentation
  - [ ] Deployment guides
- [ ] User Documentation:
  - [ ] Customer portal user guide
  - [ ] Administrator guide
  - [ ] Troubleshooting guide

## Security Checklist

- [x] Implement proper NextAuth for all routes
- [x] Validate customer access to all job data
- [x] Use HTTPS for all communications
- [x] Sanitize all user inputs
- [x] Implement rate limiting on all APIs
- [x] Log all customer actions for audit
- [ ] Encrypt sensitive data at rest
- [ ] Regular security updates and patches
- [ ] GDPR/privacy compliance review

## ServiceM8 API Best Practices

- Always handle rate limits gracefully (20,000 requests/day limit)
- Cache frequently accessed data locally
- Use webhooks for real-time updates instead of polling
- Implement proper error handling for all API calls
- Test with ServiceM8 sandbox environment first
- Monitor API usage and costs
- Keep API credentials secure and rotate regularly
- Use X-API-Key header for authentication
- Implement exponential backoff for 429 responses
- Batch requests where possible to optimize performance

## ServiceM8 API Implementation Details

### Required API Endpoints:
- **Companies**: `/company.json`, `/company/{uuid}.json`
- **Jobs**: `/job.json`, `/job/{uuid}.json`, `/job.json?$filter=company_uuid eq '{uuid}'`
- **Job Materials**: `/jobmaterial.json?$filter=job_uuid eq '{uuid}'`
- **Attachments**: `/attachment.json?$filter=related_object_uuid eq '{uuid}'`, `/attachment/{uuid}.json?$attachment`
- **Job Activities**: `/jobactivity.json?$filter=job_uuid eq '{uuid}'`

### Key ServiceM8 Fields:
- **Company**: uuid, name, email, mobile, address, active, date_created, date_last_modified
- **Job**: uuid, job_number, company_uuid, job_description, status, generated_job_total, job_address, date_created, date_last_modified
- **JobMaterial**: uuid, job_uuid, name, description, qty, cost_ex_tax, total_ex_tax, total_inc_tax
- **Attachment**: uuid, related_object_uuid, file_name, file_type, attachment_source, date_created, file_size
- **JobActivity**: uuid, job_uuid, activity_type, start_date, end_date, staff_uuid, notes

### Webhook Events:
- `job.updated` - Job status changes
- `attachment.created` - New documents/photos
- `jobmaterial.updated` - Line item changes

## Notes

- Customer data isolation is critical - always filter by customer_id
- ServiceM8 API has rate limits - implement proper caching
- File uploads should be validated and scanned for security
- All customer actions should be logged for audit purposes
- Performance is key - customers expect fast load times
- Mobile experience is crucial for field workers and customers