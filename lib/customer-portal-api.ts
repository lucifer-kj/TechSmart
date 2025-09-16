import { createClient } from '@supabase/supabase-js';
import { ServiceM8Client, ServiceM8Job, ServiceM8JobMaterial, ServiceM8Attachment } from './servicem8';
import { SyncService } from './sync-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface DashboardData {
  totalJobs: number;
  activeJobs: number;
  recentActivity: unknown[];
  upcomingSchedule: unknown[];
  pendingApprovals: number;
  totalValue: number;
}

export interface JobWithDetails extends ServiceM8Job {
  materials: ServiceM8JobMaterial[];
  attachments: ServiceM8Attachment[];
  activities?: unknown[];
}

export interface DocumentWithMetadata extends ServiceM8Attachment {
  downloadUrl: string;
  previewUrl?: string;
  category: 'quote' | 'invoice' | 'photo' | 'document';
}

export interface PaymentHistory {
  jobNumber: string;
  description: string;
  amount: number;
  status: string;
  dueDate?: string;
  paidDate?: string;
}

export class CustomerPortalAPI {
  private sm8Client: ServiceM8Client;
  private supabase: typeof supabase;
  private syncService: SyncService;

  constructor() {
    const apiKey = process.env.SERVICEM8_API_KEY;
    if (!apiKey) {
      throw new Error('ServiceM8 API key not configured');
    }
    
    this.sm8Client = new ServiceM8Client(apiKey);
    this.supabase = supabase;
    this.syncService = new SyncService(apiKey);
  }

