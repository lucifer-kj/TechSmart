import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ServiceM8Client, generateIdempotencyKey } from "@/lib/servicem8";

type FeedbackRequest = {
  job_id: string;
  feedback_text: string;
  rating?: number; // 1-5 rating
  category?: string; // 'quality', 'service', 'timeliness', 'general'
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
    .select("customer_id, role, is_active, full_name")
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
    const body = await request.json() as FeedbackRequest;
    const { job_id, feedback_text, rating, category } = body;

    if (!job_id || !feedback_text?.trim()) {
      return NextResponse.json({ error: "Job ID and feedback text are required" }, { status: 400 });
    }

    // Verify the customer has access to this job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, servicem8_job_uuid, job_no, description, customer_id')
      .eq('id', job_id)
      .eq('customer_id', profile.customer_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found or access denied" }, { status: 404 });
    }

    // Check if customer_feedback table exists, if not use a generic approach
    let feedbackId: string;
    
    try {
      // Try to insert into customer_feedback table
      const { data: feedback, error: feedbackError } = await supabase
        .from('customer_feedback')
        .insert({
          customer_id: profile.customer_id,
          job_id: job_id,
          feedback_text: feedback_text.trim(),
          rating: rating || null,
          category: category || 'general',
          submitted_by: user.id,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (feedbackError) throw feedbackError;
      feedbackId = feedback.id;
    } catch {
      // Fallback: create a simple feedback record in a generic way
      console.warn('customer_feedback table not found, using fallback approach');
      feedbackId = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Log feedback to audit logs or another table
      await supabase
        .from('audit_logs')
        .insert({
          event: 'customer_feedback_submitted',
          user_id: user.id,
          customer_id: profile.customer_id,
          metadata: {
            job_id: job_id,
            job_no: job.job_no,
            feedback_text: feedback_text.trim(),
            rating: rating || null,
            category: category || 'general',
            customer_name: profile.full_name
          },
          created_at: new Date().toISOString()
        });
    }

    // Sync feedback to ServiceM8 if API key is available
    let serviceM8Synced = false;
    let serviceM8Error = null;

    if (process.env.SERVICEM8_API_KEY && job.servicem8_job_uuid) {
      try {
        const serviceM8Client = new ServiceM8Client(process.env.SERVICEM8_API_KEY);
        const idempotencyKey = generateIdempotencyKey('customer-feedback', feedbackId);

        // Format feedback note for ServiceM8
        let noteText = `Customer Feedback from ${profile.full_name || 'Customer'}:\n\n${feedback_text.trim()}`;
        
        if (rating) {
          noteText += `\n\nRating: ${rating}/5 stars`;
        }
        
        if (category && category !== 'general') {
          noteText += `\nCategory: ${category}`;
        }

        // Add job note to ServiceM8
        await serviceM8Client.addJobNote(job.servicem8_job_uuid, {
          note: noteText,
          note_type: 'customer_feedback'
        }, idempotencyKey);

        serviceM8Synced = true;
        console.log(`✅ Customer feedback synced to ServiceM8 job: ${job.servicem8_job_uuid}`);

      } catch (error) {
        console.error('ServiceM8 feedback sync error:', error);
        serviceM8Error = (error as Error).message;
        // Don't fail the operation if ServiceM8 sync fails
      }
    }

    const response = {
      success: true,
      message: "Feedback submitted successfully",
      feedback: {
        id: feedbackId,
        job_id: job_id,
        job_no: job.job_no,
        feedback_text: feedback_text.trim(),
        rating: rating || null,
        category: category || 'general',
        submitted_at: new Date().toISOString()
      },
      servicem8_sync: {
        attempted: !!process.env.SERVICEM8_API_KEY,
        synced: serviceM8Synced,
        error: serviceM8Error
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json({ 
      error: 'Failed to submit feedback',
      details: (error as Error).message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("customer_id, role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  if (profile.role !== 'customer' || !profile.is_active || !profile.customer_id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    // Try to get feedback from customer_feedback table
    let query = supabase
      .from('customer_feedback')
      .select(`
        id,
        feedback_text,
        rating,
        category,
        created_at,
        jobs!inner(id, job_no, description)
      `)
      .eq('customer_id', profile.customer_id)
      .order('created_at', { ascending: false });

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data: feedback, error: feedbackError } = await query;

    if (feedbackError) {
      // Fallback: get feedback from audit logs
      const { data: auditFeedback } = await supabase
        .from('audit_logs')
        .select('metadata, created_at')
        .eq('customer_id', profile.customer_id)
        .eq('event', 'customer_feedback_submitted')
        .order('created_at', { ascending: false });

      const transformedFeedback = auditFeedback?.map(log => ({
        id: `audit-${log.created_at}`,
        feedback_text: log.metadata?.feedback_text || '',
        rating: log.metadata?.rating || null,
        category: log.metadata?.category || 'general',
        created_at: log.created_at,
        job_no: log.metadata?.job_no || '',
        job_description: 'Job details not available'
      })) || [];

      return NextResponse.json({ feedback: transformedFeedback });
    }

    return NextResponse.json({ feedback: feedback || [] });

  } catch (error) {
    console.error('Feedback retrieval error:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve feedback' 
    }, { status: 500 });
  }
}
