import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { InputSanitizationService, type SanitizationConfig } from "@/lib/input-sanitization";
import { logSupabaseCall } from "@/lib/api-logging";
import { logCustomerCreation } from "@/lib/audit-logging";
import { SyncService } from "@/lib/sync-service";
import { ServiceM8Client } from "@/lib/servicem8";

type LinkCustomerRequest = {
  client_uuid: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  createPortalAccess?: boolean;
};

const LinkCustomerSchema: Record<string, SanitizationConfig> = {
  name: { type: 'string', required: false, maxLength: 255, allowedChars: /^[a-zA-Z0-9\s\-\.&'"]+$/ },
  email: { type: 'email', required: false, maxLength: 255 },
  phone: { type: 'phone', required: false, maxLength: 20 },
  address: { type: 'string', required: false, maxLength: 500, sanitizeHtml: true }
};

function isUUIDv4(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin guard
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const startedAt = Date.now();
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
  const userAgent = request.headers.get("user-agent") || undefined;

  try {
    const body = (await request.json()) as Partial<LinkCustomerRequest>;

    if (!body.client_uuid || typeof body.client_uuid !== 'string' || !isUUIDv4(body.client_uuid)) {
      await logSupabaseCall("/api/admin/customers/link", "POST", body, { error: "Invalid client_uuid" }, 400, Date.now() - startedAt, user.id, ip, userAgent, "validation_error");
      return NextResponse.json({ error: "Valid client_uuid is required" }, { status: 400 });
    }

    const sanitizationService = new InputSanitizationService();
    const { isValid, sanitizedInputs, errors } = sanitizationService.sanitizeInputs(body as Record<string, unknown>, LinkCustomerSchema);
    if (!isValid) {
      await logSupabaseCall("/api/admin/customers/link", "POST", body, { error: "Input validation failed", details: errors }, 400, Date.now() - startedAt, user.id, ip, userAgent, "validation_error");
      return NextResponse.json({ error: "Input validation failed", details: errors }, { status: 400 });
    }

    const name = sanitizedInputs.name as string | undefined;
    const email = sanitizedInputs.email as string | undefined;
    const phone = sanitizedInputs.phone as string | undefined;
    const address = sanitizedInputs.address as string | undefined;

    // Create customer in Supabase linked to existing ServiceM8 client
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        servicem8_customer_uuid: body.client_uuid,
        name: name || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (customerError) throw customerError;

    // Validate that the ServiceM8 client exists and fetch basic info
    const apiKey = process.env.SERVICEM8_API_KEY;
    let clientExists = false;
    let syncResult = null;
    
    if (apiKey) {
      try {
        const sm8Client = new ServiceM8Client(apiKey);
        
        // Verify client exists in ServiceM8
        const clientData = await sm8Client.getCompany(body.client_uuid);
        clientExists = true;
        
        // Update customer record with ServiceM8 data if not provided
        if (!name || !email || !phone || !address) {
          const { error: updateError } = await supabase
            .from('customers')
            .update({
              name: name || clientData.name,
              email: email || clientData.email || null,
              phone: phone || clientData.mobile || null,
              address: address || clientData.address || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', customer.id);
          
          if (updateError) {
            console.warn('Failed to update customer with ServiceM8 data:', updateError);
          }
        }
        
        // Trigger automatic data sync for existing client
        const syncService = new SyncService(apiKey);
        syncResult = await syncService.syncCustomerData(body.client_uuid);
        
        console.log(`✅ Auto-synced ${syncResult.jobCount} jobs for existing ServiceM8 client ${body.client_uuid}`);
        
      } catch (error) {
        console.error('❌ ServiceM8 client validation/sync failed:', error);
        
        // If client doesn't exist in ServiceM8, return error
        if (error instanceof Error && error.message.includes('404')) {
          await logSupabaseCall("/api/admin/customers/link", "POST", body, { error: "ServiceM8 client not found" }, 404, Date.now() - startedAt, user.id, ip, userAgent, "servicem8_client_not_found");
          return NextResponse.json({ error: "ServiceM8 client not found with the provided UUID" }, { status: 404 });
        }
        
        // For other errors, log but don't fail the operation
        console.warn('ServiceM8 sync failed, but continuing with customer creation');
      }
    } else {
      console.warn('ServiceM8 API key not configured, skipping validation and sync');
    }

    // Optional: create portal access profile
    if (body.createPortalAccess) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          customer_id: customer.id,
          role: 'customer',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      if (profileError) {
        // Non-fatal
        console.warn('Profile creation warning:', profileError);
      }
    }

    const responsePayload = { 
      customer,
      syncResult: syncResult ? {
        jobsSynced: syncResult.jobCount,
        clientExists,
        message: `Successfully synced ${syncResult.jobCount} jobs from ServiceM8`
      } : null
    };
    
    await logSupabaseCall("/api/admin/customers/link", "POST", { client_uuid: body.client_uuid }, responsePayload, 200, Date.now() - startedAt, user.id, ip, userAgent);
    await logCustomerCreation(user.id, String(customer.id), { name, email, phone, servicem8_uuid: body.client_uuid }, ip, userAgent);

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Customer link error:', error);
    await logSupabaseCall("/api/admin/customers/link", "POST", {}, { error: 'Failed to link customer' }, 500, Date.now() - startedAt, user.id, ip, userAgent, (error as Error).message);
    return NextResponse.json({ error: 'Failed to link customer' }, { status: 500 });
  }
}


