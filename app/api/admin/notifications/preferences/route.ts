import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { getNotificationPreferencesService } from '@/lib/notification-preferences';
import { updateNotificationPreferencesSchema } from '@/lib/notification-preferences';
import { z } from 'zod';

const bulkUpdateSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'At least one user ID is required'),
  preferences: updateNotificationPreferencesSchema,
});

const getUsersWithPreferenceSchema = z.object({
  preference: z.string().min(1, 'Preference key is required'),
  value: z.unknown(),
});

// GET - Get users with specific preference settings
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const preference = searchParams.get('preference');
    const value = searchParams.get('value');

    if (!preference || value === null) {
      return NextResponse.json(
        { error: 'Preference and value parameters are required' },
        { status: 400 }
      );
    }

    const validationResult = getUsersWithPreferenceSchema.safeParse({
      preference,
      value: value === 'true' ? true : value === 'false' ? false : value,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid preference parameters' },
        { status: 400 }
      );
    }

    const preferencesService = await getNotificationPreferencesService();
    const userIds = await preferencesService.getUsersWithPreference(
      preference as keyof import('@/lib/notification-preferences').NotificationPreferences,
      validationResult.data.value
    );

    return NextResponse.json({
      userIds,
      count: userIds.length,
    });

  } catch (error) {
    console.error('Get users with preference error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching users' },
      { status: 500 }
    );
  }
}

// POST - Bulk update notification preferences
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    // Validate the request body
    const validationResult = bulkUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((err) => err.message).join(', ');
      return NextResponse.json(
        { error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const { userIds, preferences } = validationResult.data;
    const preferencesService = await getNotificationPreferencesService();

    const result = await preferencesService.bulkUpdatePreferences(userIds, preferences);

    return NextResponse.json({
      message: 'Bulk preferences update completed',
      success: result.success,
      failed: result.failed,
      total: userIds.length,
    });

  } catch (error) {
    console.error('Bulk update preferences error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating preferences' },
      { status: 500 }
    );
  }
}
