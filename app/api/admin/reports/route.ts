import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    // Get basic counts
    const [
      { count: totalCustomers },
      { count: activeUsers },
      { count: totalJobs },
      { count: completedJobs },
      { count: pendingQuotes },
      { count: approvedQuotes },
      { count: totalDocuments }
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('role', 'customer'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'Complete'),
      supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('documents').select('*', { count: 'exact', head: true })
    ]);

    // Handle document acknowledgments separately since the table might not exist
    let acknowledgedDocuments = 0;
    try {
      const { count } = await supabase.from('document_acknowledgments').select('*', { count: 'exact', head: true });
      acknowledgedDocuments = count || 0;
    } catch (error) {
      // Table doesn't exist or other error, default to 0
      console.warn('document_acknowledgments table not found or error:', error);
    }

    // Get financial data
    const { data: completedJobsData } = await supabase
      .from('jobs')
      .select('generated_job_total')
      .eq('status', 'Complete');

    const { data: pendingPaymentsData } = await supabase
      .from('payments')
      .select('amount_cents')
      .neq('status', 'paid');

    const totalRevenue = completedJobsData?.reduce((sum, job) => sum + (job.generated_job_total || 0), 0) || 0;
    const pendingPayments = pendingPaymentsData?.reduce((sum, payment) => sum + (payment.amount_cents / 100), 0) || 0;

    // Get jobs by status
    const { data: jobsByStatusData } = await supabase
      .from('jobs')
      .select('status, generated_job_total');

    const jobsByStatus = jobsByStatusData?.reduce((acc, job) => {
      const status = job.status || 'Unknown';
      if (!acc[status]) {
        acc[status] = { count: 0, value: 0 };
      }
      acc[status].count++;
      acc[status].value += job.generated_job_total || 0;
      return acc;
    }, {} as Record<string, { count: number; value: number }>) || {};

    const jobsByStatusArray = Object.entries(jobsByStatus).map(([status, data]) => ({
      status,
      count: data.count,
      value: data.value
    }));

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('audit_logs')
      .select(`
        id,
        event,
        created_at,
        metadata,
        customers!inner(name),
        user_profiles!actor_id(email)
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    const formattedActivity = recentActivity?.map(activity => ({
      id: activity.id,
      event: activity.event,
      customer_name: Array.isArray(activity.customers) ? (activity.customers[0] as Record<string, unknown>)?.name : (activity.customers as Record<string, unknown>)?.name,
      actor_email: Array.isArray(activity.user_profiles) ? (activity.user_profiles[0] as Record<string, unknown>)?.email : (activity.user_profiles as Record<string, unknown>)?.email,
      created_at: activity.created_at,
      metadata: activity.metadata
    })) || [];

    // Get customer growth data (last 12 months)
    const customerGrowth = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const [
        { count: monthCustomers },
        { count: monthUsers },
        { count: monthJobs }
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true })
          .lte('created_at', monthEnd.toISOString()),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true })
          .eq('role', 'customer')
          .lte('created_at', monthEnd.toISOString()),
        supabase.from('jobs').select('*', { count: 'exact', head: true })
          .lte('created_at', monthEnd.toISOString())
      ]);

      customerGrowth.push({
        month: monthStart.toLocaleDateString('en-AU', { year: 'numeric', month: 'short' }),
        customers: monthCustomers || 0,
        users: monthUsers || 0,
        jobs: monthJobs || 0
      });
    }

    const reportData = {
      totalCustomers: totalCustomers || 0,
      activeUsers: activeUsers || 0,
      totalJobs: totalJobs || 0,
      completedJobs: completedJobs || 0,
      pendingQuotes: pendingQuotes || 0,
      approvedQuotes: approvedQuotes || 0,
      totalDocuments: totalDocuments || 0,
      acknowledgedDocuments,
      totalRevenue,
      pendingPayments,
      recentActivity: formattedActivity,
      customerGrowth,
      jobsByStatus: jobsByStatusArray
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 });
  }
}
