import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ServiceM8Client, generateIdempotencyKey } from "@/lib/servicem8";

type ApprovalRequest = {
  quote_id: string;
  job_id?: string;
  signature?: string;
  notes?: string;
  approved: boolean;
};

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile to ensure they're a customer
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("customer_id, role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  if (profile.role !== 'customer') {
    return NextResponse.json({ error: "Customer access required" }, { status: 403 });
  }

  if (!profile.is_active) {
    return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
  }

  if (!profile.customer_id) {
    return NextResponse.json({ error: "No customer linked to account" }, { status: 400 });
  }

  try {
    const body = await request.json() as ApprovalRequest;
    const { quote_id, signature, notes, approved } = body;

    if (!quote_id) {
      return NextResponse.json({ error: "Quote ID is required" }, { status: 400 });
    }

    // Verify the customer has access to this quote
    const query = supabase
      .from('quotes')
      .select(`
        id,
        customer_id,
        job_id,
        servicem8_job_uuid,
        status,
        jobs!inner(id, servicem8_job_uuid, customer_id)
      `)
      .eq('id', quote_id)
      .eq('customer_id', profile.customer_id);

    const { data: quote, error: quoteError } = await query.single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: "Quote not found or access denied" }, { status: 404 });
    }

    if (quote.status !== 'pending') {
      return NextResponse.json({ error: "Quote has already been processed" }, { status: 400 });
    }

    // Update quote in database
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: approved ? 'approved' : 'rejected',
        approved_at: new Date().toISOString(),
        signature: signature || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', quote_id)
      .eq('customer_id', profile.customer_id); // Ensure customer can only update their own quotes

    if (updateError) {
      console.error('Quote update error:', updateError);
      throw new Error('Failed to update quote');
    }

    // Sync approval to ServiceM8 if API key is available
    let serviceM8Synced = false;
    let serviceM8Error = null;

    if (process.env.SERVICEM8_API_KEY && quote.servicem8_job_uuid) {
      try {
        const serviceM8Client = new ServiceM8Client(process.env.SERVICEM8_API_KEY);
        const idempotencyKey = generateIdempotencyKey('approve-quote', quote_id);

        // Send approval to ServiceM8
        await serviceM8Client.approveQuote(quote.servicem8_job_uuid, {
          approved: approved,
          approval_date: new Date().toISOString(),
          customer_signature: signature || undefined,
          notes: notes || undefined
        }, idempotencyKey);

        serviceM8Synced = true;
        console.log(`✅ Quote approval synced to ServiceM8: ${quote_id}`);

        // Add job note if there are customer notes
        if (notes) {
          await serviceM8Client.addJobNote(quote.servicem8_job_uuid, {
            note: `Customer ${approved ? 'approved' : 'rejected'} quote: ${notes}`,
            note_type: 'customer_feedback'
          }, generateIdempotencyKey('quote-note', quote_id));
        }

      } catch (error) {
        console.error('ServiceM8 sync error:', error);
        serviceM8Error = (error as Error).message;
        // Don't fail the operation if ServiceM8 sync fails
      }
    }

    const response = {
      success: true,
      message: `Quote ${approved ? 'approved' : 'rejected'} successfully`,
      quote: {
        id: quote_id,
        status: approved ? 'approved' : 'rejected',
        approved_at: new Date().toISOString(),
        signature: signature || null,
        notes: notes || null
      },
      servicem8_sync: {
        attempted: !!process.env.SERVICEM8_API_KEY,
        synced: serviceM8Synced,
        error: serviceM8Error
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Quote approval error:', error);
    return NextResponse.json({ 
      error: 'Failed to process quote approval',
      details: (error as Error).message 
    }, { status: 500 });
  }
}
