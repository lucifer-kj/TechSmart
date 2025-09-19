import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { customerPortalAPI } from "@/lib/customer-portal-api";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { quoteId } = await params;
    const { signature, notes } = await request.json().catch(() => ({ signature: undefined, notes: undefined }));
    if (!signature) {
      return NextResponse.json({ error: 'Signature is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
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
      .select('servicem8_customer_uuid')
      .eq('id', profile.customer_id)
      .single();
    if (!customerRow?.servicem8_customer_uuid) {
      return NextResponse.json({ error: 'Customer mapping not found' }, { status: 404 });
    }
    const companyUuid = customerRow.servicem8_customer_uuid as string;

    const ok = await customerPortalAPI.approveQuote(quoteId, { signature, notes });
    if (!ok) {
      return NextResponse.json({ error: 'Failed to approve quote' }, { status: 502 });
    }

    // Record approval intent/status in Supabase quotes table
    await supabase
      .from('quotes')
      .upsert({
        id: quoteId,
        company_uuid: companyUuid,
        status: 'approved',
        approved_at: new Date().toISOString()
      }, { onConflict: 'id' });

    return NextResponse.json({ message: 'Quote approved' });
  } catch (error) {
    console.error('Quote approval error:', error);
    return NextResponse.json({ error: 'Failed to approve quote' }, { status: 500 });
  }
}


