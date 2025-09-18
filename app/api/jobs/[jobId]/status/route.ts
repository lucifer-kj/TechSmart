import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getEmailTriggerService } from '@/lib/email-triggers';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { z } from 'zod';

const updateJobStatusSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  description: z.string().optional(),
  notifyCustomer: z.boolean().optional().default(true),
});

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

// PUT - Update job status and optionally send notification email
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { jobId } = await params;
    const body = await request.json();
    const validatedData = updateJobStatusSchema.parse(body);

    const supabase = await createServerSupabase();

    // Get job information
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, customer_id, title, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to update this job
    if (user.profile?.role !== 'admin' && job.customer_id !== user.profile?.customer_id) {
      return NextResponse.json(
        { error: 'Unauthorized to update this job' },
        { status: 403 }
      );
    }

    // Update job status
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: validatedData.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update job status' },
        { status: 500 }
      );
    }

    // Send notification email if requested
    if (validatedData.notifyCustomer && job.customer_id) {
      try {
        const emailTriggerService = await getEmailTriggerService();
        await emailTriggerService.sendJobUpdateEmail(
          jobId,
          job.customer_id,
          validatedData.status,
          validatedData.description
        );
      } catch (emailError) {
        console.error('Failed to send job update email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Log the status update
    const getIpAddress = (): string => {
      const forwarded = request.headers.get('x-forwarded-for');
      if (forwarded && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
      }
      return 'unknown';
    };
    await supabase
      .from('audit_logs')
      .insert({
        action: 'job_status_updated',
        user_id: user.id,
        details: {
          job_id: jobId,
          old_status: job.status,
          new_status: validatedData.status,
          description: validatedData.description,
        },
        ip_address: getIpAddress(),
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    return NextResponse.json({
      message: 'Job status updated successfully',
      job: {
        id: jobId,
        status: validatedData.status,
        description: validatedData.description,
      },
    });

  } catch (error) {
    console.error('Update job status error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred while updating job status' },
      { status: 500 }
    );
  }
}
