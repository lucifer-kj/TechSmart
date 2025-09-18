import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { z } from 'zod';

const validateTokenSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = validateTokenSchema.parse(body);

    const supabase = await createServerSupabase();

    // Verify the token
    const { data: { user }, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });

    if (error || !user) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if user is active
    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { message: 'Account not confirmed' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Token is valid', user: { id: user.id, email: user.email } },
      { status: 200 }
    );

  } catch (error) {
    console.error('Token validation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid token format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'An error occurred while validating token' },
      { status: 500 }
    );
  }
}
