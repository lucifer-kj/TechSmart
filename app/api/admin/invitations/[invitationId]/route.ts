import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { getInvitationService } from '@/lib/invitation-service';

interface RouteParams {
  params: Promise<{ invitationId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin();
    const { invitationId } = await params;

    const invitationService = await getInvitationService();
    const result = await invitationService.cancelInvitation(invitationId, user.id);

    if (result.error) {
      return NextResponse.json(
        { message: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Invitation cancelled successfully' },
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
    const user = await requireAdmin();
    const { invitationId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action !== 'resend') {
      return NextResponse.json(
        { message: 'Invalid action' },
        { status: 400 }
      );
    }

    const invitationService = await getInvitationService();
    const result = await invitationService.resendInvitation(invitationId, user.id);

    if (result.error) {
      return NextResponse.json(
        { message: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Invitation resent successfully',
        invitation: result.data 
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
