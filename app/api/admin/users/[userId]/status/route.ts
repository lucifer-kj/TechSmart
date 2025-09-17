import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
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
    const { userId } = await params;
    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ 
        error: "is_active must be a boolean value" 
      }, { status: 400 });
    }

    // Prevent admin from deactivating themselves
    if (userId === user.id && !is_active) {
      return NextResponse.json({ 
        error: "Cannot deactivate your own admin account" 
      }, { status: 400 });
    }

    // Verify user exists
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ 
        error: "User not found" 
      }, { status: 404 });
    }

    // Update user status
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // If deactivating, also revoke auth sessions
    if (!is_active) {
      try {
        await supabase.auth.admin.signOut(userId);
      } catch (authError) {
        console.warn('Failed to revoke auth sessions:', authError);
        // Don't fail the whole operation for auth errors
      }
    }

    return NextResponse.json({ 
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      is_active
    });
  } catch (error) {
    console.error('User status update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update user status' 
    }, { status: 500 });
  }
}
