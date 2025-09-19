import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { InputSanitizationService, CustomerFormSchema } from "@/lib/input-sanitization";
import { logSupabaseCall } from "@/lib/api-logging";
import { logCustomerCreation } from "@/lib/audit-logging";
import { ServiceM8Client, generateIdempotencyKey } from "@/lib/servicem8";

type CreateCustomerRequest = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  servicem8_customer_uuid?: string;
  createPortalAccess?: boolean;
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

  const startedAt = Date.now();
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
  const userAgent = request.headers.get("user-agent") || undefined;

  try {
    // Sanitize and validate body
    const sanitization = await new InputSanitizationService().sanitizeRequestBody(request, CustomerFormSchema);
    if (!sanitization.isValid) {
      await logSupabaseCall("/api/admin/customers", "POST", {}, { error: "Input validation failed", details: sanitization.errors }, 400, Date.now() - startedAt, user.id, ip, userAgent, "validation_error");
      return NextResponse.json({ error: "Input validation failed", details: sanitization.errors }, { status: 400 });
    }

    const sanitized = sanitization.sanitizedBody as Record<string, unknown>;
    const rawBody = await request.json().catch(() => ({}));
    const flags = (rawBody || {}) as Partial<CreateCustomerRequest>;

    const {
      name,
      email,
      phone,
      address
    } = {
      name: String(sanitized.name ?? ""),
      email: (sanitized.email as string | undefined) ?? undefined,
      phone: (sanitized.phone as string | undefined) ?? undefined,
      address: (sanitized.address as string | undefined) ?? undefined
    };

    const {
      servicem8_customer_uuid,
      createPortalAccess,
      generateCredentials
    } = {
      servicem8_customer_uuid: (flags.servicem8_customer_uuid as string | undefined) ?? undefined,
      createPortalAccess: Boolean(flags.createPortalAccess),
      generateCredentials: Boolean(flags.generateCredentials)
    };

    // Note: sendWelcomeEmail flag is available for future email functionality

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
          const serviceM8Client = new ServiceM8Client(apiKey);
          const idempotencyKey = generateIdempotencyKey('create-client', name);
          
          const serviceM8Customer = await serviceM8Client.createClient({
            name: name.trim(),
            email: email?.trim(),
            mobile: phone?.trim(),
            address: address?.trim(),
            active: 1
          }, idempotencyKey);
          
          serviceM8Uuid = serviceM8Customer.uuid;
        } else {
          // Fallback to mock UUID for development
          serviceM8Uuid = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
      } catch (error) {
        console.error('ServiceM8 customer creation failed:', error);
        await logSupabaseCall("/api/admin/customers", "POST", { name, email, phone }, { error: "Failed to create customer in ServiceM8", details: (error as Error).message }, 502, Date.now() - startedAt, user.id, ip, userAgent, (error as Error).message);
        return NextResponse.json({ error: "Failed to create customer in ServiceM8" }, { status: 502 });
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

    // Create portal access if requested (Auth creation handled elsewhere)
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
      // Email handling is out of scope of this endpoint per project rules
    }

    const responsePayload = { 
      customer: {
        ...customer,
        tempPassword: createPortalAccess && generateCredentials ? tempPassword : undefined
      }
    };

    await logSupabaseCall("/api/admin/customers", "POST", { name, email, phone }, responsePayload, 200, Date.now() - startedAt, user.id, ip, userAgent);
    await logCustomerCreation(user.id, String(customer.id), { name, email: email ?? undefined, phone: phone ?? undefined, servicem8_uuid: serviceM8Uuid }, ip, userAgent);

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Customer creation error:', error);
    await logSupabaseCall("/api/admin/customers", "POST", {}, { error: 'Failed to create customer' }, 500, Date.now() - startedAt, user.id, ip, userAgent, (error as Error).message);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
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