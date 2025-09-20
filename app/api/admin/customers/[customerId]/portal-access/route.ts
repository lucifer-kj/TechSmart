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
      // For enabling access, use invitations flow instead of setting passwords directly.
      return NextResponse.json({
        message: 'Use invitation API to grant access',
        next: {
          endpoint: '/api/auth/invite',
          payload: { email: customer.email, customerId }
        }
      }, { status: 202 });
    } else {
      // Disable access via suspend helper
      const { data: suspended, error: suspendError } = await supabase
        .rpc('admin_suspend_customer_access', { p_customer_id: customerId });
      if (suspendError) {
        return NextResponse.json({ error: suspendError.message }, { status: 500 });
      }
      return NextResponse.json({ 
        message: 'Portal access suspended',
        affected_profiles: suspended ?? 0
      });
    }
  } catch (error) {
    console.error('Portal access update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update portal access' 
    }, { status: 500 });
  }
}

export async function POST(
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
    const { createPortalAccess } = body;

    if (!createPortalAccess) {
      return NextResponse.json({ 
        error: "createPortalAccess must be true" 
      }, { status: 400 });
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email, name')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ 
        error: "Customer not found" 
      }, { status: 404 });
    }

    if (!customer.email) {
      return NextResponse.json({ 
        error: "Customer must have an email address to create user access",
        details: "Please add an email address to the customer record",
        action_required: "add_email"
      }, { status: 400 });
    }

    // Recommend invitation flow
    return NextResponse.json({
      message: 'Use invitation API to grant access',
      next: {
        endpoint: '/api/auth/invite',
        payload: { email: customer.email, customerId }
      }
    }, { status: 202 });
  } catch (error) {
    console.error('User access creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create user access' 
    }, { status: 500 });
  }
}
