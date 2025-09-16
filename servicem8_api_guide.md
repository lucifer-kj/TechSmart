# ServiceM8 API Complete Resource Guide - Customer Portal

## Overview

This comprehensive guide covers everything needed to integrate with the ServiceM8 API for building a customer portal. The ServiceM8 REST API allows you to connect third-party applications to ServiceM8 using standard HTTP methods and JSON responses.

## Table of Contents

1. [Authentication & Setup](#authentication--setup)
2. [API Basics](#api-basics)
3. [Core Endpoints for Customer Portal](#core-endpoints-for-customer-portal)
4. [Data Models & Relationships](#data-models--relationships)
5. [Implementation Guide](#implementation-guide)
6. [Rate Limiting & Best Practices](#rate-limiting--best-practices)
7. [Webhook Integration](#webhook-integration)
8. [Error Handling](#error-handling)
9. [Complete Client Implementation](#complete-client-implementation)

---

## Authentication & Setup

### API Key Authentication

ServiceM8 uses API keys for authentication. You must include the API key in all API requests by setting it in the X-API-Key header.

**Getting Your API Key:**
1. Log into your ServiceM8 account
2. Go to Settings > API Keys
3. Generate a new API key
4. Store it securely (never expose in client-side code)

**Authentication Headers:**
```javascript
const headers = {
  'X-API-Key': process.env.SERVICEM8_API_KEY,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

### Base URL
```
https://api.servicem8.com/api_1.0/
```

---

## API Basics

### HTTP Methods
- `GET` - Retrieve data
- `POST` - Create new resources
- `PUT` - Update existing resources
- `DELETE` - Remove resources

### Response Format
All responses are in JSON format with standard HTTP status codes.

### Rate Limits
The daily limit of 20,000 requests is a fixed limit and does not change based on the size of the account or number of jobs. Throttling is applied on a per-application and per-account basis.

**Rate Limiting Best Practices:**
- Implement exponential backoff for 429 responses
- Cache frequently accessed data
- Use webhooks for real-time updates instead of polling
- Batch requests where possible

---

## Core Endpoints for Customer Portal

### 1. Companies (Customers)

**Get All Companies**
```
GET /company.json
```

**Get Specific Company**
```
GET /company/{company_uuid}.json
```

**Company Fields (Key ones for portal):**
- `uuid` - Unique identifier
- `name` - Company name
- `email` - Primary email
- `mobile` - Mobile number
- `address` - Full address
- `active` - Status (1 = active, 0 = inactive)

### 2. Jobs

**Get All Jobs**
```
GET /job.json
```

**Get Jobs for Specific Company**
```
GET /job.json?$filter=company_uuid eq '{company_uuid}'
```

**Get Specific Job**
```
GET /job/{job_uuid}.json
```

**Job Fields (Essential for portal):**
- `uuid` - Unique identifier
- `job_number` - Human-readable job number
- `company_uuid` - Link to customer
- `job_description` - Job description
- `status` - Job status (Quote, Work Order, Invoice, etc.)
- `generated_job_total` - Total job value
- `job_address` - Job location
- `date_created` - Creation date
- `date_last_modified` - Last update

### 3. Job Materials (Line Items)

**Get Materials for Job**
```
GET /jobmaterial.json?$filter=job_uuid eq '{job_uuid}'
```

**JobMaterial Fields:**
- `uuid` - Unique identifier
- `job_uuid` - Parent job reference
- `name` - Item/service name
- `description` - Detailed description
- `qty` - Quantity
- `cost_ex_tax` - Unit cost excluding tax
- `total_ex_tax` - Total excluding tax
- `total_inc_tax` - Total including tax

### 4. Attachments (Documents)

**Get Attachments for Job**
```
GET /attachment.json?$filter=related_object_uuid eq '{job_uuid}'
```

**Attachment Fields:**
- `uuid` - Unique identifier
- `related_object_uuid` - Parent object (job/company)
- `file_name` - Original filename
- `file_type` - MIME type
- `attachment_source` - Source (Quote, Invoice, Photo, etc.)
- `date_created` - Upload date
- `file_size` - Size in bytes

**Download Attachment**
```
GET /attachment/{attachment_uuid}.json?$attachment
```

### 5. Job Activities (Scheduling & Time)

**Get Activities for Job**
```
GET /jobactivity.json?$filter=job_uuid eq '{job_uuid}'
```

**JobActivity Fields:**
- `uuid` - Unique identifier  
- `job_uuid` - Parent job
- `activity_type` - Type (Scheduled, Recorded Time)
- `start_date` - Start date/time
- `end_date` - End date/time
- `staff_uuid` - Assigned staff member
- `notes` - Activity notes

---

## Data Models & Relationships

### Entity Relationship Overview

The names of objects on the REST API don't always match the terminology used in the ServiceM8 user interface:

| ServiceM8 UI | REST API |
|--------------|----------|
| Client/Customer | Company |
| Line items on quote/invoice | JobMaterial |
| Scheduled Booking | JobActivity |
| Recorded Time | JobActivity |
| Quotes, Invoices, Work Orders | Attachment |
| Photos | Attachment |

### Key Relationships
```
Company (Customer)
    └── Jobs (Multiple)
        ├── JobMaterials (Line Items)
        ├── JobActivities (Scheduling/Time)
        └── Attachments (Documents/Photos)
```

---

## Implementation Guide

### 1. ServiceM8 Client Class

```typescript
// lib/servicem8-client.ts
export class ServiceM8Client {
  private baseUrl = 'https://api.servicem8.com/api_1.0';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get headers() {
    return {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new ServiceM8Error(response.status, await response.text());
    }

    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new ServiceM8Error(response.status, await response.text());
    }

    return response.json();
  }

  // Customer Portal Specific Methods
  async getCustomerJobs(companyUuid: string) {
    return this.get<Job[]>(`/job.json?$filter=company_uuid eq '${companyUuid}'`);
  }

  async getJobDetails(jobUuid: string) {
    return this.get<Job>(`/job/${jobUuid}.json`);
  }

  async getJobMaterials(jobUuid: string) {
    return this.get<JobMaterial[]>(`/jobmaterial.json?$filter=job_uuid eq '${jobUuid}'`);
  }

  async getJobAttachments(jobUuid: string) {
    return this.get<Attachment[]>(`/attachment.json?$filter=related_object_uuid eq '${jobUuid}'`);
  }

  async downloadAttachment(attachmentUuid: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/attachment/${attachmentUuid}.json?$attachment`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new ServiceM8Error(response.status, 'Failed to download attachment');
    }

    return response.blob();
  }

  async approveQuote(jobUuid: string, approvalData: QuoteApproval) {
    return this.post(`/job/${jobUuid}/approve.json`, approvalData);
  }
}

class ServiceM8Error extends Error {
  constructor(public status: number, message: string) {
    super(`ServiceM8 API Error ${status}: ${message}`);
  }
}
```

### 2. TypeScript Interfaces

```typescript
// types/servicem8.ts
export interface Company {
  uuid: string;
  name: string;
  email: string;
  mobile: string;
  address: string;
  active: number;
  date_created: string;
  date_last_modified: string;
}

export interface Job {
  uuid: string;
  job_number: string;
  company_uuid: string;
  job_description: string;
  status: 'Quote' | 'Work Order' | 'Invoice' | 'Complete' | 'Cancelled';
  generated_job_total: number;
  job_address: string;
  date_created: string;
  date_last_modified: string;
  date_completed?: string;
  staff_uuid?: string;
}

export interface JobMaterial {
  uuid: string;
  job_uuid: string;
  name: string;
  description: string;
  qty: number;
  cost_ex_tax: number;
  total_ex_tax: number;
  total_inc_tax: number;
  date_created: string;
}

export interface Attachment {
  uuid: string;
  related_object_uuid: string;
  file_name: string;
  file_type: string;
  attachment_source: 'Quote' | 'Invoice' | 'Photo' | 'Document';
  date_created: string;
  file_size: number;
}

export interface JobActivity {
  uuid: string;
  job_uuid: string;
  activity_type: 'Scheduled' | 'Recorded Time';
  start_date: string;
  end_date: string;
  staff_uuid: string;
  notes?: string;
}

export interface QuoteApproval {
  approved: boolean;
  approval_date: string;
  customer_signature?: string;
  notes?: string;
}
```

### 3. Next.js API Routes

```typescript
// pages/api/jobs/[customerId].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { ServiceM8Client } from '../../../lib/servicem8-client';
import { getServerSession } from 'next-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { customerId } = req.query;
  const client = new ServiceM8Client(process.env.SERVICEM8_API_KEY!);

  try {
    // Verify customer has access to this data
    if (session.user.companyUuid !== customerId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const jobs = await client.getCustomerJobs(customerId as string);
    
    // Cache in Supabase
    await cacheJobsData(customerId as string, jobs);
    
    res.json(jobs);
  } catch (error) {
    console.error('ServiceM8 API Error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
}
```

### 4. Data Synchronization Service

```typescript
// lib/sync-service.ts
export class SyncService {
  private sm8Client: ServiceM8Client;
  private supabase: SupabaseClient;

  constructor(apiKey: string, supabaseClient: SupabaseClient) {
    this.sm8Client = new ServiceM8Client(apiKey);
    this.supabase = supabaseClient;
  }

  async syncCustomerData(companyUuid: string) {
    try {
      // Sync jobs
      const jobs = await this.sm8Client.getCustomerJobs(companyUuid);
      await this.cacheJobs(companyUuid, jobs);

      // Sync attachments for each job
      for (const job of jobs) {
        const attachments = await this.sm8Client.getJobAttachments(job.uuid);
        await this.cacheAttachments(job.uuid, attachments);

        const materials = await this.sm8Client.getJobMaterials(job.uuid);
        await this.cacheMaterials(job.uuid, materials);
      }

      return { success: true, jobCount: jobs.length };
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  private async cacheJobs(companyUuid: string, jobs: Job[]) {
    const { error } = await this.supabase
      .from('jobs')
      .upsert(jobs.map(job => ({
        ...job,
        company_uuid: companyUuid,
        synced_at: new Date().toISOString()
      })));

    if (error) throw error;
  }

  private async cacheAttachments(jobUuid: string, attachments: Attachment[]) {
    const { error } = await this.supabase
      .from('attachments')
      .upsert(attachments.map(att => ({
        ...att,
        job_uuid: jobUuid,
        synced_at: new Date().toISOString()
      })));

    if (error) throw error;
  }
}
```

---

## Rate Limiting & Best Practices

### Rate Limit Implementation

```typescript
// lib/rate-limiter.ts
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests = 20000; // Daily limit
  private readonly windowMs = 24 * 60 * 60 * 1000; // 24 hours

  canMakeRequest(apiKey: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let requests = this.requests.get(apiKey) || [];
    requests = requests.filter(time => time > windowStart);
    
    this.requests.set(apiKey, requests);
    
    return requests.length < this.maxRequests;
  }

  recordRequest(apiKey: string) {
    const requests = this.requests.get(apiKey) || [];
    requests.push(Date.now());
    this.requests.set(apiKey, requests);
  }
}

// Usage in API calls
const rateLimiter = new RateLimiter();

export async function makeServiceM8Request<T>(endpoint: string): Promise<T> {
  const apiKey = process.env.SERVICEM8_API_KEY!;
  
  if (!rateLimiter.canMakeRequest(apiKey)) {
    throw new Error('Rate limit exceeded');
  }

  try {
    const result = await sm8Client.get<T>(endpoint);
    rateLimiter.recordRequest(apiKey);
    return result;
  } catch (error) {
    if (error.status === 429) {
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 2000));
      return makeServiceM8Request<T>(endpoint);
    }
    throw error;
  }
}
```

---

## Webhook Integration

### Setting Up Webhooks

ServiceM8 Webhooks are commonly used for: Receiving scheduling changes, Updating item/material's prices

```typescript
// pages/api/webhooks/servicem8.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { event_type, object_uuid, object_type } = req.body;

  try {
    switch (event_type) {
      case 'job.updated':
        await handleJobUpdate(object_uuid);
        break;
      case 'attachment.created':
        await handleNewAttachment(object_uuid);
        break;
      case 'jobmaterial.updated':
        await handleMaterialUpdate(object_uuid);
        break;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleJobUpdate(jobUuid: string) {
  // Fetch updated job data from ServiceM8
  const updatedJob = await sm8Client.getJobDetails(jobUuid);
  
  // Update local cache
  await supabase
    .from('jobs')
    .upsert({
      ...updatedJob,
      synced_at: new Date().toISOString()
    });

  // Notify customer via WebSocket/email if status changed
  if (shouldNotifyCustomer(updatedJob)) {
    await sendCustomerNotification(updatedJob);
  }
}
```

---

## Error Handling

### Comprehensive Error Handling

```typescript
// lib/error-handler.ts
export enum ServiceM8ErrorCode {
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  RATE_LIMITED = 429,
  SERVER_ERROR = 500
}

export class ServiceM8ErrorHandler {
  static handle(error: ServiceM8Error): string {
    switch (error.status) {
      case ServiceM8ErrorCode.UNAUTHORIZED:
        return 'Invalid API credentials';
      case ServiceM8ErrorCode.FORBIDDEN:
        return 'Access denied to requested resource';
      case ServiceM8ErrorCode.NOT_FOUND:
        return 'Requested resource not found';
      case ServiceM8ErrorCode.RATE_LIMITED:
        return 'Rate limit exceeded, please try again later';
      case ServiceM8ErrorCode.SERVER_ERROR:
        return 'ServiceM8 server error, please try again';
      default:
        return 'An unexpected error occurred';
    }
  }

  static shouldRetry(error: ServiceM8Error): boolean {
    return [429, 500, 502, 503, 504].includes(error.status);
  }

  static getRetryDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff, max 30s
  }
}
```

---

## Complete Client Implementation

### Full Customer Portal API Service

```typescript
// services/customer-portal-api.ts
export class CustomerPortalAPI {
  private sm8Client: ServiceM8Client;
  private supabase: SupabaseClient;
  private rateLimiter: RateLimiter;

  constructor() {
    this.sm8Client = new ServiceM8Client(process.env.SERVICEM8_API_KEY!);
    this.supabase = createSupabaseClient();
    this.rateLimiter = new RateLimiter();
  }

  // Dashboard Data
  async getDashboardData(companyUuid: string): Promise<DashboardData> {
    // Try cache first
    const cachedData = await this.getCachedDashboard(companyUuid);
    if (cachedData && this.isCacheValid(cachedData.synced_at)) {
      return cachedData;
    }

    // Fetch from ServiceM8
    const [jobs, attachments] = await Promise.all([
      this.sm8Client.getCustomerJobs(companyUuid),
      this.getRecentAttachments(companyUuid)
    ]);

    const dashboardData = {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status !== 'Complete').length,
      recentActivity: this.formatRecentActivity(jobs, attachments),
      upcomingSchedule: await this.getUpcomingSchedule(companyUuid),
      pendingApprovals: jobs.filter(j => j.status === 'Quote').length
    };

    // Cache the results
    await this.cacheDashboardData(companyUuid, dashboardData);

    return dashboardData;
  }

  // Job Management
  async getJobsList(companyUuid: string, filters?: JobFilters): Promise<JobWithDetails[]> {
    let jobs = await this.sm8Client.getCustomerJobs(companyUuid);

    // Apply filters
    if (filters) {
      jobs = this.applyJobFilters(jobs, filters);
    }

    // Enrich with additional data
    const enrichedJobs = await Promise.all(
      jobs.map(async (job) => ({
        ...job,
        materials: await this.sm8Client.getJobMaterials(job.uuid),
        attachments: await this.sm8Client.getJobAttachments(job.uuid),
        activities: await this.getJobActivities(job.uuid)
      }))
    );

    return enrichedJobs;
  }

  // Document Management
  async getJobDocuments(jobUuid: string): Promise<DocumentWithMetadata[]> {
    const attachments = await this.sm8Client.getJobAttachments(jobUuid);
    
    return attachments.map(att => ({
      ...att,
      downloadUrl: `/api/documents/download/${att.uuid}`,
      previewUrl: this.getPreviewUrl(att),
      category: this.categorizeDocument(att)
    }));
  }

  async downloadDocument(attachmentUuid: string, companyUuid: string): Promise<Blob> {
    // Verify customer has access
    await this.verifyDocumentAccess(attachmentUuid, companyUuid);
    
    return this.sm8Client.downloadAttachment(attachmentUuid);
  }

  // Quote Approval
  async approveQuote(jobUuid: string, approvalData: QuoteApprovalData): Promise<boolean> {
    try {
      await this.sm8Client.approveQuote(jobUuid, {
        approved: true,
        approval_date: new Date().toISOString(),
        customer_signature: approvalData.signature,
        notes: approvalData.notes
      });

      // Update local cache
      await this.updateJobStatus(jobUuid, 'Work Order');
      
      // Send confirmation email
      await this.sendApprovalConfirmation(jobUuid);

      return true;
    } catch (error) {
      console.error('Quote approval failed:', error);
      return false;
    }
  }

  // Payment Tracking
  async getPaymentHistory(companyUuid: string): Promise<PaymentHistory[]> {
    const jobs = await this.sm8Client.getCustomerJobs(companyUuid);
    const invoiceJobs = jobs.filter(j => j.status === 'Invoice' || j.status === 'Complete');

    return invoiceJobs.map(job => ({
      jobNumber: job.job_number,
      description: job.job_description,
      amount: job.generated_job_total,
      status: this.getPaymentStatus(job),
      dueDate: this.calculateDueDate(job),
      paidDate: job.date_completed
    }));
  }

  // Private helper methods
  private isCacheValid(syncedAt: string): boolean {
    const cacheAge = Date.now() - new Date(syncedAt).getTime();
    return cacheAge < 5 * 60 * 1000; // 5 minutes
  }

  private async verifyDocumentAccess(attachmentUuid: string, companyUuid: string): Promise<void> {
    const attachment = await this.sm8Client.get<Attachment>(`/attachment/${attachmentUuid}.json`);
    const job = await this.sm8Client.getJobDetails(attachment.related_object_uuid);
    
    if (job.company_uuid !== companyUuid) {
      throw new Error('Access denied to document');
    }
  }

  private categorizeDocument(attachment: Attachment): DocumentCategory {
    switch (attachment.attachment_source) {
      case 'Quote': return 'quote';
      case 'Invoice': return 'invoice';
      case 'Photo': return 'photo';
      default: return 'document';
    }
  }
}

// Usage Example
const portalAPI = new CustomerPortalAPI();

export default portalAPI;
```

---

## Environment Configuration

### Required Environment Variables

```bash
# .env.local
SERVICEM8_API_KEY=your_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NEXTAUTH_SECRET=your_nextauth_secret
WEBHOOK_SECRET=your_webhook_verification_secret
```

---

## Testing Strategy

### API Testing Examples

```typescript
// __tests__/servicem8-client.test.ts
describe('ServiceM8 Client', () => {
  let client: ServiceM8Client;
  
  beforeEach(() => {
    client = new ServiceM8Client(process.env.TEST_API_KEY!);
  });

  test('should fetch customer jobs', async () => {
    const jobs = await client.getCustomerJobs('test-company-uuid');
    expect(jobs).toBeInstanceOf(Array);
    expect(jobs[0]).toHaveProperty('uuid');
    expect(jobs[0]).toHaveProperty('job_number');
  });

  test('should handle rate limiting', async () => {
    // Mock rate limit response
    const mockFetch = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 429 }));

    await expect(client.get('/job.json')).rejects.toThrow('Rate limit exceeded');
  });
});
```

This comprehensive guide provides everything needed to build a robust ServiceM8 customer portal integration, including authentication, data synchronization, error handling, and best practices for production deployment.