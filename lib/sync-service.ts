import { createClient } from '@supabase/supabase-js';
import { ServiceM8Client, ServiceM8Job, ServiceM8JobMaterial, ServiceM8Attachment, ServiceM8Company } from './servicem8';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export class SyncService {
  private sm8Client: ServiceM8Client;
  private supabase: typeof supabase;

  constructor(apiKey: string) {
    this.sm8Client = new ServiceM8Client(apiKey);
    this.supabase = supabase;
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

  async getCachedJobs(customerId: string) {
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
