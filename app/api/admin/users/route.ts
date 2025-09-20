import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
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

  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // In development mode with bypass, return mock data
    if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true') {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          role: 'admin',
          is_active: true,
          created_at: '2024-01-15T10:00:00Z',
          last_login: '2024-09-20T08:30:00Z',
          customer_id: null,
          customer_name: null,
          servicem8_customer_uuid: null,
          job_count: undefined,
          last_activity: '2024-09-20T08:30:00Z'
        },
        {
          id: 'user-2',
          email: 'john.smith@example.com',
          role: 'customer',
          is_active: true,
          created_at: '2024-02-10T14:20:00Z',
          last_login: '2024-09-19T16:45:00Z',
          customer_id: 'customer-1',
          customer_name: 'John Smith',
          servicem8_customer_uuid: 'sm8-customer-123',
          job_count: 5,
          last_activity: '2024-09-19T16:45:00Z'
        },
        {
          id: 'user-3',
          email: 'jane.doe@example.com',
          role: 'customer',
          is_active: true,
          created_at: '2024-03-05T09:15:00Z',
          last_login: '2024-09-18T11:20:00Z',
          customer_id: 'customer-2',
          customer_name: 'Jane Doe',
          servicem8_customer_uuid: 'sm8-customer-456',
          job_count: 3,
          last_activity: '2024-09-18T11:20:00Z'
        },
        {
          id: 'user-4',
          email: 'mike.wilson@example.com',
          role: 'customer',
          is_active: false,
          created_at: '2024-01-20T13:45:00Z',
          last_login: '2024-08-15T10:30:00Z',
          customer_id: 'customer-3',
          customer_name: 'Mike Wilson',
          servicem8_customer_uuid: 'sm8-customer-789',
          job_count: 1,
          last_activity: '2024-08-15T10:30:00Z'
        }
      ];

      // Apply filters to mock data
      let filteredUsers = mockUsers;
      
      if (role) {
        filteredUsers = filteredUsers.filter(user => user.role === role);
      }
      
      if (status === 'active') {
        filteredUsers = filteredUsers.filter(user => user.is_active);
      } else if (status === 'inactive') {
        filteredUsers = filteredUsers.filter(user => !user.is_active);
      }
      
      if (search) {
        filteredUsers = filteredUsers.filter(user => 
          user.email.toLowerCase().includes(search.toLowerCase()) ||
          user.customer_name?.toLowerCase().includes(search.toLowerCase())
        );
      }

      return NextResponse.json({ users: filteredUsers });
    }

    // Build query for user profiles with customer info
    let query = supabase
      .from('user_profiles')
      .select(`
        id,
        role,
        is_active,
        created_at,
        last_login,
        customer_id,
        customers!left(
          id,
          name,
          servicem8_customer_uuid
        )
      `);

    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (search) {
      // For now, we'll filter in memory since we need to search across multiple fields
      // In a production app, you might want to use full-text search or create a view
    }

    const { data: userProfiles, error: profilesError } = await query;

    if (profilesError) throw profilesError;

    // Get auth users data to get emails
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.warn('Failed to fetch auth users:', authError);
    }

    // Get job counts for customers
    const customerIds = userProfiles?.filter(p => p.customer_id).map(p => p.customer_id!) || [];
    const jobCounts = new Map<string, number>();
    
    if (customerIds.length > 0) {
      const { data: jobCountsData } = await supabase
        .from('jobs')
        .select('customer_id')
        .in('customer_id', customerIds);
      
      jobCountsData?.forEach(job => {
        const count = jobCounts.get(job.customer_id) || 0;
        jobCounts.set(job.customer_id, count + 1);
      });
    }

    // Transform the data
    const transformedUsers = userProfiles?.map(profile => {
      const authUser = authUsers?.users?.find(au => au.id === profile.id);
      const customer = Array.isArray(profile.customers) ? profile.customers[0] : (profile.customers as { id: string; name?: string; servicem8_customer_uuid?: string } | null | undefined) || null;
      return {
        id: profile.id,
        email: authUser?.email || 'No email',
        role: profile.role,
        is_active: profile.is_active,
        created_at: profile.created_at,
        last_login: profile.last_login,
        customer_id: profile.customer_id,
        customer_name: customer?.name,
        servicem8_customer_uuid: customer?.servicem8_customer_uuid,
        job_count: profile.customer_id ? (jobCounts.get(profile.customer_id) || 0) : undefined,
        last_activity: authUser?.last_sign_in_at
      };
    }) || [];

    // Apply search filter if provided
    let filteredUsers = transformedUsers;
    if (search) {
      filteredUsers = transformedUsers.filter(user => 
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.customer_name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return NextResponse.json({ users: filteredUsers });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
