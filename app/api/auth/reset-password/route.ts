import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const supabase = await createServerSupabase();

    // Verify the token and get the user
    const { data: { user }, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });

    if (verifyError || !user) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Update the password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { message: 'Failed to update password. Please try again.' },
        { status: 500 }
      );
    }

    // Log the password reset completion
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
        action: 'password_reset_completed',
        user_id: user.id,
        details: { email: user.email },
        ip_address: getIpAddress(),
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    return NextResponse.json(
      { message: 'Password updated successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
