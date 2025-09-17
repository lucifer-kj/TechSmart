// ServiceM8 API Types
export interface ServiceM8Company {
  uuid: string;
  name: string;
  email: string;
  mobile: string;
  address: string;
  active: number;
  date_created: string;
  date_last_modified: string;
}

export interface ServiceM8Job {
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

export interface ServiceM8JobMaterial {
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

export interface ServiceM8Attachment {
  uuid: string;
  related_object_uuid: string;
  file_name: string;
  file_type: string;
  attachment_source: 'Quote' | 'Invoice' | 'Photo' | 'Document';
  date_created: string;
  file_size: number;
}

export interface ServiceM8JobActivity {
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

// ServiceM8 Error Class
export class ServiceM8Error extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ServiceM8Error";
    this.status = status;
  }
}

// ServiceM8 Client Class
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
    return this.fetchWithBackoff<T>(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.headers,
    });
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.fetchWithBackoff<T>(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data)
    });
  }

  // Customer Portal Specific Methods
  async getCustomerJobs(companyUuid: string): Promise<ServiceM8Job[]> {
    return this.get<ServiceM8Job[]>(`/job.json?$filter=company_uuid eq '${companyUuid}'`);
  }

  async getJobDetails(jobUuid: string): Promise<ServiceM8Job> {
    return this.getWithCache<ServiceM8Job>(`sm8:job:${jobUuid}`, `/job/${jobUuid}.json`, 300);
  }

  async getJobMaterials(jobUuid: string): Promise<ServiceM8JobMaterial[]> {
    return this.getWithCache<ServiceM8JobMaterial[]>(`sm8:jobmaterials:${jobUuid}`, `/jobmaterial.json?$filter=job_uuid eq '${jobUuid}'`, 300);
  }

  async getJobAttachments(jobUuid: string): Promise<ServiceM8Attachment[]> {
    return this.getWithCache<ServiceM8Attachment[]>(`sm8:attachments:${jobUuid}`, `/attachment.json?$filter=related_object_uuid eq '${jobUuid}'`, 300);
  }

  async downloadAttachment(attachmentUuid: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/attachment/${attachmentUuid}.json?$attachment`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new ServiceM8Error(`ServiceM8 API Error ${response.status}`, response.status);
    }

    return response.blob();
  }

  async approveQuote(jobUuid: string, approvalData: QuoteApproval): Promise<unknown> {
    return this.post(`/job/${jobUuid}/approve.json`, approvalData);
  }

  async getCompany(companyUuid: string): Promise<ServiceM8Company> {
    return this.getWithCache<ServiceM8Company>(`sm8:company:${companyUuid}`, `/company/${companyUuid}.json`, 1800);
  }

  async addJobNote(jobUuid: string, noteData: { note: string; note_type?: string }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/job/${jobUuid}/note.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.apiKey}:`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        note: noteData.note,
        note_type: noteData.note_type || 'general'
      })
    });

    if (!response.ok) {
      throw new ServiceM8Error(`Failed to add job note: ${response.statusText}`, response.status);
    }
  }

  async acknowledgeDocument(documentUuid: string, acknowledgmentData: {
    acknowledged: boolean;
    acknowledgment_date: string;
    customer_signature?: string;
    notes?: string;
  }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/attachment/${documentUuid}/acknowledge.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.apiKey}:`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(acknowledgmentData)
    });

    if (!response.ok) {
      throw new ServiceM8Error(`Failed to acknowledge document: ${response.statusText}`, response.status);
    }
  }

  async updateJobStatus(jobUuid: string, status: string, notes?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/job/${jobUuid}.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${btoa(`${this.apiKey}:`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        notes: notes || undefined
      })
    });

    if (!response.ok) {
      throw new ServiceM8Error(`Failed to update job status: ${response.statusText}`, response.status);
    }
  }

  async getJobNotes(jobUuid: string): Promise<Array<{
    uuid: string;
    note: string;
    note_type: string;
    date_created: string;
    created_by?: string;
  }>> {
    return this.get<Array<{
      uuid: string;
      note: string;
      note_type: string;
      date_created: string;
      created_by?: string;
    }>>(`/job/${jobUuid}/note.json`);
  }

  // Helpers moved into the class to avoid prototype augmentation and `any` casts
  private async fetchWithBackoff<T>(url: string, init: RequestInit, retries = 4): Promise<T> {
    let attempt = 0;
    let lastError: unknown;
    while (attempt <= retries) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const resp = await fetch(url, { ...init, signal: controller.signal });
        clearTimeout(timeout);
        if (!resp.ok) throw new ServiceM8Error(`ServiceM8 API Error ${resp.status}`, resp.status);
        return (await resp.json()) as T;
      } catch (err) {
        lastError = err;
        const base = 300;
        const delay = Math.min(2000, base * Math.pow(2, attempt)) + Math.random() * 100;
        await new Promise(r => setTimeout(r, delay));
        attempt += 1;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('ServiceM8 request failed');
  }

  private async getWithCache<T>(cacheKey: string, endpoint: string, ttlSeconds: number): Promise<T> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      type RpcResult<D> = { data: D | null; error: { message: string } | null };

      const { data: cached } = await (supabase as unknown as {
        rpc<D = unknown>(fn: string, args: Record<string, unknown>): Promise<RpcResult<D>>;
      }).rpc('cache_get', { p_key: cacheKey });

      if (cached) {
        return cached as T;
      }

      const fresh = await this.get<T>(endpoint);

      await (supabase as unknown as {
        rpc<D = unknown>(fn: string, args: { p_key: string; p_value: unknown; p_ttl_seconds: number }): Promise<RpcResult<D>>;
      }).rpc('cache_put', { p_key: cacheKey, p_value: fresh, p_ttl_seconds: ttlSeconds });

      return fresh;
    } catch {
      return this.get<T>(endpoint);
    }
  }
}

// Backoff + caching helpers
export type BackoffInit = RequestInit;

export class ServiceM8ClientHelpers {}

export interface CachePutArgs {
  p_key: string;
  p_value: unknown;
  p_ttl_seconds: number;
}

// Rate Limiter
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

// Utility function for making ServiceM8 requests with rate limiting
export async function makeServiceM8Request<T>(endpoint: string, apiKey: string): Promise<T> {
  const rateLimiter = new RateLimiter();
  
  if (!rateLimiter.canMakeRequest(apiKey)) {
    throw new ServiceM8Error('Rate limit exceeded', 429);
  }

  try {
    const client = new ServiceM8Client(apiKey);
    const result = await client.get<T>(endpoint);
    rateLimiter.recordRequest(apiKey);
    return result;
  } catch (error) {
    if (error instanceof ServiceM8Error && error.status === 429) {
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 2000));
      return makeServiceM8Request<T>(endpoint, apiKey);
    }
    throw error;
  }
}

// Legacy function for backward compatibility
export async function getJobsForCustomer(options: {
  accessToken?: string;
  customerId: string;
}): Promise<ServiceM8Job[]> {
  const apiKey = process.env.SERVICEM8_API_KEY;
  
  if (!apiKey) {
    // Return mock data for development
    return [
      {
        uuid: "job-123",
        job_number: "ST-1001",
        company_uuid: options.customerId,
        job_description: "Aircon maintenance",
        status: "Work Order",
        generated_job_total: 150.00,
        job_address: "123 Main St, Sydney",
        date_created: new Date().toISOString(),
        date_last_modified: new Date().toISOString(),
      },
      {
        uuid: "job-456",
        job_number: "ST-1002",
        company_uuid: options.customerId,
        job_description: "Sensor install",
        status: "Quote",
        generated_job_total: 200.00,
        job_address: "456 Oak Ave, Melbourne",
        date_created: new Date().toISOString(),
        date_last_modified: new Date().toISOString(),
      },
    ];
  }

  try {
    const client = new ServiceM8Client(apiKey);
    return await client.getCustomerJobs(options.customerId);
  } catch (error) {
    console.error('ServiceM8 API Error:', error);
    throw error;
  }
}


