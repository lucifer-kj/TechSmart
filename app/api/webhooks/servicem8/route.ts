import { NextResponse } from "next/server";
import { ServiceM8Client } from "@/lib/servicem8";
import { SyncService } from "@/lib/sync-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event_type, object_uuid } = body;

    // Verify webhook secret (in production)
    const webhookSecret = process.env.SERVICEM8_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('x-servicem8-signature');
      if (!signature || !verifyWebhookSignature(body, signature, webhookSecret)) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const apiKey = process.env.SERVICEM8_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ServiceM8 API key not configured' }, { status: 500 });
    }

    const client = new ServiceM8Client(apiKey);
    const syncService = new SyncService(apiKey);

    switch (event_type) {
      case 'job.updated':
        await handleJobUpdate(client, syncService, object_uuid);
        break;
      case 'attachment.created':
        await handleNewAttachment(client, syncService, object_uuid);
        break;
      case 'jobmaterial.updated':
        await handleMaterialUpdate(client, syncService, object_uuid);
        break;
      case 'company.updated':
        await handleCompanyUpdate(client, syncService, object_uuid);
        break;
      default:
        console.log(`Unhandled webhook event: ${event_type}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleJobUpdate(client: ServiceM8Client, syncService: SyncService, jobUuid: string) {
  try {
    // Fetch updated job data from ServiceM8
    const updatedJob = await client.getJobDetails(jobUuid);
    
    // Get company UUID for sync
    const companyUuid = updatedJob.company_uuid;
    
    // Sync the updated job data
    await syncService.syncCustomerData(companyUuid);
    
    console.log(`Job ${jobUuid} updated successfully`);
  } catch (error) {
    console.error(`Failed to handle job update for ${jobUuid}:`, error);
  }
}

async function handleNewAttachment(client: ServiceM8Client, syncService: SyncService, attachmentUuid: string) {
  try {
    // Get attachment details
    const attachment = await client.get<{ related_object_uuid: string }>(`/attachment/${attachmentUuid}.json`);
    
    // Get the related job
    const job = await client.getJobDetails(attachment.related_object_uuid);
    
    // Sync the customer data to update attachments
    await syncService.syncCustomerData(job.company_uuid);
    
    console.log(`Attachment ${attachmentUuid} processed successfully`);
  } catch (error) {
    console.error(`Failed to handle new attachment ${attachmentUuid}:`, error);
  }
}

async function handleMaterialUpdate(client: ServiceM8Client, syncService: SyncService, materialUuid: string) {
  try {
    // Get material details
    const material = await client.get<{ job_uuid: string }>(`/jobmaterial/${materialUuid}.json`);
    
    // Get the related job
    const job = await client.getJobDetails(material.job_uuid);
    
    // Sync the customer data to update materials
    await syncService.syncCustomerData(job.company_uuid);
    
    console.log(`Material ${materialUuid} updated successfully`);
  } catch (error) {
    console.error(`Failed to handle material update ${materialUuid}:`, error);
  }
}

async function handleCompanyUpdate(client: ServiceM8Client, syncService: SyncService, companyUuid: string) {
  try {
    // Sync the company data
    await syncService.syncCustomerData(companyUuid);
    
    console.log(`Company ${companyUuid} updated successfully`);
  } catch (error) {
    console.error(`Failed to handle company update ${companyUuid}:`, error);
  }
}

function verifyWebhookSignature(body: unknown, signature: string, secret: string): boolean {
  // TODO: Implement proper webhook signature verification
  // This would typically use HMAC-SHA256
  void body;
  void signature;
  void secret;
  return true;
}
