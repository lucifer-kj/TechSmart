import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ServiceM8Client } from "@/lib/servicem8";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = {
    servicem8_api_key_configured: !!process.env.SERVICEM8_API_KEY,
    servicem8_customer_uuid: process.env.SERVICEM8_CUSTOMER_UUID || null,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };

  // If API key is configured, test the connection
  if (process.env.SERVICEM8_API_KEY) {
    try {
      const client = new ServiceM8Client(process.env.SERVICEM8_API_KEY);
      const testClients = await client.listClients(1, 0);
      
      return NextResponse.json({
        ...status,
        servicem8_connection: {
          status: 'connected',
          test_result: `Successfully connected - found ${testClients.length} client(s)`,
          sample_client: testClients[0] ? {
            uuid: testClients[0].uuid,
            name: testClients[0].name,
            email: testClients[0].email
          } : null
        }
      });
    } catch (error) {
      return NextResponse.json({
        ...status,
        servicem8_connection: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  return NextResponse.json({
    ...status,
    servicem8_connection: {
      status: 'not_configured',
      message: 'ServiceM8 API key not found in environment variables'
    }
  });
}
