import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ServiceM8Client, QuoteApproval } from "@/lib/servicem8";
import { getEmailTriggerService } from '@/lib/email-triggers';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.SERVICEM8_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ServiceM8 API key not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { signature, notes } = body;

    const client = new ServiceM8Client(apiKey);
    
    const approvalData: QuoteApproval = {
      approved: true,
      approval_date: new Date().toISOString(),
      customer_signature: signature,
      notes: notes
    };

    const { jobId } = await params;
    const result = await client.approveQuote(jobId, approvalData);

    // Send quote approval confirmation email
    try {
      const supabase = await createServerSupabase();
      
      // Get job information to find the customer
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('customer_id, quote_id')
        .eq('servicem8_job_id', jobId)
        .single();

      if (!jobError && job) {
        const emailTriggerService = await getEmailTriggerService();
        await emailTriggerService.sendQuoteApprovalEmail(job.quote_id, job.customer_id);
      }
    } catch (emailError) {
      console.error('Failed to send quote approval email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ 
      success: true, 
      message: "Quote approved successfully",
      result 
    });
  } catch (error) {
    console.error('ServiceM8 API Error:', error);
    return NextResponse.json({ error: 'Failed to approve quote' }, { status: 500 });
  }
}
