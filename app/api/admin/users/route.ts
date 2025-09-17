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
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

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
          name
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

    // Transform the data
    const transformedUsers = userProfiles?.map(profile => {
      const authUser = authUsers?.users?.find(au => au.id === profile.id);
      const customer = Array.isArray(profile.customers) ? profile.customers[0] : (profile.customers as { id: string; name?: string } | null | undefined) || null;
      return {
        id: profile.id,
        email: authUser?.email || 'No email',
        role: profile.role,
        is_active: profile.is_active,
        created_at: profile.created_at,
        last_login: profile.last_login,
        customer_id: profile.customer_id,
        customer_name: customer?.name
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
