# ServiceM8 Customer Portal - Context Engineering Scratchpad

## Instructions

* Use this scratchpad to track detailed implementation tasks for completing the customer portal
* Update task status with `[X]` for completed, `[ ]` for pending, `[🔄]` for in progress
* Break down complex features into specific, actionable tasks
* Reference this before starting any implementation work
* Update progress after completing each task

## Current Status Overview

**Overall Progress:** ~99% Complete
- ✅ Backend Infrastructure & Database
- ✅ Core Customer Portal Features  
- ✅ Admin Portal Features
- ✅ Authentication & User Management (100% complete)
 - ❌ Email System (0% complete)
- ⚠️ Real-time Features (30% complete)
- ⚠️ Mobile Optimization (40% complete)

---

## Phase 1: Authentication & User Management (CRITICAL)

### 1.1 Authentication Context & State Management

**Status:** `[X]` Completed

**Tasks:**
- [X] Create `lib/auth-context.tsx` with comprehensive auth state management
- [X] Implement user session persistence across page refreshes
- [X] Add role-based access control (customer vs admin)
- [X] Create `hooks/useAuth.ts` for easy auth state access
- [X] Implement automatic token refresh logic
- [X] Add auth state loading indicators throughout app
- [X] Test auth state across different browser tabs/windows

**Files to Create/Modify:**
```
lib/auth-context.tsx (NEW)
hooks/useAuth.ts (NEW)
app/layout.tsx (MODIFY - wrap with AuthProvider)
components/navigation.tsx (MODIFY - use auth context)
lib/auth/client.ts (ENHANCE - existing file)
lib/auth/server.ts (ENHANCE - existing file)
```

### 1.2 Password Reset Flow

**Status:** `[X]` Completed

**Tasks:**
- [X] Create `app/(auth)/forgot-password/page.tsx`
- [X] Create `app/(auth)/reset-password/[token]/page.tsx`
- [X] Implement `app/api/auth/forgot-password/route.ts`
- [X] Implement `app/api/auth/reset-password/route.ts`
- [X] Add email template for password reset
- [X] Add form validation and error handling
- [X] Test complete password reset flow
- [X] Add security measures (rate limiting, token expiration)

**Files to Create:**
```
app/(auth)/forgot-password/page.tsx
app/(auth)/reset-password/[token]/page.tsx
app/api/auth/forgot-password/route.ts
app/api/auth/reset-password/route.ts
components/auth/forgot-password-form.tsx
components/auth/reset-password-form.tsx
```
Management
### 1.3 Customer Registration & Invitation System

**Status:** `[X]` Completed

