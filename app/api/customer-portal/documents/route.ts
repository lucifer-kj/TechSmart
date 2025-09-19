import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { customerPortalAPI } from "@/lib/customer-portal-api";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId') || undefined;
    const refresh = searchParams.get('refresh') === 'true';
    const maxAge = searchParams.get('maxAge') ? parseInt(searchParams.get('maxAge')!) : undefined;

    // Use the enhanced customer portal API with read-through cache
    const docs = await customerPortalAPI.getCachedDocuments(companyUuid, {
      refresh,
      maxAge,
      jobId
    });

    return NextResponse.json({ documents: docs });
  } catch (error) {
    console.error('Portal documents error:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}


