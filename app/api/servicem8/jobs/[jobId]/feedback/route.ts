import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ServiceM8Client } from "@/lib/servicem8";
import { createClient } from "@supabase/supabase-js";

export async function POST(
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

  try {
    const { jobId } = await params;
    const body = await request.json();
    const { feedback, note_type = 'customer_feedback' } = body;

    if (!feedback?.trim()) {
      return NextResponse.json({ 
        error: "Feedback is required" 
      }, { status: 400 });
    }

    // Get user profile to check role and get customer info
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, customer_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Get job details to verify customer access
    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_id, servicem8_job_uuid')
      .eq('id', jobId)
      .single();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify customer can access this job
    if (profile.role === 'customer' && job.customer_id !== profile.customer_id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Store feedback in Supabase first
    const { data: feedbackRecord, error: feedbackError } = await supabase
      .from('customer_feedback')
      .insert({
        job_id: jobId,
        customer_id: job.customer_id,
        feedback_text: feedback.trim(),
        note_type,
        submitted_by: user.id,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (feedbackError) throw feedbackError;

    // If we have a ServiceM8 job UUID, also send to ServiceM8
    if (job.servicem8_job_uuid && process.env.SERVICEM8_API_KEY) {
      try {
        const servicem8Client = new ServiceM8Client(process.env.SERVICEM8_API_KEY);
        
        // Format feedback for ServiceM8
        const servicem8Note = `Customer Feedback: ${feedback.trim()}`;
        
        await servicem8Client.addJobNote(job.servicem8_job_uuid, {
          note: servicem8Note,
          note_type: 'customer_feedback'
        });

        // Update the feedback record to mark it as synced
        await supabase
          .from('customer_feedback')
          .update({ 
            servicem8_synced: true,
            servicem8_synced_at: new Date().toISOString()
          })
          .eq('id', feedbackRecord.id);

      } catch (servicem8Error) {
        console.error('ServiceM8 sync error:', servicem8Error);
        
        // Log the sync failure but don't fail the request
        await supabase
          .from('customer_feedback')
          .update({ 
            servicem8_sync_error: (servicem8Error as Error).message,
            servicem8_sync_attempted_at: new Date().toISOString()
          })
          .eq('id', feedbackRecord.id);
      }
    }

    return NextResponse.json({ 
      message: "Feedback submitted successfully",
      feedback: feedbackRecord
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json({ 
      error: 'Failed to submit feedback' 
    }, { status: 500 });
  }
}