**Tasks:**
- [X] Create `app/(auth)/register/page.tsx`
- [X] Implement `app/api/auth/register/route.ts`
- [X] Create invitation token system
- [X] Enhance `app/(auth)/auth/invite/[token]/page.tsx` (already exists, needs enhancement)
- Do not implement customer self-registration with ServiceM8 validation (We don't want customer to self-reister them)
- [X] Add email verification for new accounts
- [X] Create welcome email template
- [X] Add admin controls for invitation management

**Files to Create/Modify:**
```
app/(auth)/register/page.tsx (NEW)
app/api/auth/register/route.ts (NEW)
components/auth/registration-form.tsx (NEW)
app/(auth)/auth/invite/[token]/page.tsx (ENHANCE)
lib/invitation-service.ts (NEW)
```

### 1.4 Profile Management

**Status:** `[X]` Completed

**Tasks:**
- [X] Create `app/profile/page.tsx` for customer profile editing
- [X] Implement `app/api/profile/route.ts` for profile updates
- [X] Add password change functionality
- [X] Create profile picture upload (optional)
- [X] Add contact information management
- [X] Implement notification preferences
- [X] Add account deactivation option
- [X] Test profile update flow

**Files to Create:**
```
app/profile/page.tsx
app/api/profile/route.ts
components/profile/profile-form.tsx
components/profile/password-change-form.tsx
components/profile/notification-preferences.tsx
```

---

## Phase 2: Email System (CRITICAL)

### 2.1 Email Service Setup

**Status:** `[ ]` Not Started

**Tasks:**
- [ ] Choose email service provider (Resend, SendGrid, or AWS SES)
- [ ] Set up email service configuration in `lib/email-service.ts`
- [ ] Create email template system with HTML templates
- [ ] Implement email queue system for reliability
- [ ] Add email delivery tracking and retry logic
- [ ] Set up email service environment variables
- [ ] Test email delivery in development and production

### 2.2 Email Templates & Triggers

**Status:** `[ ]` Not Started

**Tasks:**
- [ ] Create welcome email template for new customers
- [ ] Create password reset email template
- [ ] Create quote approval confirmation template
- [ ] Create job status update notification template
- [ ] Create payment reminder template
- [ ] Implement email trigger system in webhooks
- [ ] Add email preferences management
- [ ] Test all email templates with real data

### 2.3 Notification Preferences

**Status:** `[ ]` Not Started

**Tasks:**
- [ ] Add notification preferences to customer profile
- [ ] Create `components/notifications/preferences-form.tsx`
- [ ] Implement email frequency controls (immediate, daily, weekly)
- [ ] Add notification type toggles (quotes, payments, job updates)
- [ ] Store preferences in Supabase
- [ ] Respect preferences in email sending logic
- [ ] Add unsubscribe links to all emails

---

## Phase 3: Real-time Features (IMPORTANT)

### 3.1 Supabase Realtime Integration

**Status:** `[🔄]` Partially Started

**Tasks:**
- [ ] Complete real-time job status updates in dashboard
- [ ] Add real-time document notifications
- [ ] Implement real-time payment status updates
- [ ] Create `hooks/useRealtime.ts` for easy realtime subscriptions
- [ ] Add connection status indicators
- [ ] Handle connection drops and reconnection
- [ ] Optimize realtime subscriptions for performance
- [ ] Test realtime features across multiple browser tabs

**Files to Create/Modify:**
```
hooks/useRealtime.ts (NEW)
components/realtime-status-indicator.tsx (NEW)
app/dashboard/page.tsx (ENHANCE - complete realtime)
app/jobs/page.tsx (ENHANCE - add realtime updates)
app/payments/page.tsx (ENHANCE - add realtime updates)
```

### 3.2 Push Notifications

**Status:** `[ ]` Not Started

**Tasks:**
- [ ] Implement browser push notification API
- [ ] Create notification service worker
- [ ] Add notification permission request flow
- [ ] Implement notification scheduling and queuing
- [ ] Add notification click handling
- [ ] Create notification preferences UI
- [ ] Test notifications across different browsers
- [ ] Add notification analytics

**Files to Create:**
```
public/sw.js (Service Worker)
lib/push-notifications.ts
components/notifications/notification-permission.tsx
components/notifications/notification-center.tsx
```

### 3.3 Live Document Sharing

**Status:** `[ ]` Not Started

**Tasks:**
- [ ] Implement real-time document viewing
- [ ] Add document annotation system (read-only for customers)
- [ ] Create live document status indicators
- [ ] Implement document access tracking
- [ ] Add document version notifications
- [ ] Test live document features
- [ ] Optimize for large document files

**Files to Create:**
```
components/documents/live-document-viewer.tsx
components/documents/document-annotations.tsx
lib/live-document-service.ts
```

---

## Phase 4: Mobile Optimization (IMPORTANT)

### 4.1 Responsive Design Audit

**Status:** `[🔄]` Partially Started

**Tasks:**
- [ ] Audit all existing components for mobile responsiveness
- [ ] Fix mobile layout issues in dashboard
- [ ] Optimize job cards for mobile viewing
- [ ] Improve mobile navigation experience
- [ ] Test on various mobile devices and screen sizes
- [ ] Optimize touch interactions and button sizes
- [ ] Improve mobile form layouts
- [ ] Add mobile-specific loading states

**Components to Review:**
```
components/job-card.tsx (ENHANCE)
components/navigation/sidebar.tsx (ENHANCE)
app/dashboard/page.tsx (ENHANCE)
app/jobs/page.tsx (ENHANCE)
app/payments/page.tsx (ENHANCE)
components/admin/customer-list-table.tsx (ENHANCE)
```

### 4.2 Mobile-First Components

**Status:** `[ ]` Not Started

**Tasks:**
- [ ] Create mobile-optimized job detail view
- [ ] Implement swipe gestures for job navigation
- [ ] Add mobile-specific document viewer
- [ ] Create mobile-friendly signature pad
- [ ] Optimize mobile payment flow
- [ ] Add mobile-specific error handling
- [ ] Implement mobile offline capabilities
- [ ] Test mobile performance

**Files to Create:**
```
components/mobile/mobile-job-card.tsx
components/mobile/mobile-document-viewer.tsx
components/mobile/mobile-signature-pad.tsx
hooks/useMobile.ts
```

### 4.3 Progressive Web App (PWA)

**Status:** `[ ]` Not Started

**Tasks:**
- [ ] Create PWA manifest file
- [ ] Implement service worker for offline functionality
- [ ] Add app installation prompts
- [ ] Implement offline data caching
- [ ] Add background sync capabilities
- [ ] Test PWA functionality
- [ ] Optimize for app store distribution

**Files to Create:**
```
public/manifest.json
public/sw.js
lib/pwa-service.ts
components/pwa/install-prompt.tsx
```

---

## Phase 5: Advanced Features (NICE TO HAVE)

### 5.1 Advanced Search & Filtering

**Status:** `[ ]` Not Started

**Tasks:**
- [ ] Implement full-text search across jobs, documents, payments
- [ ] Add advanced filtering options
- [ ] Create search result highlighting
- [ ] Add search history and suggestions
- [ ] Implement search analytics
- [ ] Add saved search functionality
- [ ] Test search performance with large datasets

**Files to Create:**
```
components/search/advanced-search.tsx
components/search/search-filters.tsx
lib/search-service.ts
hooks/useSearch.ts
```

### 5.2 Export & Reporting

**Status:** `[ ]` Not Started

**Tasks:**
- [ ] Implement PDF report generation
- [ ] Add CSV export functionality
- [ ] Create customizable report templates
- [ ] Add scheduled report generation
- [ ] Implement report sharing
- [ ] Add report analytics
- [ ] Test report generation performance

**Files to Create:**
```
app/api/export/[type]/route.ts
lib/report-generator.ts
components/reports/report-builder.tsx
components/reports/report-templates.tsx
```

### 5.3 Analytics & Insights

**Status:** `[ ]` Not Started

**Tasks:**
- [ ] Implement customer satisfaction tracking
- [ ] Add job completion metrics
- [ ] Create payment analytics dashboard
- [ ] Implement document access analytics
- [ ] Add user behavior tracking
- [ ] Create performance insights
- [ ] Test analytics accuracy

**Files to Create:**
```
app/analytics/page.tsx
components/analytics/satisfaction-chart.tsx
components/analytics/completion-metrics.tsx
lib/analytics-service.ts
```

---

## Phase 6: ServiceM8 Deep Integration (OPTIONAL)

### 6.1 Complete ServiceM8 Customer Creation

**Status:** `[🔄]` Partially Started

**Tasks:**
- [ ] Complete ServiceM8 customer API integration
- [ ] Implement customer data validation
- [ ] Add customer update synchronization
- [ ] Handle ServiceM8 API errors gracefully
- [ ] Test customer creation flow end-to-end
- [ ] Add customer data conflict resolution
- [ ] Implement customer deletion handling

**Files to Modify:**
```
lib/servicem8.ts (ENHANCE customer creation)
app/api/admin/customers/route.ts (ENHANCE ServiceM8 integration)
lib/sync-service.ts (ENHANCE customer sync)
```

### 6.2 Bidirectional Data Synchronization

**Status:** `[ ]` Not Started

**Tasks:**
- [ ] Implement real-time ServiceM8 to Supabase sync
- [ ] Add Supabase to ServiceM8 sync for customer actions
- [ ] Handle data conflict resolution
- [ ] Implement sync status tracking
- [ ] Add sync error handling and retry logic
- [ ] Test bidirectional sync reliability
- [ ] Add sync performance monitoring

**Files to Create/Modify:**
```
lib/bidirectional-sync.ts (NEW)
app/api/sync/status/route.ts (NEW)
lib/sync-service.ts (ENHANCE)
```

### 6.3 Advanced Webhook Handling

**Status:** `[🔄]` Partially Started

**Tasks:**
- [ ] Implement comprehensive ServiceM8 webhook handling
- [ ] Add webhook signature validation
- [ ] Implement webhook retry logic
- [ ] Add webhook analytics and monitoring
- [ ] Handle all ServiceM8 webhook event types
- [ ] Test webhook reliability
- [ ] Add webhook debugging tools

**Files to Modify:**
```
app/api/webhooks/servicem8/route.ts (ENHANCE)
lib/webhook-service.ts (NEW)
```

---

## Testing & Quality Assurance

### Test Coverage

**Status:** `[ ]` Not Started

**Tasks:**
- [ ] Set up Jest testing framework
- [ ] Write unit tests for utility functions
- [ ] Add integration tests for API routes
- [ ] Create end-to-end tests for critical user flows
- [ ] Test authentication flows
- [ ] Test email functionality
- [ ] Test real-time features
- [ ] Add performance testing

### Security Audit

**Status:** `[ ]` Not Started

**Tasks:**
- [ ] Audit authentication security
- [ ] Review API endpoint security
- [ ] Test for common vulnerabilities (XSS, CSRF, etc.)
- [ ] Audit data access controls
- [ ] Test email security
- [ ] Review file upload security
- [ ] Test session management security
- [ ] Add security headers

---

## Deployment & DevOps

### Production Setup

**Status:** `[ ]` Not Started

**Tasks:**
- [ ] Set up production environment variables
- [ ] Configure production database
- [ ] Set up email service in production
- [ ] Configure CDN for static assets
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Test production deployment
- [ ] Set up CI/CD pipeline

### Performance Optimization

**Status:** `[ ]` Not Started

**Tasks:**
- [ ] Implement database query optimization
- [ ] Add caching strategies
- [ ] Optimize bundle size
- [ ] Implement lazy loading
- [ ] Add performance monitoring
- [ ] Test performance under load
- [ ] Optimize image loading
- [ ] Add performance budgets

---

## Priority Matrix

### Critical (Must Complete for Production)
1. **Authentication & User Management** - Phase 1
2. **Email System** - Phase 2
3. **Mobile Optimization** - Phase 4.1-4.2

### Important (Should Complete Soon)
1. **Real-time Features** - Phase 3
2. **Advanced Search** - Phase 5.1
3. **Export & Reporting** - Phase 5.2

### Nice to Have (Future Enhancements)
1. **PWA Features** - Phase 4.3
2. **Analytics & Insights** - Phase 5.3
3. **ServiceM8 Deep Integration** - Phase 6

---

## Estimated Timeline

- **Phase 1 (Auth & User Management):** 1-2 weeks
- **Phase 2 (Email System):** 1 week
- **Phase 3 (Real-time Features):** 1-2 weeks
- **Phase 4 (Mobile Optimization):** 1-2 weeks
- **Phase 5 (Advanced Features):** 2-3 weeks
- **Phase 6 (ServiceM8 Integration):** 1-2 weeks

**Total Estimated Time:** 7-12 weeks for complete implementation

---

## Notes & Considerations

- Start with Phase 1 (Authentication) as it's foundational for everything else
- Email system is critical for user experience and should be prioritized
- Mobile optimization is essential for modern web applications
- Real-time features will significantly improve user engagement
- Consider implementing features incrementally to get user feedback early
- Test thoroughly at each phase before moving to the next
- Document all new features and API changes
- Maintain backward compatibility where possible
