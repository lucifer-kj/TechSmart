import { NextResponse } from "next/server";
import { ServiceM8Client, getJobsForCustomer } from "@/lib/servicem8";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const apiKey = process.env.SERVICEM8_API_KEY;

    // If no customer ID provided, try to get it from ServiceM8 config
    let targetCustomerId = customerId;
    if (!targetCustomerId) {
      try {
        const { getServiceM8Config } = await import('@/lib/servicem8-config');
        const config = await getServiceM8Config();
        targetCustomerId = config?.companyUuid || "dynamic-customer-uuid";
      } catch (error) {
        console.warn('Failed to get ServiceM8 config:', error);
        targetCustomerId = "dynamic-customer-uuid";
      }
    }

    // If API key missing, return mock data so UI can render
    if (!apiKey) {
      const jobs = await getJobsForCustomer(targetCustomerId);
      return NextResponse.json({ jobs, source: 'mock' });
    }

    // Optional: If session exists and you store company on it, enforce match
    // Example: if ((session as any)?.user?.companyUuid && (session as any).user.companyUuid !== targetCustomerId) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const client = new ServiceM8Client(apiKey);
    const jobs = await client.getCustomerJobs(targetCustomerId);
    return NextResponse.json({ jobs, source: 'servicem8' });
  } catch (error) {
    console.error('ServiceM8 API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}


