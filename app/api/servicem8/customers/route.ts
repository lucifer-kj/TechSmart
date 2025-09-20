import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { ServiceM8Client, ServiceM8ClientData } from "@/lib/servicem8";
import { createClient } from "@supabase/supabase-js";

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

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');
  const search = searchParams.get('search') || '';

  try {
    const apiKey = process.env.SERVICEM8_API_KEY;
    if (!apiKey) {
      // Return mock data for development
      const mockClients: ServiceM8ClientData[] = [
        {
          uuid: "company-123",
          name: "SmartTech Solutions",
          email: "info@smarttech.com",
          mobile: "+61 400 123 456",
          address: "123 Business St, Sydney NSW 2000",
          active: 1,
          date_created: new Date().toISOString(),
          date_last_modified: new Date().toISOString(),
        },
        {
          uuid: "company-456",
          name: "TechCorp Industries",
          email: "contact@techcorp.com",
          mobile: "+61 400 789 012",
          address: "456 Innovation Ave, Melbourne VIC 3000",
          active: 1,
          date_created: new Date().toISOString(),
          date_last_modified: new Date().toISOString(),
        },
        {
          uuid: "company-789",
          name: "Help Guide Job",
          email: "help@guidejob.com",
          mobile: "+61 400 555 789",
          address: "789 Guide Street, Brisbane QLD 4000",
          active: 1,
          date_created: new Date().toISOString(),
          date_last_modified: new Date().toISOString(),
        },
        {
          uuid: "company-101",
          name: "Test1",
          email: "test1@example.com",
          mobile: "+61 400 111 222",
          address: "101 Test Road, Perth WA 6000",
          active: 1,
          date_created: new Date().toISOString(),
          date_last_modified: new Date().toISOString(),
        }
      ];

      // Apply search filter if provided
      let filteredClients = mockClients;
      if (search) {
        filteredClients = mockClients.filter(client => 
          client.name.toLowerCase().includes(search.toLowerCase()) ||
          client.email?.toLowerCase().includes(search.toLowerCase())
        );
      }

      return NextResponse.json({ 
        clients: filteredClients,
        total: filteredClients.length,
        has_more: false
      });
    }

    // Fetch from ServiceM8 API
    const serviceM8Client = new ServiceM8Client(apiKey);
    const clients = await serviceM8Client.listClients(limit, offset);

    // Apply search filter if provided
    let filteredClients = clients;
    if (search) {
      filteredClients = clients.filter(client => 
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return NextResponse.json({ 
      clients: filteredClients,
      total: filteredClients.length,
      has_more: clients.length === limit
    });
  } catch (error) {
    console.error('ServiceM8 API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch ServiceM8 clients' }, { status: 500 });
  }
}
