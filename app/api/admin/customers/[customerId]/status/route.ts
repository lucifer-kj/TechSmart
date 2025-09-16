import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PUT(
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
    const body = await request.json();
    const { status } = body;

    if (!status || !['active', 'inactive', 'banned'].includes(status)) {
      return NextResponse.json({ 
        error: "Valid status is required (active, inactive, banned)" 
      }, { status: 400 });
    }

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ 
        error: "Customer not found" 
      }, { status: 404 });
    }

    // Update user profile status
    const isActive = status === 'active';
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customerId);

    if (updateError) throw updateError;

    // If banning, also revoke all active sessions
    if (status === 'banned') {
      // Note: In a production environment, you might want to implement
      // session revocation through Supabase Auth Admin API
      console.log(`Customer ${customerId} banned - sessions should be revoked`);
    }

    return NextResponse.json({ 
      message: `Customer status updated to ${status}` 
    });
  } catch (error) {
    console.error('Customer status update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update customer status' 
    }, { status: 500 });
  }
}
