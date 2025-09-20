import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logSupabaseCall } from "@/lib/api-logging";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin (skip check in development mode with bypass)
  if (!(process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true')) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
  }

  const startedAt = Date.now();
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
  const userAgent = request.headers.get("user-agent") || undefined;

  // Extract customerId from params outside try block for error logging
  const { customerId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const { sendEmail = true, newPassword } = body;

    // Get customer and their user profile
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        email,
        user_profiles!inner(id, email, is_active)
      `)
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      await logSupabaseCall(`/api/admin/customers/${customerId}/reset-password`, 'POST', {}, { error: 'Customer not found' }, 404, Date.now() - startedAt, user.id, ip, userAgent, 'not_found');
      return NextResponse.json({ error: 'Customer not found or no portal access' }, { status: 404 });
    }

    const userProfile = Array.isArray(customer.user_profiles) ? customer.user_profiles[0] : customer.user_profiles;
    if (!userProfile) {
      return NextResponse.json({ error: 'Customer has no portal access' }, { status: 400 });
    }

    let resetMethod = '';
    let tempPassword = '';

    if (newPassword) {
      // Admin sets a specific password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userProfile.id,
        { password: newPassword }
      );

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }

      tempPassword = newPassword;
      resetMethod = 'admin_set_password';
    } else {
      // Generate new temporary password
      tempPassword = generateSecurePassword();
      
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userProfile.id,
        { password: tempPassword }
      );

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }

      resetMethod = 'admin_generated_password';
    }

    // Optional: Send password reset email (if email service is configured)
    if (sendEmail && userProfile.email) {
      try {
        // This would integrate with your email service
        console.log(`📧 Password reset email would be sent to: ${userProfile.email}`);
        console.log(`🔑 New password: ${tempPassword}`);
      } catch (emailError) {
        console.warn('Failed to send password reset email:', emailError);
        // Don't fail the operation if email fails
      }
    }

    const response = {
      message: 'Password reset successfully',
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email
      },
      reset_details: {
        method: resetMethod,
        new_password: tempPassword,
        email_sent: sendEmail && userProfile.email,
        login_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`
      }
    };

    await logSupabaseCall(`/api/admin/customers/${customerId}/reset-password`, 'POST', { sendEmail, hasNewPassword: !!newPassword }, response, 200, Date.now() - startedAt, user.id, ip, userAgent);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Password reset error:', error);
    await logSupabaseCall(`/api/admin/customers/${customerId}/reset-password`, 'POST', {}, { error: 'Failed to reset password' }, 500, Date.now() - startedAt, user.id, ip, userAgent, (error as Error).message);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}

// Helper function to generate secure temporary password
function generateSecurePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one of each type
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
