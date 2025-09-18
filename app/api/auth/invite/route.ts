import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { getInvitationService } from "@/lib/invitation-service";
import { getEmailTriggerService } from '@/lib/email-triggers';
import { z } from "zod";

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  customerId: z.string().min(1, 'Customer ID is required'),
  expiresInDays: z.number().min(1).max(30).optional().default(7),
});

export async function POST(request: Request) {
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
        { error: result.error.message },
        { status: 400 }
      );
    }

    // Send invitation email
    try {
      if (result.data) {
        const emailTriggerService = await getEmailTriggerService();
        await emailTriggerService.sendInvitationEmail(result.data.id);
      }
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ 
      invitation: result.data,
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


