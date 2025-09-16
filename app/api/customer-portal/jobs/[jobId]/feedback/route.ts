import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { customerPortalAPI } from "@/lib/customer-portal-api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobId } = await params;
    const body = await request.json();
    const { feedback, rating, feedbackType } = body;

    if (!feedback?.trim()) {
      return NextResponse.json({ 
        error: "Feedback is required" 
      }, { status: 400 });
    }

    // For now, use a mock company UUID - in production, this would come from the session
    const companyUuid = "company-123";
    
    const success = await customerPortalAPI.submitFeedback(
      jobId,
      {
        feedback: feedback.trim(),
        rating: rating || 0,
        feedbackType: feedbackType || 'general',
        submittedAt: new Date().toISOString()
      },
      companyUuid
    );

    if (success) {
      return NextResponse.json({ 
        message: "Feedback submitted successfully" 
      });
    } else {
      return NextResponse.json({ 
        error: "Failed to submit feedback" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json({ 
      error: 'Failed to submit feedback' 
    }, { status: 500 });
  }
}
