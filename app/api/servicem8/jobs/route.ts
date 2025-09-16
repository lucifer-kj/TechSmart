import { NextResponse } from "next/server";
import { ServiceM8Client, getJobsForCustomer } from "@/lib/servicem8";

export async function GET(request: Request) {

  try {
    const { searchParams } = new URL(request.url);
    // Priority: explicit query -> env var -> default mock
    const customerId =
      searchParams.get('customerId') ||
      process.env.SERVICEM8_CUSTOMER_UUID ||
      "company-123";

    const apiKey = process.env.SERVICEM8_API_KEY;

    // If API key missing, return mock data so UI can render
    if (!apiKey) {
      const jobs = await getJobsForCustomer({ customerId });
      return NextResponse.json({ jobs, source: 'mock' });
    }

    // Optional: If session exists and you store company on it, enforce match
    // Example: if ((session as any)?.user?.companyUuid && (session as any).user.companyUuid !== customerId) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const client = new ServiceM8Client(apiKey);
    const jobs = await client.getCustomerJobs(customerId);
    return NextResponse.json({ jobs, source: 'servicem8' });
  } catch (error) {
    console.error('ServiceM8 API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}


