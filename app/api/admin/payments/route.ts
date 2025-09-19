import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SyncService } from "@/lib/sync-service";

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
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
        console.warn('Admin payments refresh failed:', e);
      }
    }

    // Get jobs that represent payments (Invoice or Complete status)
    let query = supabase
      .from('jobs')
      .select(`
        id,
        job_no,
        description,
        status,
        generated_job_total,
        date_completed,
        created_at,
        updated_at,
        customer_id,
        customers!inner(
          id,
          name,
          email
        )
      `)
      .in('status', ['Invoice', 'Complete'])
      .order('updated_at', { ascending: false });

    // Apply filters
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    }
    
    if (dateTo) {
      query = query.lte('created_at', new Date(dateTo).toISOString());
    }

    const { data: jobs, error: jobsError } = await query;
    if (jobsError) throw jobsError;

    // Transform jobs into payment records
    const payments = (jobs || []).map(job => {
      const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
      return {
        id: job.id,
        job_id: job.id,
        job_number: job.job_no,
        job_description: job.description,
        amount: job.generated_job_total,
        currency: 'AUD', // Default currency
        status: getPaymentStatus(job.status, job.date_completed),
        reference: job.job_no,
        due_date: calculateDueDate(job.created_at),
        paid_date: job.status === 'Complete' ? job.date_completed : null,
        created_at: job.created_at,
        updated_at: job.updated_at,
        customer_id: job.customer_id,
        customer_name: customer?.name || 'Unknown',
        customer_email: customer?.email || ''
      };
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Admin payments error:', error);
    return NextResponse.json({ error: 'Failed to load payments' }, { status: 500 });
  }
}

function getPaymentStatus(jobStatus: string, dateCompleted?: string): 'pending' | 'paid' | 'overdue' {
  if (jobStatus === 'Complete' && dateCompleted) {
    return 'paid';
  }
  
  if (jobStatus === 'Invoice') {
    // Check if overdue (more than 30 days old)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (new Date() > thirtyDaysAgo) {
      return 'overdue';
    }
    
    return 'pending';
  }
  
  return 'pending';
}

function calculateDueDate(createdAt: string): string {
  const created = new Date(createdAt);
  const due = new Date(created);
  due.setDate(due.getDate() + 30); // 30 days payment terms
  return due.toISOString();
}


