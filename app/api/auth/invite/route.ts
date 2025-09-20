import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { getEmailTriggerService } from '@/lib/email-triggers';
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  customerId: z.string().min(1, 'Customer ID is required'),
  expiresInDays: z.number().min(1).max(30).optional().default(7),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const validatedData = createInvitationSchema.parse(body);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .rpc('admin_create_portal_invitation', {
        p_customer_id: validatedData.customerId,
        p_email: validatedData.email,
        p_expires_in_days: validatedData.expiresInDays,
      });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: error?.message || 'Failed to create invitation' }, { status: 400 });
    }

    const [{ invitation_id, raw_token, expires_at }] = data as Array<{ invitation_id: string; raw_token: string; expires_at: string }>;

    try {
      const emailTriggerService = await getEmailTriggerService();
      await emailTriggerService.sendInvitationEmail(invitation_id, raw_token, expires_at);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
    }

    return NextResponse.json({ 
      invitation: { id: invitation_id, email: validatedData.email, expires_at },
      message: 'Invitation created and email sent successfully'
    });

  } catch (error) {
    console.error('Create invitation error:', error);
    
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues?.[0];
      const message = firstIssue?.message || 'Invalid request payload';
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred while creating the invitation' },
      { status: 500 }
    );
  }
}


