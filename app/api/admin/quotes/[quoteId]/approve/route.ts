import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { customerPortalAPI } from "@/lib/customer-portal-api";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
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
    const { quoteId } = await params;
    const { signature, notes, customerId } = await request.json();
    
    if (!signature) {
      return NextResponse.json({ error: 'Signature is required' }, { status: 400 });
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, servicem8_customer_uuid')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!customer.servicem8_customer_uuid) {
      return NextResponse.json({ error: 'Customer ServiceM8 mapping not found' }, { status: 404 });
    }

    // Approve quote via ServiceM8 API
    const ok = await customerPortalAPI.approveQuote(quoteId, { signature, notes });
    if (!ok) {
      return NextResponse.json({ error: 'Failed to approve quote in ServiceM8' }, { status: 502 });
    }

    // Record approval in Supabase quotes table
    await supabase
      .from('quotes')
      .upsert({
        id: quoteId,
        customer_id: customerId,
        company_uuid: customer.servicem8_customer_uuid,
        status: 'approved',
        approved_at: new Date().toISOString(),
        signature: signature,
        notes: notes || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    return NextResponse.json({ 
      message: 'Quote approved successfully',
      quoteId,
      customerId,
      approvedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin quote approval error:', error);
    return NextResponse.json({ error: 'Failed to approve quote' }, { status: 500 });
  }
}
