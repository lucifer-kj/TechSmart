import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PUT(
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
    const body = await request.json();
    const { status } = body;

    if (!status || !['Quote', 'Work Order', 'Invoice', 'Complete', 'Cancelled'].includes(status)) {
      return NextResponse.json({ 
        error: "Valid status is required (Quote, Work Order, Invoice, Complete, Cancelled)" 
      }, { status: 400 });
    }

    // Verify job exists
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ 
        error: "Job not found" 
      }, { status: 404 });
    }

    // Update job status
    const { error: updateError } = await supabase
      .from('jobs')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (updateError) throw updateError;

    // Log the status change for audit purposes
    const { error: logError } = await supabase
      .from('job_status_changes')
      .insert({
        job_id: jobId,
        previous_status: job.status,
        new_status: status,
        changed_by: user.id,
        changed_at: new Date().toISOString(),
        change_reason: 'Admin status update'
      });

    if (logError) {
      console.warn('Failed to log status change:', logError);
      // Don't fail the whole operation for logging errors
    }

    return NextResponse.json({ 
      message: `Job status updated to ${status}`,
      previousStatus: job.status,
      newStatus: status
    });
  } catch (error) {
    console.error('Job status update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update job status' 
    }, { status: 500 });
  }
}
