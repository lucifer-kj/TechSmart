import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { restoreCustomerAccess } from "@/lib/access-revocation";
import { logSupabaseCall } from "@/lib/api-logging";
import { logCustomerUnban } from "@/lib/audit-logging";

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

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .single();
    if (customerError || !customer) {
      await logSupabaseCall(`/api/admin/customers/${customerId}/unban`, 'POST', {}, { error: 'Customer not found' }, 404, Date.now() - startedAt, user.id, ip, userAgent, 'not_found');
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Reactivate portal profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('customer_id', customerId);
    if (updateError) throw updateError;

    // Restore access
    await restoreCustomerAccess(customerId, user.id);

    await logCustomerUnban(user.id, customerId, ip, userAgent);
    await logSupabaseCall(`/api/admin/customers/${customerId}/unban`, 'POST', {}, { message: 'Customer unbanned' }, 200, Date.now() - startedAt, user.id, ip, userAgent);
    return NextResponse.json({ message: 'Customer unbanned' });
  } catch (error) {
    console.error('Customer unban error:', error);
    await logSupabaseCall(`/api/admin/customers/${customerId}/unban`, 'POST', {}, { error: 'Failed to unban customer' }, 500, Date.now() - startedAt, user.id, ip, userAgent, (error as Error).message);
    return NextResponse.json({ error: 'Failed to unban customer' }, { status: 500 });
  }
}


