import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { z } from 'zod';
import { createClient } from "@supabase/supabase-js";
import { getEmailTriggerService } from '@/lib/email-triggers';

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  customerId: z.string().min(1, 'Customer ID is required'),
  expiresInDays: z.number().min(1).max(30).optional().default(7),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const validatedData = createInvitationSchema.parse(body);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.rpc('admin_create_portal_invitation', {
      p_customer_id: validatedData.customerId,
      p_email: validatedData.email,
      p_expires_in_days: validatedData.expiresInDays,
    });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { message: error?.message || 'Failed to create invitation' },
        { status: 400 }
      );
    }

    const [{ invitation_id, raw_token, expires_at }] = data as Array<{ invitation_id: string; raw_token: string; expires_at: string }>;

    try {
      const emailTriggerService = await getEmailTriggerService();
      await emailTriggerService.sendInvitationEmail(invitation_id, raw_token, expires_at);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
    }

    return NextResponse.json(
      { 
        message: 'Invitation created successfully',
        invitation: { id: invitation_id, email: validatedData.email, expires_at }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create invitation error:', error);
    
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues?.[0];
      const message = firstIssue?.message || 'Invalid request payload';
      return NextResponse.json(
        { message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'An error occurred while creating the invitation' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase.from('portal_invitations').select('*').order('created_at', { ascending: false });
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { invitations: data },
      { status: 200 }
    );

  } catch (error) {
    console.error('Get invitations error:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching invitations' },
      { status: 500 }
    );
  }
}
