import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ServiceM8Client } from "@/lib/servicem8";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.SERVICEM8_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ServiceM8 API key not configured" }, { status: 500 });
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId') || "mock-customer-uuid";
    
    const client = new ServiceM8Client(apiKey);
    const jobs = await client.getCustomerJobs(customerId);
    
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('ServiceM8 API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}


