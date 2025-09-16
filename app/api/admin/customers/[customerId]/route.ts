import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // Get user profile info (last login, status)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('last_login, is_active')
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
      total_value: totalValue
    };

    return NextResponse.json({ customer: customerWithStats });
  } catch (error) {
    console.error('Customer details error:', error);
    return NextResponse.json({ error: 'Failed to load customer details' }, { status: 500 });
  }
}
