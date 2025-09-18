import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { getNotificationPreferencesService } from '@/lib/notification-preferences';
import { z } from 'zod';
import crypto from 'crypto';

const unsubscribeSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email('Invalid email address').optional(),
});

// GET - Unsubscribe page (verify token and show form)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Unsubscribe token is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    // Verify the unsubscribe token
    const { data: unsubscribeRecord, error } = await supabase
      .from('unsubscribe_tokens')
      .select('id, user_id, email, expires_at, used_at')
      .eq('token', token)
      .single();

    if (error || !unsubscribeRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(unsubscribeRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Unsubscribe token has expired' },
        { status: 400 }
      );
    }

    // Check if already used
    if (unsubscribeRecord.used_at) {
      return NextResponse.json(
        { error: 'This unsubscribe link has already been used' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: unsubscribeRecord.email,
      userId: unsubscribeRecord.user_id,
    });

  } catch (error) {
    console.error('Verify unsubscribe token error:', error);
    return NextResponse.json(
      { error: 'An error occurred while verifying unsubscribe token' },
      { status: 500 }
    );
  }
}

// POST - Process unsubscribe request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = unsubscribeSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => err.message).join(', ');
      return NextResponse.json(
        { error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const { token } = validationResult.data;
    const supabase = await createServerSupabase();

    // Verify the unsubscribe token
    const { data: unsubscribeRecord, error } = await supabase
      .from('unsubscribe_tokens')
      .select('id, user_id, email, expires_at, used_at')
      .eq('token', token)
      .single();

    if (error || !unsubscribeRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(unsubscribeRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Unsubscribe token has expired' },
        { status: 400 }
      );
    }

    // Check if already used
    if (unsubscribeRecord.used_at) {
      return NextResponse.json(
        { error: 'This unsubscribe link has already been used' },
        { status: 400 }
      );
    }

    // Update user preferences to disable email notifications
    const preferencesService = await getNotificationPreferencesService();
    const result = await preferencesService.updateUserPreferences(
      unsubscribeRecord.user_id,
      { email_notifications: false }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to update notification preferences' },
        { status: 500 }
      );
    }

    // Mark token as used
    await supabase
      .from('unsubscribe_tokens')
      .update({
        used_at: new Date().toISOString(),
      })
      .eq('id', unsubscribeRecord.id);

    // Log the unsubscribe action
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
        action: 'email_unsubscribed',
        user_id: unsubscribeRecord.user_id,
        details: {
          email: unsubscribeRecord.email,
          token_id: unsubscribeRecord.id,
        },
        ip_address: getIpAddress(),
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    return NextResponse.json({
      message: 'Successfully unsubscribed from email notifications',
      email: unsubscribeRecord.email,
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing unsubscribe request' },
      { status: 500 }
    );
  }
}

// Generate unsubscribe token for a user
export async function generateUnsubscribeToken(userId: string, email: string): Promise<string> {
  const supabase = await createServerSupabase();
  
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

  await supabase
    .from('unsubscribe_tokens')
    .insert({
      token,
      user_id: userId,
      email,
      expires_at: expiresAt.toISOString(),
    });

  return token;
}

// Generate unsubscribe URL
export function generateUnsubscribeUrl(token: string, email: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/notifications/unsubscribe?token=${token}&email=${encodeURIComponent(email)}`;
}
