import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ServiceM8Client } from "@/lib/servicem8";

export async function PUT(
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
    const { email, updateServiceM8 = false } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ 
        error: "Valid email address is required" 
      }, { status: 400 });
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ 
        error: "Customer not found" 
      }, { status: 404 });
    }

    // Update customer email in Supabase
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({ 
        email: email.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .select()
      .single();

    if (updateError) {
      console.error('Customer email update error:', updateError);
      return NextResponse.json({ 
        error: `Failed to update customer email: ${updateError.message}` 
      }, { status: 500 });
    }

    let serviceM8Updated = false;
    let serviceM8Error: string | null = null;

    // Update ServiceM8 client email if requested and customer has ServiceM8 UUID
    if (updateServiceM8 && customer.servicem8_customer_uuid) {
      try {
        const apiKey = process.env.SERVICEM8_API_KEY;
        if (apiKey) {
          const serviceM8Client = new ServiceM8Client(apiKey);
          await serviceM8Client.updateClient(customer.servicem8_customer_uuid, {
            email: email.trim()
          });
          serviceM8Updated = true;
        } else {
          serviceM8Error = "ServiceM8 API key not configured";
        }
      } catch (error) {
        console.error('ServiceM8 client update error:', error);
        serviceM8Error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    const response = {
      success: true,
      customer: updatedCustomer,
      serviceM8_updated: serviceM8Updated,
      serviceM8_error: serviceM8Error,
      message: `Customer email updated successfully${serviceM8Updated ? ' and synced to ServiceM8' : ''}`
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Customer email update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update customer email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
