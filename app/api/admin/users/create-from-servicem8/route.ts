import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ServiceM8Client } from "@/lib/servicem8";

type CreateUserFromServiceM8Request = {
  servicem8_customer_uuid: string;
  email: string;
  generateCredentials?: boolean;
  sendWelcomeEmail?: boolean;
};

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body: CreateUserFromServiceM8Request = await request.json();
    const { 
      servicem8_customer_uuid, 
      email, 
      generateCredentials = true,
      sendWelcomeEmail = false 
    } = body;

    if (!servicem8_customer_uuid || !email) {
      return NextResponse.json({ 
        error: "ServiceM8 customer UUID and email are required" 
      }, { status: 400 });
    }

    // Check if customer already exists in our database
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('servicem8_customer_uuid', servicem8_customer_uuid)
      .single();

    let customerId: string;
    let customerData;

    if (existingCustomer) {
      // Customer exists, check if they already have portal access
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('customer_id', existingCustomer.id)
        .single();

      if (existingProfile) {
        return NextResponse.json({ 
          error: "Customer already has portal access",
          customer_id: existingCustomer.id,
          user_profile: existingProfile
        }, { status: 409 });
      }

      customerId = existingCustomer.id;
      customerData = existingCustomer;
    } else {
      // Fetch customer data from ServiceM8 and create in our database
      const apiKey = process.env.SERVICEM8_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ 
          error: "ServiceM8 API key not configured" 
        }, { status: 500 });
      }

      const serviceM8Client = new ServiceM8Client(apiKey);
      const serviceM8Customer = await serviceM8Client.getClient(servicem8_customer_uuid);

      // Create customer in our database
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          servicem8_customer_uuid: serviceM8Customer.uuid,
          name: serviceM8Customer.name,
          email: serviceM8Customer.email || email,
          phone: serviceM8Customer.mobile || null,
          created_at: serviceM8Customer.date_created,
          updated_at: serviceM8Customer.date_last_modified
        })
        .select()
        .single();

      if (customerError) {
        console.error('Customer creation error:', customerError);
        return NextResponse.json({ 
          error: `Failed to create customer: ${customerError.message}` 
        }, { status: 500 });
      }

      customerId = newCustomer.id;
      customerData = newCustomer;
    }

    // Generate secure temporary password
    const tempPassword = generateSecurePassword();

    // Create Supabase Auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        name: customerData.name,
        customer_id: customerId,
        role: 'customer'
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return NextResponse.json({ 
        error: `Failed to create auth user: ${authError.message}` 
      }, { status: 500 });
    }

    if (!authUser?.user) {
      return NextResponse.json({ 
        error: 'Failed to create auth user' 
      }, { status: 500 });
    }

    // Create user profile linked to the auth user
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        email: email,
        full_name: customerData.name,
        customer_id: customerId,
        role: 'customer',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Clean up the auth user if profile creation fails
      try {
        await supabase.auth.admin.deleteUser(authUser.user.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }
      return NextResponse.json({ 
        error: `Failed to create user profile: ${profileError.message}` 
      }, { status: 500 });
    }

    const response = {
      success: true,
      customer: customerData,
      user_profile: userProfile,
      auth_user_id: authUser.user.id,
      login_instructions: {
        email: email,
        password: generateCredentials ? tempPassword : undefined,
        login_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
        note: "Customer can now login with these credentials"
      },
      welcome_email_sent: sendWelcomeEmail // This would be handled by email service
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Create user from ServiceM8 error:', error);
    return NextResponse.json({ 
      error: 'Failed to create user account from ServiceM8 customer',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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
