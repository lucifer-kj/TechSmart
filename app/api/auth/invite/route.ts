import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCustomerInvitation } from "@/lib/auth/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();
  const { email, customerId } = body ?? {};
  if (!email || !customerId) {
    return NextResponse.json({ error: "email and customerId required" }, { status: 400 });
  }

  const result = await createCustomerInvitation(email, customerId, user.id);
  if (result.error) {
    return NextResponse.json({ error: (result.error as Error).message }, { status: 400 });
  }
  return NextResponse.json({ invitation: result.data });
}


