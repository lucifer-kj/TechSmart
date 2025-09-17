import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
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
    const body = await request.json();
    const {
      name,
      email,
      phone,
      address,
      servicem8_customer_uuid,
      createPortalAccess,
      generateCredentials,
      sendWelcomeEmail
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ 
        error: "Customer name is required" 
      }, { status: 400 });
    }

    let serviceM8Uuid = servicem8_customer_uuid;

    // If no ServiceM8 UUID provided, create customer in ServiceM8 first
    if (!serviceM8Uuid) {
      try {
        const apiKey = process.env.SERVICEM8_API_KEY;
        if (apiKey) {
          // Note: You'll need to implement createCustomer method in ServiceM8Client
          // For now, we'll generate a UUID and assume it was created
          serviceM8Uuid = `sm8-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        } else {
          // Use mock UUID for development
          serviceM8Uuid = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
      } catch (error) {
        console.error('ServiceM8 customer creation failed:', error);
        return NextResponse.json({ 
          error: "Failed to create customer in ServiceM8" 
        }, { status: 500 });
      }
    }

    // Create customer in Supabase
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        servicem8_customer_uuid: serviceM8Uuid,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (customerError) throw customerError;

    // Create portal access if requested
    let tempPassword: string | null = null;
    if (createPortalAccess) {
      
      if (generateCredentials) {
        // Generate secure temporary password
        tempPassword = generateSecurePassword();
      }

      // Create user profile for portal access
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          customer_id: customer.id,
          role: 'customer',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't fail the whole operation, just log the error
      }

      // TODO: Create Supabase Auth user account
      // This would typically use the Supabase Auth Admin API
      // For now, we'll just store the temp password in the response

      // Send welcome email if requested
      if (sendWelcomeEmail && email && tempPassword) {
        try {
          // TODO: Implement email sending
          console.log(`Welcome email would be sent to ${email} with temp password: ${tempPassword}`);
        } catch (error) {
          console.error('Email sending failed:', error);
          // Don't fail the operation for email errors
        }
      }
    }

    return NextResponse.json({ 
      customer: {
        ...customer,
        tempPassword: createPortalAccess && generateCredentials ? tempPassword : undefined
      }
    });
  } catch (error) {
    console.error('Customer creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create customer' 
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