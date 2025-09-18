import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { 
  profileUpdateSchema, 
  passwordChangeSchema,
  type ProfileUpdateRequest,
  type PasswordChangeRequest,
  type ProfileApiResponse,
  type ExtendedProfile,
} from '@/lib/types/profile';
// import { z } from 'zod';

// GET - Fetch user profile
export async function GET(): Promise<NextResponse<ProfileApiResponse<ExtendedProfile>>> {
  try {
    const user = await requireAuth();
    const supabase = await createServerSupabase();

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Profile not found',
          errors: { profile: ['Profile not found'] }
        },
        { status: 404 }
      );
    }

    // Get extended profile data (if exists in additional tables)
    const { data: extendedData } = await supabase
      .from('user_profile_extensions')
      .select('phone, address, company, avatar_url, timezone, language, notification_preferences')
      .eq('user_id', user.id)
      .single();

    // Get notification preferences
    const { data: notificationData } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const extendedProfile: ExtendedProfile = {
      ...profile,
      phone: extendedData?.phone || null,
      address: extendedData?.address || null,
      company: extendedData?.company || null,
      avatar_url: extendedData?.avatar_url || null,
      timezone: extendedData?.timezone || 'UTC',
      language: extendedData?.language || 'en',
      notification_preferences: notificationData ? {
        email_notifications: notificationData.email_notifications ?? true,
        push_notifications: notificationData.push_notifications ?? false,
        sms_notifications: notificationData.sms_notifications ?? false,
        job_updates: notificationData.job_updates ?? true,
        payment_reminders: notificationData.payment_reminders ?? true,
        document_notifications: notificationData.document_notifications ?? true,
        quote_approvals: notificationData.quote_approvals ?? true,
        frequency: notificationData.frequency ?? 'immediate',
      } : {
        email_notifications: true,
        push_notifications: false,
        sms_notifications: false,
        job_updates: true,
        payment_reminders: true,
        document_notifications: true,
        quote_approvals: true,
        frequency: 'immediate',
      },
    };

    return NextResponse.json(
      { 
        success: true, 
        data: extendedProfile 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'An error occurred while fetching profile',
        errors: { general: ['Internal server error'] }
      },
      { status: 500 }
    );
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest): Promise<NextResponse<ProfileApiResponse<ExtendedProfile>>> {
  try {
    const user = await requireAuth();
    const supabase = await createServerSupabase();
    const body = await request.json();

    // Validate input
    const validationResult = profileUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      const errors: Record<string, string[]> = {};
      validationResult.error.issues.forEach((error) => {
        const field = error.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(error.message);
      });

      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation failed',
          errors 
        },
        { status: 400 }
      );
    }

    const updateData: ProfileUpdateRequest = validationResult.data;

    // Update main profile
    const profileUpdates: Record<string, unknown> = {};
    if (updateData.full_name !== undefined) {
      profileUpdates.full_name = updateData.full_name;
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          ...profileUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Failed to update profile',
            errors: { profile: [profileError.message] }
          },
          { status: 500 }
        );
      }
    }

    // Update extended profile data
    const extendedUpdates: Record<string, unknown> = {};
    if (updateData.phone !== undefined) extendedUpdates.phone = updateData.phone || null;
    if (updateData.address !== undefined) extendedUpdates.address = updateData.address || null;
    if (updateData.company !== undefined) extendedUpdates.company = updateData.company || null;
    if (updateData.timezone !== undefined) extendedUpdates.timezone = updateData.timezone || 'UTC';
    if (updateData.language !== undefined) extendedUpdates.language = updateData.language || 'en';

    if (Object.keys(extendedUpdates).length > 0) {
      const { error: extendedError } = await supabase
        .from('user_profile_extensions')
        .upsert({
          user_id: user.id,
          ...extendedUpdates,
          updated_at: new Date().toISOString(),
        });

      if (extendedError) {
        console.error('Extended profile update error:', extendedError);
        // Don't fail the request, just log the error
      }
    }

    // Update notification preferences
    if (updateData.notification_preferences) {
      const { error: notificationError } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          ...updateData.notification_preferences,
          updated_at: new Date().toISOString(),
        });

      if (notificationError) {
        console.error('Notification preferences update error:', notificationError);
        // Don't fail the request, just log the error
      }
    }

    // Log the profile update
    const getIpAddress = (): string => {
      const forwarded = request.headers.get('x-forwarded-for');
      if (forwarded && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
      }
      // NextRequest has no ip property; rely on headers only
      return 'unknown';
    };
    await supabase
      .from('audit_logs')
      .insert({
        action: 'profile_updated',
        user_id: user.id,
        details: { 
          updated_fields: Object.keys(updateData),
          ip_address: getIpAddress(),
          user_agent: request.headers.get('user-agent') || 'unknown',
        },
      });

    // Fetch updated profile
    const response = await GET();
    return response;

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'An error occurred while updating profile',
        errors: { general: ['Internal server error'] }
      },
      { status: 500 }
    );
  }
}

// POST - Change password
export async function POST(request: NextRequest): Promise<NextResponse<ProfileApiResponse>> {
  try {
    const user = await requireAuth();
    const supabase = await createServerSupabase();
    const body = await request.json();

    // Validate input
    const validationResult = passwordChangeSchema.safeParse(body);
    if (!validationResult.success) {
      const errors: Record<string, string[]> = {};
      validationResult.error.issues.forEach((error) => {
        const field = error.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(error.message);
      });

      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation failed',
          errors 
        },
        { status: 400 }
      );
    }

    const { current_password, new_password }: PasswordChangeRequest = validationResult.data;

    // Verify current password
    if (!user.email) {
      return NextResponse.json(
        {
          success: false,
          message: 'User email not found',
          errors: { general: ['User email not found'] },
        },
        { status: 400 }
      );
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current_password,
    });

    if (verifyError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Current password is incorrect',
          errors: { current_password: ['Current password is incorrect'] }
        },
        { status: 400 }
      );
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password,
    });

    if (updateError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to update password',
          errors: { general: [updateError.message] }
        },
        { status: 500 }
      );
    }

    // Log the password change
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
        action: 'password_changed',
        user_id: user.id,
        details: { 
          ip_address: getIpAddress(),
          user_agent: request.headers.get('user-agent') || 'unknown',
        },
      });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Password updated successfully' 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'An error occurred while changing password',
        errors: { general: ['Internal server error'] }
      },
      { status: 500 }
    );
  }
}
