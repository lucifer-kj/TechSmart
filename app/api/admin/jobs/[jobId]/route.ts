import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
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
    const { jobId } = await params;

    // Get job details with customer information
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        id,
        job_no,
        description,
        status,
        generated_job_total,
        created_at,
        updated_at,
        customer_id,
        customers!inner(
          id,
          name,
          email,
          phone,
          address
        )
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ 
        error: "Job not found" 
      }, { status: 404 });
    }

    // Get job materials if they exist
    const { data: materials } = await supabase
      .from('job_materials')
      .select('*')
      .eq('job_id', jobId);

    // Get job attachments if they exist
    const { data: attachments } = await supabase
      .from('job_attachments')
      .select('*')
      .eq('job_id', jobId);

    const jobDetail = {
      id: job.id,
      job_no: job.job_no,
      description: job.description,
      status: job.status,
      generated_job_total: job.generated_job_total,
      created_at: job.created_at,
      updated_at: job.updated_at,
      customer_id: job.customer_id,
      customer_name: (Array.isArray(job.customers) ? job.customers[0]?.name : (job.customers as { name: string }).name) as string,
      customer_email: (Array.isArray(job.customers) ? job.customers[0]?.email : (job.customers as { email: string }).email) as string,
      customer_phone: (Array.isArray(job.customers) ? job.customers[0]?.phone : (job.customers as { phone: string }).phone) as string,
      address: (Array.isArray(job.customers) ? job.customers[0]?.address : (job.customers as { address?: string }).address) as string | undefined,
      materials: materials || [],
      attachments: attachments || []
    };

    return NextResponse.json({ job: jobDetail });
  } catch (error) {
    console.error('Admin job detail error:', error);
    return NextResponse.json({ error: 'Failed to load job details' }, { status: 500 });
  }
}
