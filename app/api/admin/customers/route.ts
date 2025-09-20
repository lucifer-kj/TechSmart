import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { InputSanitizationService, CustomerFormSchema } from "@/lib/input-sanitization";
import { logSupabaseCall } from "@/lib/api-logging";
import { logCustomerCreation } from "@/lib/audit-logging";
import { ServiceM8Client, generateIdempotencyKey, ServiceM8ClientData } from "@/lib/servicem8";

type CreateCustomerRequest = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  servicem8_customer_uuid?: string;
  createPortalAccess?: boolean;
  generateCredentials?: boolean;
  sendWelcomeEmail?: boolean;
  password?: string;
  confirmPassword?: string;
};

type Customer = {
  id: string;
  servicem8_customer_uuid: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
  job_count: number;
  last_login?: string;
  status: 'active' | 'inactive' | 'banned';
  servicem8_data?: ServiceM8ClientData;
  has_user_access: boolean;
  user_email?: string;
};

export async function GET(request: NextRequest) {
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
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const dateRange = searchParams.get('dateRange') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const syncWithServiceM8 = searchParams.get('sync') === 'true';

    let customers: Customer[] = [];
    let serviceM8Available = false;
    let serviceM8Error: string | null = null;
    
    // Check if ServiceM8 API key is available
    if (!process.env.SERVICEM8_API_KEY) {
      console.log('⚠️ ServiceM8 API key not configured - using local data only');
      serviceM8Error = 'ServiceM8 API key not configured';
    } else {
      serviceM8Available = true;
      console.log('✅ ServiceM8 API key found - fetching from ServiceM8');
      
      // Always try to fetch from ServiceM8 when API key is available
      try {
        const serviceM8Client = new ServiceM8Client(process.env.SERVICEM8_API_KEY);
        console.log(`📡 Fetching clients from ServiceM8 (limit: ${limit}, offset: ${offset})`);
        console.log(`🔑 Using API key: ${process.env.SERVICEM8_API_KEY?.substring(0, 10)}...`);
        console.log(`🌐 ServiceM8 API URL: https://api.servicem8.com/api_1.0/company.json`);
        
        const serviceM8Clients = await serviceM8Client.listClients(limit, offset);
        console.log(`✅ Retrieved ${serviceM8Clients.length} clients from ServiceM8`);
        
        // Log first client for debugging
        if (serviceM8Clients.length > 0) {
          console.log(`📋 Sample client:`, {
            uuid: serviceM8Clients[0].uuid,
            name: serviceM8Clients[0].name,
            email: serviceM8Clients[0].email
          });
        }
        
        // Always sync ServiceM8 clients with our database to ensure data is up to date
        console.log('🔄 Syncing ServiceM8 clients with local database');
        
        // Sync ServiceM8 clients with our database
        for (const sm8Client of serviceM8Clients) {
          // Check if customer already exists in our database
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('*')
            .eq('servicem8_customer_uuid', sm8Client.uuid)
            .single();

          if (!existingCustomer) {
            console.log(`➕ Creating new customer: ${sm8Client.name}`);
            // Create new customer from ServiceM8 data
            await supabase
              .from('customers')
              .insert({
                servicem8_customer_uuid: sm8Client.uuid,
                name: sm8Client.name,
                email: sm8Client.email || null,
                phone: sm8Client.mobile || null,
                created_at: sm8Client.date_created,
                updated_at: sm8Client.date_last_modified
              });
          } else {
            console.log(`🔄 Updating existing customer: ${sm8Client.name}`);
            // Update existing customer with latest ServiceM8 data
            await supabase
              .from('customers')
              .update({
                name: sm8Client.name,
                email: sm8Client.email || null,
                phone: sm8Client.mobile || null,
                updated_at: sm8Client.date_last_modified
              })
              .eq('id', existingCustomer.id);
          }
        }
        
        console.log(`✅ Successfully synced ${serviceM8Clients.length} clients to database`);
      } catch (error) {
        console.error('❌ ServiceM8 API error:', error);
        serviceM8Error = error instanceof Error ? error.message : 'Unknown ServiceM8 error';
        serviceM8Available = false;
        // Continue with database query even if ServiceM8 fails
      }
    }

    // Build base query for Supabase customers
    let query = supabase
      .from('customers')
      .select(`
        id,
        servicem8_customer_uuid,
        name,
        email,
        phone,
        created_at,
        updated_at
      `);

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      query = query.gte('created_at', startDate.toISOString());
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: rawCustomers, error: customersError } = await query;

    if (customersError) {
      console.error('Error fetching customers:', customersError);
      throw customersError;
    }

    // Get additional data for each customer
    const customerIds = rawCustomers?.map(c => c.id) || [];
    
    // Get job counts
    const { data: jobCounts } = await supabase
      .from('jobs')
      .select('customer_id')
      .in('customer_id', customerIds);
    
    // Get user profiles for status and access info
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('customer_id, last_sign_in_at, is_active, email')
      .in('customer_id', customerIds);

    // Create lookup maps
    const jobCountMap = new Map<string, number>();
    jobCounts?.forEach(job => {
      const count = jobCountMap.get(job.customer_id) || 0;
      jobCountMap.set(job.customer_id, count + 1);
    });

    const profileMap = new Map<string, { last_sign_in_at?: string; is_active?: boolean; email?: string }>();
    userProfiles?.forEach(profile => {
      profileMap.set(profile.customer_id, profile);
    });

    // Fetch ServiceM8 data for each customer if API key is available
    const serviceM8DataMap = new Map<string, ServiceM8ClientData>();
    if (process.env.SERVICEM8_API_KEY && rawCustomers) {
      const serviceM8Client = new ServiceM8Client(process.env.SERVICEM8_API_KEY);
      
      await Promise.allSettled(
        rawCustomers.map(async (customer) => {
          if (customer.servicem8_customer_uuid) {
            try {
              const sm8Data = await serviceM8Client.getClient(customer.servicem8_customer_uuid);
              serviceM8DataMap.set(customer.id, sm8Data);
            } catch (error) {
              console.error(`Failed to fetch ServiceM8 data for customer ${customer.id}:`, error);
            }
          }
        })
      );
    }

    // Transform data to match expected format
    customers = (rawCustomers || []).map(customer => {
      const jobCount = jobCountMap.get(customer.id) || 0;
      const userProfile = profileMap.get(customer.id);
      const serviceM8Data = serviceM8DataMap.get(customer.id);

      // Determine status based on user profile
      let customerStatus: 'active' | 'inactive' | 'banned' = 'inactive';
      if (userProfile) {
        if (userProfile.is_active === false) {
          customerStatus = 'banned';
        } else if (userProfile.is_active === true) {
          customerStatus = 'active';
        }
      }

      return {
        id: customer.id,
        servicem8_customer_uuid: customer.servicem8_customer_uuid || '',
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        job_count: jobCount,
        last_login: userProfile?.last_sign_in_at || undefined,
        status: customerStatus,
        servicem8_data: serviceM8Data,
        has_user_access: !!userProfile,
        user_email: userProfile?.email
      };
    });

    // Apply status filter after transformation
    const filteredCustomers = status === 'all' 
      ? customers 
      : customers.filter(customer => customer.status === status);

    const response = {
      customers: filteredCustomers,
      total: filteredCustomers.length,
      limit,
      offset,
      servicem8_status: {
        available: serviceM8Available,
        error: serviceM8Error,
        synced: syncWithServiceM8 && serviceM8Available
      }
    };

    await logSupabaseCall("/api/admin/customers", "GET", { search, status, dateRange, sync: syncWithServiceM8 }, response, 200, Date.now() - startedAt, user.id, ip, userAgent);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/admin/customers:', error);
    await logSupabaseCall("/api/admin/customers", "GET", {}, { error: 'Failed to fetch customers' }, 500, Date.now() - startedAt, user.id, ip, userAgent, (error as Error).message);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

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
    // Hard fail early if env is misconfigured in runtime (common on Vercel)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const envError = {
        error: 'Server environment misconfigured',
        details: {
          NEXT_PUBLIC_SUPABASE_URL_present: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
          SUPABASE_SERVICE_ROLE_KEY_present: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
        }
      };
      await logSupabaseCall(
        "/api/admin/customers",
        "POST",
        {},
        envError,
        500,
        Date.now() - startedAt,
        user.id,
        ip,
        userAgent,
        'env_misconfigured'
      );
      return NextResponse.json(envError, { status: 500 });
    }

    // Sanitize and validate body
    const sanitization = await new InputSanitizationService().sanitizeRequestBody(request, CustomerFormSchema);
    if (!sanitization.isValid) {
      await logSupabaseCall("/api/admin/customers", "POST", {}, { error: "Input validation failed", details: sanitization.errors }, 400, Date.now() - startedAt, user.id, ip, userAgent, "validation_error");
      return NextResponse.json({ error: "Input validation failed", details: sanitization.errors }, { status: 400 });
    }

    const sanitized = sanitization.sanitizedBody as Record<string, unknown>;
    const rawBody = await request.json().catch(() => ({}));
    const flags = (rawBody || {}) as Partial<CreateCustomerRequest>;

    let {
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
      password,
      confirmPassword
    } = {
      servicem8_customer_uuid: (flags.servicem8_customer_uuid as string | undefined) ?? undefined,
      password: (sanitized.password as string | undefined) ?? undefined,
      confirmPassword: (sanitized.confirmPassword as string | undefined) ?? undefined
    };

    // Note: sendWelcomeEmail flag is available for future email functionality

    if (!name?.trim()) {
      return NextResponse.json({ 
        error: "Customer name is required" 
      }, { status: 400 });
    }

    let serviceM8Uuid = servicem8_customer_uuid;

    let serviceM8CustomerData: ServiceM8ClientData | null = null;

    // If no ServiceM8 UUID provided, create customer in ServiceM8 first
    if (!serviceM8Uuid) {
      try {
        const apiKey = process.env.SERVICEM8_API_KEY;
        if (apiKey) {
          const serviceM8Client = new ServiceM8Client(apiKey);
          const idempotencyKey = generateIdempotencyKey('create-client', name);
          
          serviceM8CustomerData = await serviceM8Client.createClient({
            name: name.trim(),
            email: email?.trim(),
            mobile: phone?.trim(),
            address: address?.trim(),
            active: 1
          }, idempotencyKey);
          
          serviceM8Uuid = serviceM8CustomerData.uuid;
        } else {
          // Fallback to mock UUID for development
          serviceM8Uuid = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
      } catch (error) {
        console.error('ServiceM8 customer creation failed:', error);
        await logSupabaseCall("/api/admin/customers", "POST", { name, email, phone }, { error: "Failed to create customer in ServiceM8", details: (error as Error).message }, 502, Date.now() - startedAt, user.id, ip, userAgent, (error as Error).message);
        return NextResponse.json({ error: "Failed to create customer in ServiceM8" }, { status: 502 });
      }
    } else {
      // If ServiceM8 UUID was provided, fetch the existing customer data
      try {
        const apiKey = process.env.SERVICEM8_API_KEY;
        if (apiKey) {
          const serviceM8Client = new ServiceM8Client(apiKey);
          serviceM8CustomerData = await serviceM8Client.getClient(serviceM8Uuid);
          
          // Update our local data with ServiceM8 data if available
          if (serviceM8CustomerData) {
            // Use ServiceM8 data as the source of truth
            name = serviceM8CustomerData.name || name;
            email = serviceM8CustomerData.email || email;
            phone = serviceM8CustomerData.mobile || phone;
            address = serviceM8CustomerData.address || address;
          }
        }
      } catch (error) {
        console.error('ServiceM8 customer fetch failed:', error);
        // Continue with provided data if ServiceM8 fetch fails
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

    // Always create portal access when email is provided (default behavior)
    let userPassword: string | null = null;
    let authUserId: string | null = null;

    if (email) {
      try {
        // Use provided password or generate one if not provided
        if (password && password === confirmPassword) {
          userPassword = password;
        } else {
          userPassword = generateSecurePassword();
        }

        console.log(`🔐 Creating Supabase Auth user for: ${email} with password: ${password ? '[PROVIDED]' : '[GENERATED]'}`);

        // Create Supabase Auth user using service role key
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: email,
          password: userPassword,
          email_confirm: true, // Auto-confirm email for admin-created users
          user_metadata: {
            name: name,
            customer_id: customer.id,
            role: 'customer'
          }
        });

        if (authError) {
          console.error('Auth user creation error:', authError);
          return NextResponse.json(
            { error: `Auth user creation failed: ${authError.message}`, code: authError.status ?? 400 },
            { status: 400 }
          );
        }

        if (authUser?.user) {
          authUserId = authUser.user.id;

          try {
            console.log(`📝 Creating user profile for auth user: ${authUser.user.id}`);

            // Create user profile linked to the auth user
            const { error: profileError } = await supabase
              .from('user_profiles')
              .insert({
                id: authUser.user.id, // Use the auth user ID
                email: email,
                full_name: name,
                customer_id: customer.id,
                role: 'customer',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

          if (profileError) {
            console.error('❌ Profile creation error:', profileError);
            console.error('Profile creation details:', {
              userId: authUser.user.id,
              email: email,
              customerId: customer.id,
              error: profileError
            });
            // If profile creation fails, clean up the auth user
            await supabase.auth.admin.deleteUser(authUser.user.id);
            return NextResponse.json(
              { error: `Failed to create user profile: ${profileError.message}` },
              { status: 500 }
            );
          }

            console.log(`✅ Created auth user and profile for customer: ${name} (${email})`);
          } catch (error) {
            console.error('❌ Error during profile creation:', error);
            // Clean up auth user if profile creation fails
            await supabase.auth.admin.deleteUser(authUser.user.id);
            throw error;
          }
        }
      } catch (error) {
        console.error('Portal access creation failed:', error);
        // Clean up customer record if auth creation fails
        await supabase.from('customers').delete().eq('id', customer.id);
        throw error;
      }
      // Email handling is out of scope of this endpoint per project rules
    }

    const responsePayload = {
      customer: {
        ...customer,
        tempPassword: authUserId ? userPassword : undefined,
        servicem8_data: serviceM8CustomerData,
        auth_user_id: authUserId,
        portal_access_created: !!authUserId,
        login_instructions: authUserId ? {
          email: email,
          password: userPassword,
          login_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
          note: password ? "Customer can login with the provided password" : "Customer can login with the generated temporary password"
        } : undefined
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