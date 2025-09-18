import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { getInvitationService } from '@/lib/invitation-service';

export async function GET() {
  try {
    await requireAdmin();

    const invitationService = await getInvitationService();
    const result = await invitationService.getInvitationStats();

    if (result.error) {
      return NextResponse.json(
        { message: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { stats: result.data },
      { status: 200 }
    );

  } catch (error) {
    console.error('Get invitation stats error:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching invitation statistics' },
      { status: 500 }
    );
  }
}
