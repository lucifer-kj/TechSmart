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
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new ServiceM8Error(`ServiceM8 API Error ${response.status}`, response.status);
    }

    return response.json();
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new ServiceM8Error(`ServiceM8 API Error ${response.status}`, response.status);
    }

    return response.json();
  }

  // Customer Portal Specific Methods
  async getCustomerJobs(companyUuid: string): Promise<ServiceM8Job[]> {
    return this.get<ServiceM8Job[]>(`/job.json?$filter=company_uuid eq '${companyUuid}'`);
  }

  async getJobDetails(jobUuid: string): Promise<ServiceM8Job> {
    return this.get<ServiceM8Job>(`/job/${jobUuid}.json`);
  }

  async getJobMaterials(jobUuid: string): Promise<ServiceM8JobMaterial[]> {
    return this.get<ServiceM8JobMaterial[]>(`/jobmaterial.json?$filter=job_uuid eq '${jobUuid}'`);
  }

  async getJobAttachments(jobUuid: string): Promise<ServiceM8Attachment[]> {
    return this.get<ServiceM8Attachment[]>(`/attachment.json?$filter=related_object_uuid eq '${jobUuid}'`);
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
    return this.get<ServiceM8Company>(`/company/${companyUuid}.json`);
  }
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


