import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
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
    // Get customer statistics
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, created_at, updated_at');

    if (customersError) throw customersError;

    // Get job statistics
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, status, generated_job_total, created_at, updated_at');

    if (jobsError) throw jobsError;

    // Get recent activity from various tables
    const { data: recentCustomers, error: recentCustomersError } = await supabase
      .from('customers')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentCustomersError) throw recentCustomersError;

    const { data: recentJobs, error: recentJobsError } = await supabase
      .from('jobs')
      .select('id, job_no, status, updated_at, customer_id')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (recentJobsError) throw recentJobsError;

    const { data: recentFeedback, error: recentFeedbackError } = await supabase
      .from('customer_feedback')
      .select('id, feedback_type, submitted_at, customer_id')
      .order('submitted_at', { ascending: false })
      .limit(5);

    if (recentFeedbackError) throw recentFeedbackError;

    // Calculate statistics
    const totalCustomers = customers?.length || 0;
    const activeCustomers = customers?.filter(c => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return new Date(c.updated_at) > thirtyDaysAgo;
    }).length || 0;

    const totalJobs = jobs?.length || 0;
    const activeJobs = jobs?.filter(j => j.status !== 'Complete' && j.status !== 'Cancelled').length || 0;
    const pendingApprovals = jobs?.filter(j => j.status === 'Quote').length || 0;
    const totalRevenue = jobs?.reduce((sum, job) => sum + (job.generated_job_total || 0), 0) || 0;

    // Build recent activity
    const recentActivity: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: string;
      customerName?: string;
      jobNumber?: string;
      amount?: number;
    }> = [];

    // Add recent customer creations
    recentCustomers?.forEach(customer => {
      recentActivity.push({
        id: `customer-${customer.id}`,
        type: 'customer_created',
        description: `New customer created: ${customer.name}`,
        timestamp: customer.created_at,
        customerName: customer.name
      });
    });

    // Add recent job updates
    recentJobs?.forEach(job => {
      recentActivity.push({
        id: `job-${job.id}`,
        type: 'job_updated',
        description: `Job #${job.job_no} status updated to ${job.status}`,
        timestamp: job.updated_at,
        jobNumber: job.job_no
      });
    });

    // Add recent feedback
    recentFeedback?.forEach(feedback => {
      recentActivity.push({
        id: `feedback-${feedback.id}`,
        type: 'feedback_submitted',
        description: `Customer submitted ${feedback.feedback_type} feedback`,
        timestamp: feedback.submitted_at
      });
    });

    // Sort by timestamp and limit to 20 most recent
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    recentActivity.splice(20);

    const stats = {
      totalCustomers,
      activeCustomers,
      totalJobs,
      activeJobs,
      pendingApprovals,
      totalRevenue,
      recentActivity
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
