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

  constructor(options?: {
    apiKey?: string;
    cacheMaxAge?: number;
  }) {
    const apiKey = options?.apiKey || process.env.SERVICEM8_API_KEY;
    if (!apiKey) {
      throw new Error('ServiceM8 API key not configured');
    }
    
    // Initialize with default base URL - will be updated when config is fetched
    this.sm8Client = new ServiceM8Client(apiKey, {
      baseUrl: 'https://api.servicem8.com/api_1.0',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000
    });
    this.supabase = supabase;
    this.syncService = new SyncService(apiKey, {
      cacheMaxAge: options?.cacheMaxAge || 5
    });
  }

  // Dashboard Data with enhanced error handling and refresh support
  async getDashboardData(companyUuid: string, options?: {
    refresh?: boolean;
    maxAge?: number;
  }): Promise<DashboardData> {
    try {
      const customer = await this.getCustomerByServiceM8Uuid(companyUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Use read-through cache with optional refresh
      const jobs = await this.syncService.getCachedJobs(customer.id, {
        refresh: options?.refresh || false,
        maxAge: options?.maxAge
      });
      
      const dashboardData: DashboardData = {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(j => j.status !== 'Complete' && j.status !== 'Cancelled').length,
        recentActivity: this.formatRecentActivity(jobs),
        upcomingSchedule: await this.getUpcomingSchedule(customer.id),
        pendingApprovals: jobs.filter(j => j.status === 'Quote').length,
        totalValue: jobs.reduce((sum, job) => sum + (Number(job.generated_job_total) || 0), 0)
      };

      return dashboardData;
    } catch (error) {
      console.error('Dashboard data error:', error);
      // Return partial data with error flag for graceful degradation
      return {
        totalJobs: 0,
        activeJobs: 0,
        recentActivity: [],
        upcomingSchedule: [],
        pendingApprovals: 0,
        totalValue: 0
      };
    }
  }

  // Job Management with enhanced error handling and refresh support
  async getJobsList(companyUuid: string, options?: {
    filters?: Record<string, unknown>;
    refresh?: boolean;
    maxAge?: number;
  }): Promise<JobWithDetails[]> {
    try {
      const customer = await this.getCustomerByServiceM8Uuid(companyUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Use read-through cache with optional refresh
      let jobs = await this.syncService.getCachedJobs(customer.id, {
        refresh: options?.refresh || false,
        maxAge: options?.maxAge
      });

      // Apply filters
      if (options?.filters) {
        jobs = this.applyJobFilters(jobs, options.filters) as Record<string, unknown>[];
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

      return enrichedJobs as unknown as JobWithDetails[];
    } catch (error) {
      console.error('Jobs list error:', error);
      // Return empty array for graceful degradation
      return [];
    }
  }

  // Document Management with enhanced error handling and refresh support
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
      // Return empty array for graceful degradation
      return [];
    }
  }

  // New method: Get documents using read-through cache
  async getCachedDocuments(companyUuid: string, options?: {
    refresh?: boolean;
    maxAge?: number;
    jobId?: string;
  }): Promise<DocumentWithMetadata[]> {
    try {
      const customer = await this.getCustomerByServiceM8Uuid(companyUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const documents = await this.syncService.getCachedDocuments(customer.id, {
        refresh: options?.refresh || false,
        maxAge: options?.maxAge,
        jobId: options?.jobId
      });

      return documents.map(doc => {
        const metadata = (doc.metadata as Record<string, unknown>) || {};
        return {
          uuid: String(doc.servicem8_attachment_uuid || doc.uuid),
          edit_date: String(doc.date_created_sm8 || doc.created_at),
          active: Number(metadata.active) || 1,
          attachment_name: String(doc.file_name || doc.title),
          file_type: String(doc.file_type),
          photo_width: String(metadata.photo_width || ''),
          photo_height: String(metadata.photo_height || ''),
          attachment_source: String(doc.attachment_source || doc.type),
          lng: Number(metadata.lng) || 0,
          lat: Number(metadata.lat) || 0,
          tags: String(metadata.tags || ''),
          extracted_info: String(metadata.extracted_info || ''),
          is_favourite: String(metadata.is_favourite || '0'),
          metadata: Boolean(metadata.metadata) || false,
          created_by_staff_uuid: String(metadata.created_by_staff_uuid || ''),
          timestamp: String(metadata.timestamp || doc.created_at),
          related_object: String(metadata.related_object || 'job'),
          related_object_uuid: String(doc.job_id),
          
          // Legacy fields for backward compatibility
          file_name: String(doc.file_name || doc.title),
          file_size: Number(doc.file_size) || 0,
          date_created: String(doc.date_created_sm8 || doc.created_at),
          url: String(doc.url || `/api/servicem8/attachments/${doc.servicem8_attachment_uuid}`),
          
          // DocumentWithMetadata specific fields
          downloadUrl: String(doc.url || `/api/servicem8/attachments/${doc.servicem8_attachment_uuid}`),
          previewUrl: this.getPreviewUrlFromType(String(doc.file_type)),
          category: this.categorizeDocumentFromType(String(doc.type || doc.attachment_source))
        };
      });
    } catch (error) {
      console.error('Cached documents error:', error);
      return [];
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

  // Quote Approval with write-back pattern
  async approveQuote(jobUuid: string, approvalData: Record<string, unknown>): Promise<boolean> {
    try {
      // Use write-back pattern: persist intent in Supabase first, then call ServiceM8
      const result = await this.syncService.writeBackQuoteApproval(jobUuid, {
        approved: true,
        approval_date: new Date().toISOString(),
        customer_signature: approvalData.signature as string,
        notes: approvalData.notes as string
      });

      if (result.success) {
        // Update local cache
        await this.updateJobStatus(jobUuid, 'Work Order');
        // Send confirmation email (TODO: Implement)
        // await this.sendApprovalConfirmation(jobUuid);
        return true;
      } else {
        console.error('Quote approval failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Quote approval error:', error);
      return false;
    }
  }

  // Payment Tracking
  // Payment Management with enhanced error handling and refresh support
  async getPaymentHistory(companyUuid: string, options?: {
    refresh?: boolean;
    maxAge?: number;
  }): Promise<PaymentHistory[]> {
    try {
      const customer = await this.getCustomerByServiceM8Uuid(companyUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Use read-through cache for payments
      const jobs = await this.syncService.getCachedPayments(customer.id, {
        refresh: options?.refresh || false,
        maxAge: options?.maxAge
      });

      return jobs.map(job => ({
        jobNumber: String(job.job_no || ''),
        description: String(job.description || ''),
        amount: Number(job.generated_job_total) || 0,
        status: this.getPaymentStatus(job),
        dueDate: this.calculateDueDate(job),
        paidDate: job.date_completed as string | undefined
      }));
    } catch (error) {
      console.error('Payment history error:', error);
      // Return empty array for graceful degradation
      return [];
    }
  }

  // Document Acknowledgment
  async acknowledgeDocument(
    documentId: string, 
    acknowledgmentData: {
      signature: string;
      notes?: string;
      acknowledgedBy: string;
      acknowledgedAt: string;
    },
    companyUuid: string
  ): Promise<boolean> {
    try {
      // Verify customer has access to this document
      await this.verifyDocumentAccess(documentId, companyUuid);

      // Store acknowledgment in Supabase
      const { error } = await this.supabase
        .from('document_acknowledgments')
        .insert({
          document_id: documentId,
          customer_id: (await this.getCustomerByServiceM8Uuid(companyUuid))?.id,
          signature: acknowledgmentData.signature,
          notes: acknowledgmentData.notes,
          acknowledged_by: acknowledgmentData.acknowledgedBy,
          acknowledged_at: acknowledgmentData.acknowledgedAt,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Optional: Sync acknowledgment to ServiceM8 as a job note
      // This could be implemented if ServiceM8 supports document acknowledgments
      
      return true;
    } catch (error) {
      console.error('Document acknowledgment error:', error);
      return false;
    }
  }

  // Get document acknowledgment status
  async getDocumentAcknowledgment(documentId: string, companyUuid: string) {
    try {
      const customer = await this.getCustomerByServiceM8Uuid(companyUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const { data, error } = await this.supabase
        .from('document_acknowledgments')
        .select('*')
        .eq('document_id', documentId)
        .eq('customer_id', customer.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Get acknowledgment error:', error);
      return null;
    }
  }

  // Customer Feedback
  async submitFeedback(
    jobId: string,
    feedbackData: {
      feedback: string;
      rating: number;
      feedbackType: 'general' | 'complaint' | 'compliment' | 'suggestion';
      submittedAt: string;
    },
    companyUuid: string
  ): Promise<boolean> {
    try {
      const customer = await this.getCustomerByServiceM8Uuid(companyUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Store feedback in Supabase
      const { error } = await this.supabase
        .from('customer_feedback')
        .insert({
          job_id: jobId,
          customer_id: customer.id,
          feedback: feedbackData.feedback,
          rating: feedbackData.rating,
          feedback_type: feedbackData.feedbackType,
          submitted_at: feedbackData.submittedAt,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Optional: Sync feedback to ServiceM8 as a job note
      try {
        await this.sm8Client.addJobNote(jobId, {
          note: `Customer Feedback (${feedbackData.feedbackType}): ${feedbackData.feedback}`,
          note_type: 'customer_feedback'
        });
      } catch (sm8Error) {
        console.warn('Failed to sync feedback to ServiceM8:', sm8Error);
        // Don't fail the whole operation if ServiceM8 sync fails
      }

      return true;
    } catch (error) {
      console.error('Feedback submission error:', error);
      return false;
    }
  }

  // Get customer feedback for a job
  async getJobFeedback(jobId: string, companyUuid: string) {
    try {
      const customer = await this.getCustomerByServiceM8Uuid(companyUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const { data, error } = await this.supabase
        .from('customer_feedback')
        .select('*')
        .eq('job_id', jobId)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get feedback error:', error);
      return [];
    }
  }

  // Document Download Tracking
  async trackDocumentDownload(
    documentId: string,
    companyUuid: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      downloadSource?: string;
    }
  ): Promise<void> {
    try {
      const customer = await this.getCustomerByServiceM8Uuid(companyUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Store download record in Supabase
      const { error } = await this.supabase
        .from('document_downloads')
        .insert({
          document_id: documentId,
          customer_id: customer.id,
          downloaded_at: new Date().toISOString(),
          ip_address: metadata?.ipAddress,
          user_agent: metadata?.userAgent,
          download_source: metadata?.downloadSource || 'portal'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Download tracking error:', error);
      // Don't throw error to avoid breaking the download flow
    }
  }

  // Get document download history
  async getDocumentDownloadHistory(documentId: string, companyUuid: string) {
    try {
      const customer = await this.getCustomerByServiceM8Uuid(companyUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const { data, error } = await this.supabase
        .from('document_downloads')
        .select('*')
        .eq('document_id', documentId)
        .eq('customer_id', customer.id)
        .order('downloaded_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get download history error:', error);
      return [];
    }
  }

  // Payment Status Tracking
  async updatePaymentStatus(
    paymentId: string,
    newStatus: string,
    companyUuid: string,
    metadata?: {
      updatedBy?: string;
      notes?: string;
    }
  ): Promise<boolean> {
    try {
      const customer = await this.getCustomerByServiceM8Uuid(companyUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Get current payment status
      const { data: currentPayment, error: fetchError } = await this.supabase
        .from('payments')
        .select('status, job_id')
        .eq('id', paymentId)
        .eq('customer_id', customer.id)
        .single();

      if (fetchError) throw fetchError;

      // Update payment status
      const { error: updateError } = await this.supabase
        .from('payments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .eq('customer_id', customer.id);

      if (updateError) throw updateError;

      // The trigger will automatically create a status tracking record
      // But we can also manually insert one for more detailed tracking
      const { error: trackingError } = await this.supabase
        .from('payment_status_updates')
        .insert({
          payment_id: paymentId,
          customer_id: customer.id,
          job_id: currentPayment.job_id,
          previous_status: currentPayment.status,
          new_status: newStatus,
          updated_by: metadata?.updatedBy || 'customer',
          notes: metadata?.notes
        });

      if (trackingError) {
        console.warn('Failed to create payment status tracking record:', trackingError);
        // Don't fail the whole operation
      }

      return true;
    } catch (error) {
      console.error('Payment status update error:', error);
      return false;
    }
  }

  // Get payment status history
  async getPaymentStatusHistory(paymentId: string, companyUuid: string) {
    try {
      const customer = await this.getCustomerByServiceM8Uuid(companyUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const { data, error } = await this.supabase
        .from('payment_status_updates')
        .select('*')
        .eq('payment_id', paymentId)
        .eq('customer_id', customer.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get payment status history error:', error);
      return [];
    }
  }

  // Get payment status summary
  async getPaymentStatusSummary(companyUuid: string) {
    try {
      const customer = await this.getCustomerByServiceM8Uuid(companyUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const { data, error } = await this.supabase
        .from('payments')
        .select('status, amount_cents, currency')
        .eq('customer_id', customer.id);

      if (error) throw error;

      // Group by status and calculate totals
      const summary = data.reduce((acc: Record<string, { count: number; total: number }>, payment) => {
        const status = payment.status;
        if (!acc[status]) {
          acc[status] = { count: 0, total: 0 };
        }
        acc[status].count += 1;
        acc[status].total += payment.amount_cents || 0;
        return acc;
      }, {});

      return summary;
    } catch (error) {
      console.error('Get payment status summary error:', error);
      return {};
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
    // Reference the parameter to avoid unused-var warnings until implemented
    void customerId;
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

  private categorizeDocumentFromType(type: string): 'quote' | 'invoice' | 'photo' | 'document' {
    switch (type.toLowerCase()) {
      case 'quote': return 'quote';
      case 'invoice': return 'invoice';
      case 'photo': return 'photo';
      default: return 'document';
    }
  }

  private getPreviewUrlFromType(fileType: string): string | undefined {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const extension = fileType.toLowerCase().split('.').pop();
    
    if (extension && imageTypes.includes(extension)) {
      return `/api/servicem8/attachments/preview/${fileType}`;
    }
    
    return undefined;
  }

  private normalizeAttachmentSource(source: string): 'Quote' | 'Invoice' | 'Photo' | 'Document' {
    const normalized = source.toLowerCase();
    switch (normalized) {
      case 'quote': return 'Quote';
      case 'invoice': return 'Invoice';
      case 'photo': return 'Photo';
      default: return 'Document';
    }
  }

  private getPreviewUrl(attachment: ServiceM8Attachment): string | undefined {
    // Basic preview rule for images/PDFs
    const type = (attachment.file_type || '').toLowerCase();
    if (type.includes('pdf') || type.includes('image') || ['jpg','jpeg','png','gif','webp'].some(ext => type.includes(ext))) {
      return `/api/servicem8/attachments/${attachment.uuid}?preview=1`;
    }
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

  private calculateDueDate(job: unknown): string | undefined {
    // Simple heuristic: invoices are due 14 days after creation
    const jobData = job as { status?: string; created_at?: string };
    if (jobData.status === 'Invoice' && jobData.created_at) {
      const created = new Date(jobData.created_at);
      const due = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000);
      return due.toISOString();
    }
    return undefined;
  }
}

// Export singleton instance
export const customerPortalAPI = new CustomerPortalAPI();
