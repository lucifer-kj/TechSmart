import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revokeCustomerAccess } from "@/lib/access-revocation";
import { logSupabaseCall } from "@/lib/api-logging";
import { logCustomerBan } from "@/lib/audit-logging";

export async function POST(
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
    const body = await request.json().catch(() => ({} as { reason?: string }));
    const reason = (body as { reason?: string }).reason?.toString().trim();
    if (!reason) {
      await logSupabaseCall(`/api/admin/customers/${customerId}/ban`, 'POST', body, { error: 'Ban reason is required' }, 400, Date.now() - startedAt, user.id, ip, userAgent, 'validation_error');
      return NextResponse.json({ error: 'Ban reason is required' }, { status: 400 });
    }

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .single();
    if (customerError || !customer) {
      await logSupabaseCall(`/api/admin/customers/${customerId}/ban`, 'POST', {}, { error: 'Customer not found' }, 404, Date.now() - startedAt, user.id, ip, userAgent, 'not_found');
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Deactivate portal profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('customer_id', customerId);
    if (updateError) throw updateError;

    // Log ban reason
    const { error: logError } = await supabase
      .from('customer_ban_history')
      .insert({
        customer_id: customerId,
        banned_by: user.id,
        ban_reason: reason,
        banned_at: new Date().toISOString()
      });
    if (logError) {
      console.warn('Failed to log ban reason:', logError);
    }

    // Revoke access
    await revokeCustomerAccess(customerId, reason, user.id);

    await logCustomerBan(user.id, customerId, reason, ip, userAgent);
    await logSupabaseCall(`/api/admin/customers/${customerId}/ban`, 'POST', { reason }, { message: 'Customer banned' }, 200, Date.now() - startedAt, user.id, ip, userAgent);
    return NextResponse.json({ message: 'Customer banned' });
  } catch (error) {
    console.error('Customer ban error:', error);
    await logSupabaseCall(`/api/admin/customers/${customerId}/ban`, 'POST', {}, { error: 'Failed to ban customer' }, 500, Date.now() - startedAt, user.id, ip, userAgent, (error as Error).message);
    return NextResponse.json({ error: 'Failed to ban customer' }, { status: 500 });
  }
}


