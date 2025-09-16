import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { customerPortalAPI } from "@/lib/customer-portal-api";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // For now, use a mock company UUID - in production, this would come from the session
    const companyUuid = "company-123";
    
    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get('status'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
    };

    const jobs = await customerPortalAPI.getJobsList(companyUuid, filters);
    
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Jobs API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}
