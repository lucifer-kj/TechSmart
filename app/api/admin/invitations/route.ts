import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { getInvitationService } from '@/lib/invitation-service';
import { z } from 'zod';

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  customerId: z.string().min(1, 'Customer ID is required'),
  expiresInDays: z.number().min(1).max(30).optional().default(7),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await request.json();
    const validatedData = createInvitationSchema.parse(body);

    const invitationService = await getInvitationService();
    const result = await invitationService.createInvitation({
      email: validatedData.email,
      customerId: validatedData.customerId,
      invitedBy: user.id,
      expiresInDays: validatedData.expiresInDays,
    });

    if (result.error) {
      return NextResponse.json(
        { message: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Invitation created successfully',
        invitation: result.data 
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
    const user = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    const invitationService = await getInvitationService();
    
    let result;
    if (customerId) {
      result = await invitationService.getCustomerInvitations(customerId);
    } else {
      result = await invitationService.getUserInvitations(user.id);
    }

    if (result.error) {
      return NextResponse.json(
        { message: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { invitations: result.data },
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
