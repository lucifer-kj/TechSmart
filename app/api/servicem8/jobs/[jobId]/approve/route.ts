import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { customerPortalAPI } from "@/lib/customer-portal-api";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Derive customer/company from session
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.customer_id) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }
    
    const { data: customerRow } = await supabase
      .from('customers')
      .select('id, servicem8_customer_uuid')
      .eq('id', profile.customer_id)
      .single();
    
    if (!customerRow?.servicem8_customer_uuid) {
      return NextResponse.json({ error: 'Customer mapping not found' }, { status: 404 });
    }
    
    // const companyUuid = customerRow.servicem8_customer_uuid as string;
    
    const body = await request.json();
    const { signature, notes } = body;
    
    if (!signature) {
      return NextResponse.json({ error: 'Signature is required' }, { status: 400 });
    }
    
    const resolvedParams = await params;
    const success = await customerPortalAPI.approveQuote(resolvedParams.jobId, {
      signature,
      notes: notes || '',
      approvedBy: (user as { email?: string }).email || 'Unknown',
      approvedAt: new Date().toISOString()
    });
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to approve quote' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Quote approved successfully',
      jobId: resolvedParams.jobId 
    });
  } catch (error) {
    console.error('Quote approval API Error:', error);
    return NextResponse.json({ error: 'Failed to approve quote' }, { status: 500 });
  }
}