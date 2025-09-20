import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SyncService } from "@/lib/sync-service";
import { ServiceM8Client, ServiceM8Job } from "@/lib/servicem8";
import { logSupabaseCall } from "@/lib/api-logging";

type Job = {
  id: string;
  customer_id: string;
  servicem8_job_uuid: string;
  job_no: string;
  description: string;
  status: string;
  updated: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    servicem8_customer_uuid: string;
  };
  servicem8_data?: ServiceM8Job;
};

export async function GET(request: NextRequest) {
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

  const startedAt = Date.now();
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
  const userAgent = request.headers.get("user-agent") || undefined;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customer = searchParams.get('customer');
    const customerId = searchParams.get('customerId');
    const dateRange = searchParams.get('dateRange');
    const sortBy = searchParams.get('sortBy') || 'date';
    const refresh = searchParams.get('refresh') === 'true';

    // Optional refresh from ServiceM8 for a specific customer scope
    if (refresh && customerId) {
      try {
        const { data: customerRow } = await supabase
          .from('customers')
          .select('servicem8_customer_uuid')
          .eq('id', customerId)
          .single();
        const apiKey = process.env.SERVICEM8_API_KEY;
        if (apiKey && customerRow?.servicem8_customer_uuid) {
          const sync = new SyncService(apiKey);
          await sync.syncCustomerData(customerRow.servicem8_customer_uuid);
        }
      } catch (e) {
        // Non-fatal; proceed with cached data
        console.warn('Admin jobs refresh failed:', e);
      }
    }

    // Build query
    let query = supabase
      .from('jobs')
      .select(`
        id,
        customer_id,
        servicem8_job_uuid,
        job_no,
        description,
        status,
        updated,
        created_at,
        updated_at,
        customers!inner(
          id,
          name,
          email,
          servicem8_customer_uuid
        )
      `);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (customer) {
      query = query.or(`customers.name.ilike.%${customer}%,customers.email.ilike.%${customer}%`);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
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

    // Fetch ServiceM8 data for each job if API key is available
    const serviceM8DataMap = new Map<string, ServiceM8Job>();
    if (process.env.SERVICEM8_API_KEY && jobs) {
      const serviceM8Client = new ServiceM8Client(process.env.SERVICEM8_API_KEY);
      
      await Promise.allSettled(
        jobs.map(async (job) => {
          if (job.servicem8_job_uuid) {
            try {
              const sm8Data = await serviceM8Client.getJobDetails(job.servicem8_job_uuid);
              serviceM8DataMap.set(job.id, sm8Data);
            } catch (error) {
              console.error(`Failed to fetch ServiceM8 data for job ${job.id}:`, error);
            }
          }
        })
      );
    }

    // Transform the data to include ServiceM8 data
    const transformedJobs: Job[] = jobs?.map(job => {
      const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
      const serviceM8Data = serviceM8DataMap.get(job.id);

      return {
        id: job.id,
        customer_id: job.customer_id,
        servicem8_job_uuid: job.servicem8_job_uuid || '',
        job_no: job.job_no || '',
        description: job.description || '',
        status: job.status || '',
        updated: job.updated || '',
        created_at: job.created_at,
        updated_at: job.updated_at,
        customer: customer ? {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          servicem8_customer_uuid: customer.servicem8_customer_uuid || ''
        } : undefined,
        servicem8_data: serviceM8Data
      };
    }) || [];

    const response = {
      jobs: transformedJobs,
      total: transformedJobs.length,
      has_servicem8_data: !!process.env.SERVICEM8_API_KEY
    };

    await logSupabaseCall("/api/admin/jobs", "GET", { status, customer, customerId, dateRange, sortBy, refresh }, response, 200, Date.now() - startedAt, user.id, ip, userAgent);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin jobs error:', error);
    await logSupabaseCall("/api/admin/jobs", "GET", {}, { error: 'Failed to load jobs' }, 500, Date.now() - startedAt, user.id, ip, userAgent, (error as Error).message);
    return NextResponse.json({ error: 'Failed to load jobs' }, { status: 500 });
  }
}
