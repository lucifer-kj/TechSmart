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

// ServiceM8 Error Class with enhanced error normalization
export class ServiceM8Error extends Error {
  status?: number;
  code?: string;
  retryable: boolean;
  details?: unknown;
  
  constructor(message: string, status?: number, code?: string, retryable = false, details?: unknown) {
    super(message);
    this.name = "ServiceM8Error";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }

  // Normalize ServiceM8 API errors into consistent format
  static fromResponse(response: Response, body?: unknown): ServiceM8Error {
    const status = response.status;
    let message = `ServiceM8 API Error ${status}`;
    let code = `HTTP_${status}`;
    let retryable = false;
    const details = body;

    // Map HTTP status codes to normalized error types
    switch (status) {
      case 400:
        message = 'Bad Request - Invalid parameters';
        code = 'BAD_REQUEST';
        break;
      case 401:
        message = 'Unauthorized - Invalid API key';
        code = 'UNAUTHORIZED';
        break;
      case 403:
        message = 'Forbidden - Insufficient permissions';
        code = 'FORBIDDEN';
        break;
      case 404:
        message = 'Not Found - Resource does not exist';
        code = 'NOT_FOUND';
        break;
      case 429:
        message = 'Rate Limit Exceeded';
        code = 'RATE_LIMITED';
        retryable = true;
        break;
      case 500:
        message = 'Internal Server Error';
        code = 'SERVER_ERROR';
        retryable = true;
        break;
      case 502:
      case 503:
      case 504:
        message = 'Service Unavailable';
        code = 'SERVICE_UNAVAILABLE';
        retryable = true;
        break;
    }

    return new ServiceM8Error(message, status, code, retryable, details);
  }
}

// ServiceM8 Client Class with enhanced retry logic and timeout handling
export class ServiceM8Client {
  private baseUrl = 'https://api.servicem8.com/api_1.0';
  private apiKey: string;
  private defaultTimeout = 30000; // 30 seconds
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second base delay

  constructor(apiKey: string, options?: {
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
  }) {
    this.apiKey = apiKey;
    if (options) {
      this.defaultTimeout = options.timeout || this.defaultTimeout;
      this.maxRetries = options.maxRetries || this.maxRetries;
      this.retryDelay = options.retryDelay || this.retryDelay;
    }
  }

  private get headers(): Record<string, string> {
    return {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async get<T>(endpoint: string, options?: {
    timeout?: number;
    idempotencyKey?: string;
  }): Promise<T> {
    const headers = { ...this.headers };
    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    return this.fetchWithRetry<T>(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers,
    }, options?.timeout);
  }

  async post<T>(endpoint: string, data: unknown, options?: {
    timeout?: number;
    idempotencyKey?: string;
  }): Promise<T> {
    const headers = { ...this.headers };
    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    return this.fetchWithRetry<T>(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    }, options?.timeout);
  }

  async put<T>(endpoint: string, data: unknown, options?: {
    timeout?: number;
    idempotencyKey?: string;
  }): Promise<T> {
    const headers = { ...this.headers };
    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    return this.fetchWithRetry<T>(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    }, options?.timeout);
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

  async approveQuote(jobUuid: string, approvalData: QuoteApproval, idempotencyKey?: string): Promise<unknown> {
    return this.post(`/job/${jobUuid}/approve.json`, approvalData, { idempotencyKey });
  }

  async getCompany(companyUuid: string): Promise<ServiceM8Company> {
    return this.getWithCache<ServiceM8Company>(`sm8:company:${companyUuid}`, `/company/${companyUuid}.json`, 1800);
  }

  async addJobNote(jobUuid: string, noteData: { note: string; note_type?: string }, idempotencyKey?: string): Promise<void> {
    await this.post(`/job/${jobUuid}/note.json`, {
      note: noteData.note,
      note_type: noteData.note_type || 'general'
    }, { idempotencyKey });
  }

  async acknowledgeDocument(documentUuid: string, acknowledgmentData: {
    acknowledged: boolean;
    acknowledgment_date: string;
    customer_signature?: string;
    notes?: string;
  }, idempotencyKey?: string): Promise<void> {
    await this.post(`/attachment/${documentUuid}/acknowledge.json`, acknowledgmentData, { idempotencyKey });
  }

  async updateJobStatus(jobUuid: string, status: string, notes?: string, idempotencyKey?: string): Promise<void> {
    await this.put(`/job/${jobUuid}.json`, {
      status,
      notes: notes || undefined
    }, { idempotencyKey });
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

  // Enhanced retry logic with exponential backoff and proper error handling
  private async fetchWithRetry<T>(url: string, init: RequestInit, timeoutMs?: number): Promise<T> {
    const timeout = timeoutMs || this.defaultTimeout;
    let lastError: ServiceM8Error | null = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, { 
          ...init, 
          signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          let responseBody: unknown;
          try {
            responseBody = await response.json();
          } catch {
            responseBody = await response.text();
          }
          
          const error = ServiceM8Error.fromResponse(response, responseBody);
          
          // Only retry if error is retryable and we haven't exceeded max retries
          if (error.retryable && attempt < this.maxRetries) {
            lastError = error;
            const delay = this.calculateRetryDelay(attempt);
            await this.sleep(delay);
            continue;
          }
          
          throw error;
        }
        
        return (await response.json()) as T;
        
      } catch (error) {
        if (error instanceof ServiceM8Error) {
          lastError = error;
          
          // Don't retry non-retryable errors
          if (!error.retryable || attempt >= this.maxRetries) {
            throw error;
          }
          
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
          continue;
        }
        
        // Handle network errors, timeouts, etc.
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new ServiceM8Error('Request timeout', 408, 'TIMEOUT', true);
          }
          
          // Network errors are retryable
          if (attempt < this.maxRetries) {
            lastError = new ServiceM8Error(
              `Network error: ${error.message}`, 
              0, 
              'NETWORK_ERROR', 
              true
            );
            const delay = this.calculateRetryDelay(attempt);
            await this.sleep(delay);
            continue;
          }
          
          throw new ServiceM8Error(`Network error: ${error.message}`, 0, 'NETWORK_ERROR', false);
        }
        
        throw new ServiceM8Error('Unknown error occurred', 0, 'UNKNOWN_ERROR', false);
      }
    }
    
    throw lastError || new ServiceM8Error('Request failed after all retries', 0, 'MAX_RETRIES_EXCEEDED', false);
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.retryDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return Math.min(baseDelay + jitter, 10000); // Cap at 10 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

// Utility functions for ServiceM8 operations
export function generateIdempotencyKey(operation: string, identifier: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${operation}-${identifier}-${timestamp}-${random}`;
}

export async function makeServiceM8Request<T>(endpoint: string, apiKey: string, options?: {
  timeout?: number;
  idempotencyKey?: string;
}): Promise<T> {
  const rateLimiter = new RateLimiter();
  
  if (!rateLimiter.canMakeRequest(apiKey)) {
    throw new ServiceM8Error('Rate limit exceeded', 429, 'RATE_LIMITED', true);
  }

  try {
    const client = new ServiceM8Client(apiKey);
    const result = await client.get<T>(endpoint, options);
    rateLimiter.recordRequest(apiKey);
    return result;
  } catch (error) {
    if (error instanceof ServiceM8Error && error.status === 429) {
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 2000));
      return makeServiceM8Request<T>(endpoint, apiKey, options);
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


