import { createClient } from '@supabase/supabase-js';
import { ServiceM8Client, ServiceM8Job, ServiceM8JobMaterial, ServiceM8Attachment, ServiceM8Company } from './servicem8';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export class SyncService {
  private sm8Client: ServiceM8Client;
  private supabase: typeof supabase;
  private defaultCacheMaxAge = 5; // minutes

  constructor(apiKey: string, options?: {
    cacheMaxAge?: number; // in minutes
  }) {
    this.sm8Client = new ServiceM8Client(apiKey);
    this.supabase = supabase;
    if (options?.cacheMaxAge) {
      this.defaultCacheMaxAge = options.cacheMaxAge;
    }
  }

  async syncCustomerData(companyUuid: string) {
    try {
      // Sync company data
      const company = await this.sm8Client.getCompany(companyUuid);
      await this.syncCompany(company);

      // Sync jobs
      const jobs = await this.sm8Client.getCustomerJobs(companyUuid);
      await this.syncJobs(companyUuid, jobs);

      // Sync attachments and materials for each job
      for (const job of jobs) {
        const [attachments, materials] = await Promise.all([
          this.sm8Client.getJobAttachments(job.uuid),
          this.sm8Client.getJobMaterials(job.uuid)
        ]);

        await this.syncAttachments(job.uuid, attachments);
        await this.syncMaterials(job.uuid, materials);
      }

      return { success: true, jobCount: jobs.length };
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  private async syncCompany(company: ServiceM8Company) {
    const { error } = await this.supabase
      .from('customers')
      .upsert({
        servicem8_customer_uuid: company.uuid,
        name: company.name,
        email: company.email,
        phone: company.mobile,
        address: company.address,
        active: company.active,
        date_created_sm8: company.date_created,
        date_last_modified_sm8: company.date_last_modified,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'servicem8_customer_uuid'
      });

    if (error) throw error;
  }

  private async syncJobs(companyUuid: string, jobs: ServiceM8Job[]) {
    // First get the customer ID from our database
    const { data: customer } = await this.supabase
      .from('customers')
      .select('id')
      .eq('servicem8_customer_uuid', companyUuid)
      .single();

    if (!customer) {
      throw new Error('Customer not found in database');
    }

    const jobsToUpsert = jobs.map(job => ({
      customer_id: customer.id,
      servicem8_job_uuid: job.uuid,
      job_no: job.job_number,
      description: job.job_description,
      status: job.status,
      job_address: job.job_address,
      generated_job_total: job.generated_job_total,
      date_completed: job.date_completed,
      staff_uuid: job.staff_uuid,
      date_created_sm8: job.date_created,
      date_last_modified_sm8: job.date_last_modified,
      updated: job.date_last_modified,
      updated_at: new Date().toISOString()
    }));

    const { error } = await this.supabase
      .from('jobs')
      .upsert(jobsToUpsert, {
        onConflict: 'servicem8_job_uuid'
      });

    if (error) throw error;
  }

  private async syncAttachments(jobUuid: string, attachments: ServiceM8Attachment[]) {
    // Get the job ID from our database
    const { data: job } = await this.supabase
      .from('jobs')
      .select('id, customer_id')
      .eq('servicem8_job_uuid', jobUuid)
      .single();

    if (!job) {
      console.warn(`Job ${jobUuid} not found in database`);
      return;
    }

    const attachmentsToUpsert = attachments.map(att => ({
      customer_id: job.customer_id,
      job_id: job.id,
      servicem8_attachment_uuid: att.uuid,
      type: att.attachment_source.toLowerCase(),
      title: att.file_name,
      url: `/api/servicem8/attachments/${att.uuid}`,
      file_name: att.file_name,
      file_type: att.file_type,
      file_size: att.file_size,
      attachment_source: att.attachment_source,
      date_created_sm8: att.date_created,
      created_at: new Date().toISOString()
    }));

    const { error } = await this.supabase
      .from('documents')
      .upsert(attachmentsToUpsert, {
        onConflict: 'servicem8_attachment_uuid'
      });

    if (error) throw error;
  }

  private async syncMaterials(jobUuid: string, materials: ServiceM8JobMaterial[]) {
    // Get the job ID from our database
    const { data: job } = await this.supabase
      .from('jobs')
      .select('id, customer_id')
      .eq('servicem8_job_uuid', jobUuid)
      .single();

    if (!job) {
      console.warn(`Job ${jobUuid} not found in database`);
      return;
    }

    const materialsToUpsert = materials.map(mat => ({
      customer_id: job.customer_id,
      job_id: job.id,
      servicem8_material_uuid: mat.uuid,
      name: mat.name,
      description: mat.description,
      qty: mat.qty,
      cost_ex_tax: mat.cost_ex_tax,
      total_ex_tax: mat.total_ex_tax,
      total_inc_tax: mat.total_inc_tax,
      date_created_sm8: mat.date_created,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await this.supabase
      .from('job_materials')
      .upsert(materialsToUpsert, {
        onConflict: 'servicem8_material_uuid'
      });

    if (error) throw error;
  }

  // Read-through cache pattern: reads from Supabase, optionally refreshes from ServiceM8
  async getCachedJobs(customerId: string, options?: {
    refresh?: boolean;
    maxAge?: number;
  }): Promise<Array<Record<string, unknown>>> {
    const refresh = options?.refresh || false;
    const maxAge = options?.maxAge || this.defaultCacheMaxAge;

    // If refresh is requested or cache is stale, sync from ServiceM8 first
    if (refresh || !(await this.isCacheValid(customerId, maxAge))) {
      try {
        // Get company UUID for ServiceM8 sync
        const { data: customer } = await this.supabase
          .from('customers')
          .select('servicem8_customer_uuid')
          .eq('id', customerId)
          .single();

        if (customer?.servicem8_customer_uuid) {
          await this.syncCustomerData(customer.servicem8_customer_uuid);
        }
      } catch (error) {
        console.warn('Failed to refresh jobs from ServiceM8, using cached data:', error);
        // Continue with cached data if refresh fails
      }
    }

    // Return cached data from Supabase
    const { data, error } = await this.supabase
      .from('jobs')
      .select(`
        *,
        documents (*),
        job_materials (*)
      `)
      .eq('customer_id', customerId)
      .order('updated', { ascending: false });

    if (error) throw error;
    return data as Array<Record<string, unknown>>;
  }

  async isCacheValid(customerId: string, maxAgeMinutes = 5): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('jobs')
      .select('updated_at')
      .eq('customer_id', customerId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return false;
    }

    const lastUpdate = new Date(data[0].updated_at);
    const now = new Date();
    const ageMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

    return ageMinutes < maxAgeMinutes;
  }

  // Read-through cache for documents
  async getCachedDocuments(customerId: string, options?: {
    refresh?: boolean;
    maxAge?: number;
    jobId?: string;
  }): Promise<Array<Record<string, unknown>>> {
    const refresh = options?.refresh || false;
    const maxAge = options?.maxAge || this.defaultCacheMaxAge;
    const jobId = options?.jobId;

    // If refresh is requested or cache is stale, sync from ServiceM8 first
    if (refresh || !(await this.isCacheValid(customerId, maxAge))) {
      try {
        const { data: customer } = await this.supabase
          .from('customers')
          .select('servicem8_customer_uuid')
          .eq('id', customerId)
          .single();

        if (customer?.servicem8_customer_uuid) {
          await this.syncCustomerData(customer.servicem8_customer_uuid);
        }
      } catch (error) {
        console.warn('Failed to refresh documents from ServiceM8, using cached data:', error);
      }
    }

    // Build query
    let query = this.supabase
      .from('documents')
      .select('*')
      .eq('customer_id', customerId);

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data as Array<Record<string, unknown>>;
  }

  // Read-through cache for payments (derived from jobs with Invoice/Complete status)
  async getCachedPayments(customerId: string, options?: {
    refresh?: boolean;
    maxAge?: number;
  }): Promise<Array<Record<string, unknown>>> {
    const refresh = options?.refresh || false;
    const maxAge = options?.maxAge || this.defaultCacheMaxAge;

    // If refresh is requested or cache is stale, sync from ServiceM8 first
    if (refresh || !(await this.isCacheValid(customerId, maxAge))) {
      try {
        const { data: customer } = await this.supabase
          .from('customers')
          .select('servicem8_customer_uuid')
          .eq('id', customerId)
          .single();

        if (customer?.servicem8_customer_uuid) {
          await this.syncCustomerData(customer.servicem8_customer_uuid);
        }
      } catch (error) {
        console.warn('Failed to refresh payments from ServiceM8, using cached data:', error);
      }
    }

    // Get jobs that represent payments (Invoice or Complete status)
    const { data, error } = await this.supabase
      .from('jobs')
      .select('*')
      .eq('customer_id', customerId)
      .in('status', ['Invoice', 'Complete'])
      .order('updated', { ascending: false });

    if (error) throw error;
    return data as Array<Record<string, unknown>>;
  }

  // Write-back pattern: persist intent in Supabase first, then call ServiceM8
  async writeBackQuoteApproval(jobUuid: string, approvalData: {
    approved: boolean;
    approval_date: string;
    customer_signature?: string;
    notes?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // First, persist the approval intent in Supabase
      const { data: job } = await this.supabase
        .from('jobs')
        .select('id, customer_id, servicem8_job_uuid')
        .eq('servicem8_job_uuid', jobUuid)
        .single();

      if (!job) {
        throw new Error('Job not found in database');
      }

      // Insert approval record
      const { error: insertError } = await this.supabase
        .from('quotes')
        .insert({
          job_id: job.id,
          customer_id: job.customer_id,
          servicem8_job_uuid: jobUuid,
          approved: approvalData.approved,
          approval_date: approvalData.approval_date,
          customer_signature: approvalData.customer_signature,
          notes: approvalData.notes,
          status: 'pending', // Will be updated after ServiceM8 call
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // Then call ServiceM8
      await this.sm8Client.approveQuote(jobUuid, approvalData);

      // Update status to confirmed
      await this.supabase
        .from('quotes')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('servicem8_job_uuid', jobUuid);

      return { success: true };
    } catch (error) {
      console.error('Write-back quote approval failed:', error);
      
      // Update status to failed
      try {
        await this.supabase
          .from('quotes')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('servicem8_job_uuid', jobUuid);
      } catch (updateError) {
        console.error('Failed to update quote status to failed:', updateError);
      }

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async refreshIfStale(companyUuid: string, maxAgeMinutes = 5): Promise<{ refreshed: boolean }> {
    try {
      const { data: customer } = await this.supabase
        .from('customers')
        .select('id')
        .eq('servicem8_customer_uuid', companyUuid)
        .single();
      if (!customer) return { refreshed: false };
      const valid = await this.isCacheValid(customer.id, maxAgeMinutes);
      if (!valid) {
        await this.syncCustomerData(companyUuid);
        return { refreshed: true };
      }
      return { refreshed: false };
    } catch {
      return { refreshed: false };
    }
  }
}
