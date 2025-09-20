import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    // With hashed storage, we cannot validate raw token without auth.
    if (token) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.rpc('portal_invitation_preflight');
    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    const [{ invitation_id, customer_id, expires_at }] = data as Array<{ invitation_id: string; customer_id: string; expires_at: string }>;
    return NextResponse.json({ 
      valid: true,
      invitation: { id: invitation_id, customer_id, expires_at }
    }, { status: 200 });

  } catch (error) {
    console.error('Verify invitation error:', error);
    return NextResponse.json({ valid: false }, { status: 200 });
  }
}


