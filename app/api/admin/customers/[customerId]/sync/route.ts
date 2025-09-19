import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SyncService } from "@/lib/sync-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Admin guard
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { customerId } = await params;
  const apiKey = process.env.SERVICEM8_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "ServiceM8 API key not configured" }, { status: 500 });
  }

  try {
    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, servicem8_customer_uuid')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (!customer.servicem8_customer_uuid) {
      return NextResponse.json({ error: "Customer not linked to ServiceM8" }, { status: 400 });
    }

    // Trigger sync
    const syncService = new SyncService(apiKey);
    const syncResult = await syncService.syncCustomerData(customer.servicem8_customer_uuid);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncResult.jobCount} jobs for ${customer.name}`,
      jobsSynced: syncResult.jobCount,
      customerId: customer.id,
      servicem8Uuid: customer.servicem8_customer_uuid
    });

  } catch (error) {
    console.error('Manual sync error:', error);
    return NextResponse.json({ 
      error: 'Failed to sync customer data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
