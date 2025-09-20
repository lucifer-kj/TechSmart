import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ServiceM8Client } from "@/lib/servicem8";

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

  try {
    const { service } = await request.json();

    if (service === 'servicem8') {
      const apiKey = process.env.SERVICEM8_API_KEY;
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          message: 'ServiceM8 API key not configured'
        });
      }

      try {
        const serviceM8Client = new ServiceM8Client(apiKey);
        const clients = await serviceM8Client.listClients(1, 0);
        
        return NextResponse.json({
          success: true,
          message: `Connected successfully! Found ${clients.length > 0 ? 'clients' : 'no clients'} in ServiceM8.`,
          details: {
            clientsFound: clients.length,
            apiKeyPrefix: `${apiKey.substring(0, 8)}...`
          }
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: `ServiceM8 connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    } else if (service === 'supabase') {
      try {
        // Test Supabase connection by querying a system table
        const { data, error } = await supabase
          .from('customers')
          .select('id', { count: 'exact', head: true });

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: `Supabase connected successfully! Database is accessible.`,
          details: {
            url: process.env.NEXT_PUBLIC_SUPABASE_URL,
            customersCount: data || 0
          }
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: `Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    } else {
      return NextResponse.json({
        success: false,
        message: 'Invalid service specified'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Connection test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to test connection'
    }, { status: 500 });
  }
}
