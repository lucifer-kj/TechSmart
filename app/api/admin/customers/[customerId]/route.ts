import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { InputSanitizationService, type SanitizationConfig } from "@/lib/input-sanitization";
import { logSupabaseCall } from "@/lib/api-logging";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { customerId } = await params;

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select(`
        id,
        servicem8_customer_uuid,
        name,
        email,
        phone,
        address,
        created_at,
        updated_at
      `)
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ 
        error: "Customer not found" 
      }, { status: 404 });
    }

    // Get user profile info (last login, status, portal access)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('last_login, is_active, created_at')
      .eq('customer_id', customerId)
      .single();

    // Get job statistics
    const { data: jobs } = await supabase
      .from('jobs')
      .select('generated_job_total')
      .eq('customer_id', customerId);

    const jobCount = jobs?.length || 0;
    const totalValue = jobs?.reduce((sum, job) => sum + (job.generated_job_total || 0), 0) || 0;

    const customerWithStats = {
      ...customer,
      last_login: userProfile?.last_login,
      status: userProfile?.is_active ? 'active' : 'inactive',
      job_count: jobCount,
      total_value: totalValue,
      has_portal_access: !!userProfile,
      portal_access_created_at: userProfile?.created_at
    };

    return NextResponse.json({ customer: customerWithStats });
  } catch (error) {
    console.error('Customer details error:', error);
    return NextResponse.json({ error: 'Failed to load customer details' }, { status: 500 });
  }
}

const UpdateCustomerSchema: Record<string, SanitizationConfig> = {
  name: { type: 'string', required: false, maxLength: 255, allowedChars: /^[a-zA-Z0-9\s\-\.&'"]+$/ },
  email: { type: 'email', required: false, maxLength: 255 },
  phone: { type: 'phone', required: false, maxLength: 20 },
  address: { type: 'string', required: false, maxLength: 500, sanitizeHtml: true }
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Extract customerId from params outside try block for error logging
  const { customerId } = await params;

  try {

    // Verify exists
    const { data: existing, error: existingErr } = await supabase
      .from('customers')
      .select('id, servicem8_customer_uuid')
      .eq('id', customerId)
      .single();
    if (existingErr || !existing) {
      await logSupabaseCall(`/api/admin/customers/${customerId}`, 'PATCH', {}, { error: 'Customer not found' }, 404, Date.now() - startedAt, user.id, ip, userAgent, 'not_found');
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Sanitize input
    const sanitizer = new InputSanitizationService();
    const raw = await request.json().catch(() => ({}));
    const { isValid, sanitizedInputs, errors } = sanitizer.sanitizeInputs(raw as Record<string, unknown>, UpdateCustomerSchema);
    if (!isValid) {
      await logSupabaseCall(`/api/admin/customers/${customerId}`, 'PATCH', raw, { error: 'Input validation failed', details: errors }, 400, Date.now() - startedAt, user.id, ip, userAgent, 'validation_error');
      return NextResponse.json({ error: 'Input validation failed', details: errors }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      name: (sanitizedInputs.name as string | undefined)?.trim() || undefined,
      email: (sanitizedInputs.email as string | undefined)?.trim() || undefined,
      phone: (sanitizedInputs.phone as string | undefined)?.trim() || undefined,
      address: (sanitizedInputs.address as string | undefined)?.trim() || undefined,
      updated_at: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(updatePayload).forEach((k) => {
      if (updatePayload[k] === undefined) delete updatePayload[k];
    });

    if (Object.keys(updatePayload).length === 1 && 'updated_at' in updatePayload) {
      return NextResponse.json({ message: 'No changes provided' }, { status: 200 });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('customers')
      .update(updatePayload)
      .eq('id', customerId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Note: External propagation to ServiceM8 is handled by dedicated sync processes.

    await logSupabaseCall(`/api/admin/customers/${customerId}`, 'PATCH', updatePayload, { customer: updated }, 200, Date.now() - startedAt, user.id, ip, userAgent);

    return NextResponse.json({ customer: updated });
  } catch (error) {
    console.error('Customer update error:', error);
    await logSupabaseCall(`/api/admin/customers/${customerId}`, 'PATCH', {}, { error: 'Failed to update customer' }, 500, Date.now() - startedAt, user.id, ip, userAgent, (error as Error).message);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}
