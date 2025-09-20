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

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, servicem8_customer_uuid')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ 
        error: "Customer not found" 
      }, { status: 404 });
    }

    // Get customer jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        id,
        servicem8_job_uuid,
        job_no,
        description,
        status,
        generated_job_total,
        created_at,
        updated_at
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (jobsError) throw jobsError;

    // Get customer documents
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select(`
        id,
        job_id,
        type,
        title,
        url,
        version,
        created_at
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (documentsError) {
      console.warn('Failed to load documents:', documentsError);
    }

    // Get customer quotes
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select(`
        id,
        company_uuid,
        job_id,
        servicem8_job_uuid,
        status,
        approved_at,
        signature,
        notes,
        created_at,
        updated_at
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (quotesError) {
      console.warn('Failed to load quotes:', quotesError);
    }

    // Get customer payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        job_id,
        amount_cents,
        currency,
        status,
        paid_at,
        created_at
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.warn('Failed to load payments:', paymentsError);
    }

    return NextResponse.json({ 
      jobs: jobs || [], 
      documents: documents || [], 
      quotes: quotes || [],
      payments: payments || []
    });
  } catch (error) {
    console.error('Customer jobs error:', error);
    return NextResponse.json({ error: 'Failed to load customer jobs' }, { status: 500 });
  }
}
