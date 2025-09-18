import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from 'crypto';
import { getEmailTriggerService } from '@/lib/email-triggers';

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await request.json();
    const { 
      customer_id, 
      customer_name, 
      customer_email, 
      customer_phone, 
      customer_address,
      webhook_id
    } = body;

    // Validate required fields
    if (!customer_id || !customer_name || !customer_email) {
      return NextResponse.json({ 
        error: 'Missing required fields: customer_id, customer_name, customer_email' 
      }, { status: 400 });
    }

    // Verify webhook secret
    const webhookSecret = process.env.CUSTOMER_AUTOMATION_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('x-webhook-signature');
      if (!signature || !verifyWebhookSignature(body, signature, webhookSecret)) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    // Check for idempotency
    if (webhook_id) {
      const { data: existingWebhook } = await supabase
        .from('customer_creation_logs')
        .select('id')
        .eq('webhook_id', webhook_id)
        .single();

      if (existingWebhook) {
        console.log(`Customer creation webhook ${webhook_id} already processed, skipping`);
        return NextResponse.json({ success: true, message: 'Already processed' });
      }
    }

    // Log the webhook event
    const logId = await logCustomerCreationEvent(supabase, {
      webhook_id,
      customer_id,
      customer_name,
      customer_email,
      status: 'processing',
      timestamp: new Date().toISOString()
    });

    // Check if customer already exists in Supabase
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, servicem8_uuid')
      .eq('servicem8_uuid', customer_id)
      .single();

    if (existingCustomer) {
      console.log(`Customer ${customer_id} already exists in Supabase`);
      await updateCustomerCreationLog(supabase, logId, {
        status: 'skipped',
        result: 'Customer already exists',
        completed_at: new Date().toISOString()
      });
      return NextResponse.json({ success: true, message: 'Customer already exists' });
    }

    // Create customer in Supabase
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({
        servicem8_uuid: customer_id,
        name: customer_name,
        email: customer_email,
        phone: customer_phone || null,
        address: customer_address || null,
        company_uuid: customer_id, // Use customer_id as company_uuid for now
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (customerError) throw customerError;

    // Send to external automation service
    const automationResult = await sendToAutomationService({
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      supabase_customer_id: newCustomer.id
    });

    // Trigger welcome email workflow
    const emailTriggerService = await getEmailTriggerService();
    const emailResult = await emailTriggerService.sendWelcomeEmail(newCustomer.id);

    // Update log with results
    await updateCustomerCreationLog(supabase, logId, {
      status: 'completed',
      result: JSON.stringify({
        customer_created: true,
        automation_sent: automationResult.success,
        welcome_email_triggered: emailResult
      }),
      completed_at: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Customer creation workflow completed',
      customer_id: newCustomer.id,
      automation_result: automationResult,
      email_result: { success: emailResult }
    });

  } catch (error) {
    console.error('Customer creation webhook error:', error);
    
    // Log error
    try {
      const body = await request.json();
      await logCustomerCreationEvent(supabase, {
        webhook_id: body.webhook_id,
        customer_id: body.customer_id,
        customer_name: body.customer_name,
        customer_email: body.customer_email,
        status: 'failed',
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Failed to log customer creation error:', logError);
    }

    return NextResponse.json({ error: 'Customer creation workflow failed' }, { status: 500 });
  }
}

async function sendToAutomationService(customerData: {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_address?: string;
  supabase_customer_id: string;
}) {
  const automationUrl = process.env.CUSTOMER_AUTOMATION_WEBHOOK_URL;
  
  if (!automationUrl) {
    console.log('No automation webhook URL configured');
    return { success: false, error: 'No automation URL configured' };
  }

  try {
    const response = await fetch(automationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WEBHOOK_SECRET_KEY}`
      },
      body: JSON.stringify({
        event_type: 'customer.created',
        customer_data: customerData,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Automation service responded with ${response.status}`);
    }

    return { success: true, response: await response.json() };
  } catch (error) {
    console.error('Automation service error:', error);
    return { success: false, error: (error as Error).message };
  }
}


// Utility functions
import type { SupabaseClient } from "@supabase/supabase-js";

async function logCustomerCreationEvent(supabase: SupabaseClient, data: {
  webhook_id?: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  status: 'processing' | 'completed' | 'failed' | 'skipped';
  error?: string;
  timestamp: string;
}) {
  const { data: logEntry } = await supabase
    .from('customer_creation_logs')
    .insert({
      webhook_id: data.webhook_id,
      customer_id: data.customer_id,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      status: data.status,
      error: data.error,
      created_at: data.timestamp
    })
    .select('id')
    .single();

  return logEntry?.id;
}

async function updateCustomerCreationLog(supabase: SupabaseClient, logId: string, updates: {
  status: string;
  result?: string;
  completed_at: string;
}) {
  await supabase
    .from('customer_creation_logs')
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
