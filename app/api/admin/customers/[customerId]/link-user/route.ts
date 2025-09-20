import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ customerId: string }> }) {
  try {
    await requireAdmin();
    const { customerId } = await params;
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.rpc('admin_link_existing_user', { p_customer_id: customerId, p_email: email });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'User linked successfully', user_id: data }, { status: 200 });
  } catch (error) {
    console.error('Link existing user error:', error);
    return NextResponse.json({ error: 'Failed to link user' }, { status: 500 });
  }
}
