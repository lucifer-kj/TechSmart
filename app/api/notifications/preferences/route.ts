import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getNotificationPreferencesService } from '@/lib/notification-preferences';
import { updateNotificationPreferencesSchema } from '@/lib/notification-preferences';
// import { z } from 'zod';

// GET - Get user's notification preferences
export async function GET() {
  try {
    const user = await requireAuth();
    const preferencesService = await getNotificationPreferencesService();

    const preferences = await preferencesService.getUserPreferences(user.id);
    if (!preferences) {
      return NextResponse.json(
        { error: 'Failed to fetch notification preferences' },
        { status: 500 }
      );
    }

    // Get notification statistics
    const stats = await preferencesService.getUserNotificationStats(user.id);

    return NextResponse.json({
      preferences,
      stats,
    });

  } catch (error) {
    console.error('Get notification preferences error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching preferences' },
      { status: 500 }
    );
  }
}

// PUT - Update user's notification preferences
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    // Validate the request body
    const validationResult = updateNotificationPreferencesSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => err.message).join(', ');
      return NextResponse.json(
        { error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const preferencesService = await getNotificationPreferencesService();
    const result = await preferencesService.updateUserPreferences(user.id, validationResult.data);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update preferences' },
        { status: 500 }
      );
    }

    // Get updated preferences
    const updatedPreferences = await preferencesService.getUserPreferences(user.id);

    return NextResponse.json({
      message: 'Notification preferences updated successfully',
      preferences: updatedPreferences,
    });

  } catch (error) {
    console.error('Update notification preferences error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating preferences' },
      { status: 500 }
    );
  }
}

// POST - Reset preferences to defaults
export async function POST() {
  try {
    const user = await requireAuth();
    const preferencesService = await getNotificationPreferencesService();

    const result = await preferencesService.resetToDefaults(user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to reset preferences' },
        { status: 500 }
      );
    }

    // Get default preferences
    const defaultPreferences = preferencesService.getDefaultPreferences();

    return NextResponse.json({
      message: 'Notification preferences reset to defaults',
      preferences: defaultPreferences,
    });

  } catch (error) {
    console.error('Reset notification preferences error:', error);
    return NextResponse.json(
      { error: 'An error occurred while resetting preferences' },
      { status: 500 }
    );
  }
}
