import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customer = searchParams.get('customer');
    const dateRange = searchParams.get('dateRange');
    const sortBy = searchParams.get('sortBy') || 'date';

    // Build query
    let query = supabase
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
          email
        )
      `);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (customer) {
      query = query.or(`customers.name.ilike.%${customer}%,customers.email.ilike.%${customer}%`);
    }

    if (dateRange) {
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStart, 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      query = query.gte('created_at', startDate.toISOString());
    }

    // Apply sorting
    switch (sortBy) {
      case 'total':
        query = query.order('generated_job_total', { ascending: false });
        break;
      case 'customer':
        query = query.order('customers(name)', { ascending: true });
        break;
      case 'date':
      default:
        query = query.order('updated_at', { ascending: false });
        break;
    }

    const { data: jobs, error: jobsError } = await query;

    if (jobsError) throw jobsError;

    // Transform the data to flatten customer info
    const transformedJobs = jobs?.map(job => ({
      id: job.id,
      job_no: job.job_no,
      description: job.description,
      status: job.status,
      generated_job_total: job.generated_job_total,
      created_at: job.created_at,
      updated_at: job.updated_at,
      customer_id: job.customer_id,
      customer_name: (Array.isArray(job.customers) ? job.customers[0]?.name : (job.customers as { name: string }).name) as string,
      customer_email: (Array.isArray(job.customers) ? job.customers[0]?.email : (job.customers as { email: string }).email) as string
    })) || [];

    return NextResponse.json({ jobs: transformedJobs });
  } catch (error) {
    console.error('Admin jobs error:', error);
    return NextResponse.json({ error: 'Failed to load jobs' }, { status: 500 });
  }
}