  // Dashboard Data
  async getDashboardData(companyUuid: string): Promise<DashboardData> {
    try {
      // Try cache first
      const customer = await this.getCustomerByServiceM8Uuid(companyUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const isCacheValid = await this.syncService.isCacheValid(customer.id);
      
      if (!isCacheValid) {
        // Sync fresh data
        await this.syncService.syncCustomerData(companyUuid);
      }

      // Get cached data
      const jobs = await this.syncService.getCachedJobs(customer.id);
      
      const dashboardData: DashboardData = {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(j => j.status !== 'Complete' && j.status !== 'Cancelled').length,
        recentActivity: this.formatRecentActivity(jobs),
        upcomingSchedule: await this.getUpcomingSchedule(customer.id),
        pendingApprovals: jobs.filter(j => j.status === 'Quote').length,
        totalValue: jobs.reduce((sum, job) => sum + (job.generated_job_total || 0), 0)
      };

      return dashboardData;
    } catch (error) {
      console.error('Dashboard data error:', error);
      throw error;
    }
  }

  // Job Management
  async getJobsList(companyUuid: string, filters?: Record<string, unknown>): Promise<JobWithDetails[]> {
    try {
      const customer = await this.getCustomerByServiceM8Uuid(companyUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      let jobs = await this.syncService.getCachedJobs(customer.id);

      // Apply filters
      if (filters) {
        jobs = this.applyJobFilters(jobs, filters);
      }

      // Enrich with additional data
      const enrichedJobs = await Promise.all(
        jobs.map(async (job) => ({
          ...job,
          materials: job.job_materials || [],
          attachments: job.documents || [],
          activities: [] // TODO: Implement job activities
        }))
      );

      return enrichedJobs;
    } catch (error) {
      console.error('Jobs list error:', error);
      throw error;
    }
  }

  // Document Management
  async getJobDocuments(jobUuid: string): Promise<DocumentWithMetadata[]> {
    try {
      const attachments = await this.sm8Client.getJobAttachments(jobUuid);
      
      return attachments.map(att => ({
        ...att,
        downloadUrl: `/api/servicem8/attachments/${att.uuid}`,
        previewUrl: this.getPreviewUrl(att),
        category: this.categorizeDocument(att)
      }));
    } catch (error) {
      console.error('Document fetch error:', error);
      throw error;
    }
  }

  async downloadDocument(attachmentUuid: string, companyUuid: string): Promise<Blob> {
    try {
      // Verify customer has access
      await this.verifyDocumentAccess(attachmentUuid, companyUuid);
      
      return this.sm8Client.downloadAttachment(attachmentUuid);
    } catch (error) {
      console.error('Document download error:', error);
      throw error;
    }
  }

  // Quote Approval
  async approveQuote(jobUuid: string, approvalData: Record<string, unknown>): Promise<boolean> {
    try {
      await this.sm8Client.approveQuote(jobUuid, {
        approved: true,
        approval_date: new Date().toISOString(),
        customer_signature: approvalData.signature as string,
        notes: approvalData.notes as string
      });

      // Update local cache
      await this.updateJobStatus(jobUuid, 'Work Order');
      
      // Send confirmation email (TODO: Implement)
      // await this.sendApprovalConfirmation(jobUuid);

      return true;
    } catch (error) {
      console.error('Quote approval failed:', error);
      return false;
    }
  }

  // Payment Tracking
  async getPaymentHistory(companyUuid: string): Promise<PaymentHistory[]> {
    try {
      const customer = await this.getCustomerByServiceM8Uuid(companyUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const jobs = await this.syncService.getCachedJobs(customer.id);
      const invoiceJobs = jobs.filter(j => j.status === 'Invoice' || j.status === 'Complete');

      return invoiceJobs.map(job => ({
        jobNumber: job.job_no || '',
        description: job.description || '',
        amount: job.generated_job_total || 0,
        status: this.getPaymentStatus(job),
        dueDate: this.calculateDueDate(job),
        paidDate: job.date_completed
      }));
    } catch (error) {
      console.error('Payment history error:', error);
      throw error;
    }
  }

  // Private helper methods
  private async getCustomerByServiceM8Uuid(companyUuid: string) {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('servicem8_customer_uuid', companyUuid)
      .single();

    if (error) {
      console.error('Customer lookup error:', error);
      return null;
    }

    return data;
  }

  private formatRecentActivity(jobs: unknown[]): unknown[] {
    return jobs
      .sort((a, b) => {
        const aJob = a as { updated?: string; created_at: string };
        const bJob = b as { updated?: string; created_at: string };
        return new Date(bJob.updated || bJob.created_at).getTime() - new Date(aJob.updated || aJob.created_at).getTime();
      })
      .slice(0, 5)
      .map(job => {
        const jobData = job as { job_no?: string; description?: string; status?: string; updated?: string; created_at: string };
        return {
          type: 'job_update',
          jobNumber: jobData.job_no,
          description: jobData.description,
          status: jobData.status,
          date: jobData.updated || jobData.created_at
        };
      });
  }

  private async getUpcomingSchedule(customerId: string): Promise<unknown[]> {
    // TODO: Implement job activities/scheduling
    return [];
  }

  private applyJobFilters(jobs: unknown[], filters: Record<string, unknown>): unknown[] {
    let filteredJobs = jobs;

    if (filters.status) {
      filteredJobs = filteredJobs.filter(job => {
        const jobData = job as { status?: string };
        return jobData.status === filters.status;
      });
    }

    if (filters.dateFrom) {
      filteredJobs = filteredJobs.filter(job => {
        const jobData = job as { created_at: string };
        return new Date(jobData.created_at) >= new Date(filters.dateFrom as string);
      });
    }

    if (filters.dateTo) {
      filteredJobs = filteredJobs.filter(job => {
        const jobData = job as { created_at: string };
        return new Date(jobData.created_at) <= new Date(filters.dateTo as string);
      });
    }

    return filteredJobs;
  }

  private async verifyDocumentAccess(attachmentUuid: string, companyUuid: string): Promise<void> {
    const attachment = await this.sm8Client.get<ServiceM8Attachment>(`/attachment/${attachmentUuid}.json`);
    const job = await this.sm8Client.getJobDetails(attachment.related_object_uuid);
    
    if (job.company_uuid !== companyUuid) {
      throw new Error('Access denied to document');
    }
  }

  private categorizeDocument(attachment: ServiceM8Attachment): 'quote' | 'invoice' | 'photo' | 'document' {
    switch (attachment.attachment_source) {
      case 'Quote': return 'quote';
      case 'Invoice': return 'invoice';
      case 'Photo': return 'photo';
      default: return 'document';
    }
  }

  private getPreviewUrl(_attachment: ServiceM8Attachment): string | undefined {
    // TODO: Implement preview URL generation for images/PDFs
    return undefined;
  }

  private async updateJobStatus(jobUuid: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from('jobs')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('servicem8_job_uuid', jobUuid);

    if (error) throw error;
  }

  private getPaymentStatus(job: unknown): string {
    const jobData = job as { status?: string };
    if (jobData.status === 'Complete') return 'Paid';
    if (jobData.status === 'Invoice') return 'Pending';
    return 'Unknown';
  }

  private calculateDueDate(_job: unknown): string | undefined {
    // TODO: Implement due date calculation logic
    return undefined;
  }
}

// Export singleton instance
export const customerPortalAPI = new CustomerPortalAPI();
