import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function PUT(
  request: Request,
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
    const { customerId } = await params;
    const body = await request.json();
    const { has_portal_access } = body;

    if (typeof has_portal_access !== 'boolean') {
      return NextResponse.json({ 
        error: "has_portal_access must be a boolean value" 
      }, { status: 400 });
    }

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ 
        error: "Customer not found" 
      }, { status: 404 });
    }

    if (has_portal_access) {
      // Enable portal access - create or update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          customer_id: customerId,
          role: 'customer',
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'customer_id'
        });

      if (profileError) throw profileError;

      // TODO: Create Supabase Auth user account if it doesn't exist
      // This would typically use the Supabase Auth Admin API
      // For now, we'll just update the profile

    } else {
      // Disable portal access - deactivate user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', customerId);

      if (profileError) throw profileError;

      // TODO: Revoke Supabase Auth sessions for this user
      // This would typically use the Supabase Auth Admin API
    }

    return NextResponse.json({ 
      message: `Portal access ${has_portal_access ? 'enabled' : 'disabled'} successfully`,
      has_portal_access
    });
  } catch (error) {
    console.error('Portal access update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update portal access' 
    }, { status: 500 });
  }
}

export async function POST(
  request: Request,
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
    const { customerId } = await params;
    const body = await request.json();
    const { createPortalAccess, generateCredentials } = body;

    if (!createPortalAccess) {
      return NextResponse.json({ 
        error: "createPortalAccess must be true" 
      }, { status: 400 });
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email, name')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ 
        error: "Customer not found" 
      }, { status: 404 });
    }

    if (!customer.email) {
      return NextResponse.json({ 
        error: "Customer must have an email address to create user access" 
      }, { status: 400 });
    }

    // Check if user already has access
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('customer_id', customerId)
      .single();

    if (existingProfile) {
      return NextResponse.json({ 
        error: "Customer already has user access" 
      }, { status: 409 });
    }

    let tempPassword: string | null = null;
    let authUser = null;

    // Always generate credentials and create auth user for proper user access
    if (generateCredentials) {
      // Generate temporary password
      tempPassword = generateSecurePassword();

      // Create Supabase Auth user
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: customer.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: customer.name,
            customer_id: customerId,
            role: 'customer'
          }
        });

        if (authError) {
          console.error('Auth user creation error:', authError);
          return NextResponse.json({ 
            error: `Failed to create authentication account: ${authError.message}` 
          }, { status: 500 });
        }
        
        authUser = authData.user;
      } catch (authError) {
        console.error('Auth user creation error:', authError);
        return NextResponse.json({ 
          error: 'Failed to create authentication account' 
        }, { status: 500 });
      }
    } else {
      // If not generating credentials, we still need to create a profile without auth user
      // This is for cases where credentials are managed separately
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          customer_id: customerId,
          email: customer.email,
          full_name: customer.name,
          role: 'customer',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return NextResponse.json({ 
          error: `Failed to create user profile: ${profileError.message}` 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'User access created successfully (no credentials generated)',
        has_portal_access: true
      });
    }

    // Create user profile with auth user ID
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.id,
        customer_id: customerId,
        email: customer.email,
        full_name: customer.name,
        role: 'customer',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // If profile creation fails, clean up the auth user
      try {
        await supabase.auth.admin.deleteUser(authUser.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }
      
      return NextResponse.json({ 
        error: `Failed to create user profile: ${profileError.message}` 
      }, { status: 500 });
    }

    const response: {
      message: string;
      has_portal_access: boolean;
      tempPassword?: string;
    } = { 
      message: 'User access created successfully',
      has_portal_access: true
    };

    if (tempPassword) {
      response.tempPassword = tempPassword;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('User access creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create user access' 
    }, { status: 500 });
  }
}
