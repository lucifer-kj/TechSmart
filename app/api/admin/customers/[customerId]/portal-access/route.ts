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
    const { has_portal_access } = body;

    if (typeof has_portal_access !== 'boolean') {
      return NextResponse.json({ 
        error: "has_portal_access must be a boolean value" 
      }, { status: 400 });
    }

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ 
        error: "Customer not found" 
      }, { status: 404 });
    }

    if (has_portal_access) {
      // Enable portal access - create or update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          customer_id: customerId,
          role: 'customer',
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'customer_id'
        });

      if (profileError) throw profileError;

      // TODO: Create Supabase Auth user account if it doesn't exist
      // This would typically use the Supabase Auth Admin API
      // For now, we'll just update the profile

    } else {
      // Disable portal access - deactivate user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', customerId);

      if (profileError) throw profileError;

      // TODO: Revoke Supabase Auth sessions for this user
      // This would typically use the Supabase Auth Admin API
    }

    return NextResponse.json({ 
      message: `Portal access ${has_portal_access ? 'enabled' : 'disabled'} successfully`,
      has_portal_access
    });
  } catch (error) {
    console.error('Portal access update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update portal access' 
    }, { status: 500 });
  }
}
