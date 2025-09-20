import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logSupabaseCall } from "@/lib/api-logging";

// ... existing code ...

type LinkCustomerRequest = {
  client_uuid: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  createPortalAccess?: boolean;
  generateCredentials?: boolean;
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

  // Admin guard
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
    const body = (await request.json()) as Partial<LinkCustomerRequest> & { linkEmail?: string };

    // If linkEmail is provided, link existing user to the new customer via RPC and return early
    if (body.linkEmail && body.client_uuid) {
      const { data: linkData, error: linkError } = await supabase
        .rpc('admin_link_existing_user', { p_customer_id: (await (await supabase.from('customers').select('id').eq('servicem8_customer_uuid', body.client_uuid).single()).data)?.id, p_email: body.linkEmail });
      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 400 });
      }
      return NextResponse.json({ message: 'Existing user linked to customer', user_id: linkData });
    }

    // ... existing code ...
  } catch (error) {
    console.error('Customer link error:', error);
    await logSupabaseCall("/api/admin/customers/link", "POST", {}, { error: 'Failed to link customer' }, 500, Date.now() - startedAt, user.id, ip, userAgent, (error as Error).message);
    return NextResponse.json({ error: 'Failed to link customer' }, { status: 500 });
  }
}

// ... existing code ...
