import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { createClient } from "@supabase/supabase-js";
import { getEmailTriggerService } from '@/lib/email-triggers';

interface RouteParams {
  params: Promise<{ invitationId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { invitationId } = await params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.rpc('admin_revoke_portal_invitation', { p_invitation_id: invitationId });
    if (error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Invitation revoked successfully', success: !!data },
      { status: 200 }
    );

  } catch (error) {
    console.error('Cancel invitation error:', error);
    return NextResponse.json(
      { message: 'An error occurred while cancelling the invitation' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { invitationId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action !== 'resend') {
      return NextResponse.json(
        { message: 'Invalid action' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.rpc('admin_resend_portal_invitation', { p_invitation_id: invitationId });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { message: error?.message || 'Failed to resend invitation' },
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
        message: 'Invitation resent successfully',
        invitation: { id: invitation_id, expires_at }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Resend invitation error:', error);
    return NextResponse.json(
      { message: 'An error occurred while resending the invitation' },
      { status: 500 }
    );
  }
}
