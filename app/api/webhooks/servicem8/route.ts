import { NextResponse } from "next/server";
import { ServiceM8Client } from "@/lib/servicem8";
import { SyncService } from "@/lib/sync-service";
import { createClient } from "@supabase/supabase-js";
import crypto from 'crypto';

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await request.json();
    const { event_type, object_uuid, webhook_id } = body;

    // Validate required fields
    if (!event_type || !object_uuid) {
      return NextResponse.json({ 
        error: 'Missing required fields: event_type, object_uuid' 
      }, { status: 400 });
    }

    // Check for idempotency - prevent duplicate processing
    if (webhook_id) {
      const { data: existingWebhook } = await supabase
        .from('webhook_logs')
        .select('id')
        .eq('webhook_id', webhook_id)
        .single();

      if (existingWebhook) {
        console.log(`Webhook ${webhook_id} already processed, skipping`);
        return NextResponse.json({ success: true, message: 'Already processed' });
      }
    }

    // Verify webhook secret (in production)
    const webhookSecret = process.env.SERVICEM8_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('x-servicem8-signature');
      if (!signature || !verifyWebhookSignature(body, signature, webhookSecret)) {
        await logWebhookEvent(supabase, {
          webhook_id,
          event_type,
          object_uuid,
          status: 'failed',
          error: 'Invalid webhook signature',
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const apiKey = process.env.SERVICEM8_API_KEY;
    if (!apiKey) {
      await logWebhookEvent(supabase, {
        webhook_id,
        event_type,
        object_uuid,
        status: 'failed',
        error: 'ServiceM8 API key not configured',
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'ServiceM8 API key not configured' }, { status: 500 });
    }

    // Log webhook start
    const logId = await logWebhookEvent(supabase, {
      webhook_id,
      event_type,
      object_uuid,
      status: 'processing',
      timestamp: new Date().toISOString()
    });

    const client = new ServiceM8Client(apiKey);
    const syncService = new SyncService(apiKey);

    let result;
    switch (event_type) {
      case 'job.updated':
        result = await handleJobUpdate(client, syncService, object_uuid);
        break;
      case 'job.created':
        result = await handleJobCreate(client, syncService, object_uuid);
        break;
      case 'attachment.created':
        result = await handleNewAttachment(client, syncService, object_uuid);
        break;
      case 'attachment.updated':
        result = await handleAttachmentUpdate(client, syncService, object_uuid);
        break;
      case 'jobmaterial.updated':
        result = await handleMaterialUpdate(client, syncService, object_uuid);
        break;
      case 'company.updated':
        result = await handleCompanyUpdate(client, syncService, object_uuid);
        break;
      case 'company.created':
        result = await handleCompanyCreate(client, syncService, object_uuid);
        break;
      case 'payment.created':
      case 'payment.updated':
        result = await handlePaymentUpdate(client, syncService, object_uuid);
        break;
      default:
        console.log(`Unhandled webhook event: ${event_type}`);
        result = { success: true, message: 'Event type not handled' };
    }

    // Log successful completion
    await updateWebhookLog(supabase, logId, {
      status: 'completed',
      result: JSON.stringify(result),
      completed_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Webhook error:', error);
    
    // Log error
    try {
      const body = await request.json();
      await logWebhookEvent(supabase, {
        webhook_id: body.webhook_id,
        event_type: body.event_type,
        object_uuid: body.object_uuid,
        status: 'failed',
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

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
    return { success: true, message: `Job ${jobUuid} updated` };
  } catch (error) {
    console.error(`Failed to handle job update for ${jobUuid}:`, error);
    throw error;
  }
}

async function handleJobCreate(client: ServiceM8Client, syncService: SyncService, jobUuid: string) {
  try {
    // Fetch new job data from ServiceM8
    const newJob = await client.getJobDetails(jobUuid);
    
    // Get company UUID for sync
    const companyUuid = newJob.company_uuid;
    
    // Sync the new job data
    await syncService.syncCustomerData(companyUuid);
    
    console.log(`Job ${jobUuid} created successfully`);
    return { success: true, message: `Job ${jobUuid} created` };
  } catch (error) {
    console.error(`Failed to handle job creation for ${jobUuid}:`, error);
    throw error;
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
    return { success: true, message: `Attachment ${attachmentUuid} created` };
  } catch (error) {
    console.error(`Failed to handle new attachment ${attachmentUuid}:`, error);
    throw error;
  }
}

async function handleAttachmentUpdate(client: ServiceM8Client, syncService: SyncService, attachmentUuid: string) {
  try {
    // Get attachment details
    const attachment = await client.get<{ related_object_uuid: string }>(`/attachment/${attachmentUuid}.json`);
    
    // Get the related job
    const job = await client.getJobDetails(attachment.related_object_uuid);
    
    // Sync the customer data to update attachments
    await syncService.syncCustomerData(job.company_uuid);
    
    console.log(`Attachment ${attachmentUuid} updated successfully`);
    return { success: true, message: `Attachment ${attachmentUuid} updated` };
  } catch (error) {
    console.error(`Failed to handle attachment update ${attachmentUuid}:`, error);
    throw error;
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
    return { success: true, message: `Material ${materialUuid} updated` };
  } catch (error) {
    console.error(`Failed to handle material update ${materialUuid}:`, error);
    throw error;
  }
}

async function handleCompanyUpdate(client: ServiceM8Client, syncService: SyncService, companyUuid: string) {
  try {
    // Sync the company data
    await syncService.syncCustomerData(companyUuid);
    
    console.log(`Company ${companyUuid} updated successfully`);
    return { success: true, message: `Company ${companyUuid} updated` };
  } catch (error) {
    console.error(`Failed to handle company update ${companyUuid}:`, error);
    throw error;
  }
}

async function handleCompanyCreate(client: ServiceM8Client, syncService: SyncService, companyUuid: string) {
  try {
    // Sync the new company data
    await syncService.syncCustomerData(companyUuid);
    
    console.log(`Company ${companyUuid} created successfully`);
    return { success: true, message: `Company ${companyUuid} created` };
  } catch (error) {
    console.error(`Failed to handle company creation ${companyUuid}:`, error);
    throw error;
  }
}

async function handlePaymentUpdate(client: ServiceM8Client, syncService: SyncService, paymentUuid: string) {
  try {
    // Get payment details to find related company
    const payment = await client.get<{ company_uuid: string }>(`/payment/${paymentUuid}.json`);
    
    // Sync the customer data to update payment information
    await syncService.syncCustomerData(payment.company_uuid);
    
    console.log(`Payment ${paymentUuid} updated successfully`);
    return { success: true, message: `Payment ${paymentUuid} updated` };
  } catch (error) {
    console.error(`Failed to handle payment update ${paymentUuid}:`, error);
    throw error;
  }
}

// Utility functions for webhook logging
import type { SupabaseClient } from "@supabase/supabase-js";

async function logWebhookEvent(supabase: SupabaseClient, data: {
  webhook_id?: string;
  event_type: string;
  object_uuid: string;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
  timestamp: string;
}) {
  const { data: logEntry } = await supabase
    .from('webhook_logs')
    .insert({
      webhook_id: data.webhook_id,
      event_type: data.event_type,
      object_uuid: data.object_uuid,
      status: data.status,
      error: data.error,
      created_at: data.timestamp
    })
    .select('id')
    .single();

  return logEntry?.id;
}

async function updateWebhookLog(supabase: SupabaseClient, logId: string, updates: {
  status: string;
  result?: string;
  completed_at: string;
}) {
  await supabase
    .from('webhook_logs')
    .update(updates)
    .eq('id', logId);
}

function verifyWebhookSignature(body: unknown, signature: string, secret: string): boolean {
  try {
    const payload = JSON.stringify(body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}
