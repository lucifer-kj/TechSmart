import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { customerPortalAPI } from "@/lib/customer-portal-api";
import { createClient } from "@supabase/supabase-js";
import { SyncService } from "@/lib/sync-service";
import { getJobsForCustomer } from "@/lib/servicem8";

export async function GET(request: NextRequest) {
  // Development mode bypass for testing
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasMockData = process.env.SERVICEM8_CUSTOMER_UUID && !process.env.SERVICEM8_API_KEY;
  
  // If in development mode and no API key, return mock data
  if (isDevelopment && hasMockData) {
    try {
      const customerId = process.env.SERVICEM8_CUSTOMER_UUID || "company-123";
      const mockJobs = await getJobsForCustomer(customerId);
      return NextResponse.json({ jobs: mockJobs });
    } catch (error) {
      console.error('Mock data error:', error);
      return NextResponse.json({ error: 'Failed to load mock data' }, { status: 500 });
    }
  }

  const user = await getAuthUser();
  if (!user) {
    // Fallback to mock data if auth fails in development
    if (isDevelopment) {
      try {
        const customerId = process.env.SERVICEM8_CUSTOMER_UUID || "company-123";
        const mockJobs = await getJobsForCustomer(customerId);
        return NextResponse.json({ jobs: mockJobs });
      } catch (error) {
        console.error('Auth fallback mock data error:', error);
      }
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Derive customer/company from session
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.customer_id) {
      // Fallback to mock data if profile not found in development
      if (isDevelopment) {
        try {
          const customerId = process.env.SERVICEM8_CUSTOMER_UUID || "company-123";
          const mockJobs = await getJobsForCustomer(customerId);
          return NextResponse.json({ jobs: mockJobs });
        } catch (error) {
          console.error('Profile fallback mock data error:', error);
        }
      }
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }
    
    const { data: customerRow } = await supabase
      .from('customers')
      .select('id, servicem8_customer_uuid')
      .eq('id', profile.customer_id)
      .single();
    
    if (!customerRow?.servicem8_customer_uuid) {
      // Fallback to mock data if customer mapping not found in development
      if (isDevelopment) {
        try {
          const customerId = process.env.SERVICEM8_CUSTOMER_UUID || "company-123";
          const mockJobs = await getJobsForCustomer(customerId);
          return NextResponse.json({ jobs: mockJobs });
        } catch (error) {
          console.error('Customer mapping fallback mock data error:', error);
        }
      }
      return NextResponse.json({ error: 'Customer mapping not found' }, { status: 404 });
    }
    
    const companyUuid = customerRow.servicem8_customer_uuid as string;
    
    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get('status'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
    };
    const refresh = searchParams.get('refresh') === 'true';

    if (refresh) {
      const apiKey = process.env.SERVICEM8_API_KEY;
      if (apiKey) {
        const sync = new SyncService(apiKey);
        await sync.syncCustomerData(companyUuid);
      }
    }

    const jobs = await customerPortalAPI.getJobsList(companyUuid, {
      filters,
      refresh: refresh || false
    });
    
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Jobs API Error:', error);
    
    // Final fallback to mock data in development
    if (isDevelopment) {
      try {
        const customerId = process.env.SERVICEM8_CUSTOMER_UUID || "company-123";
        const mockJobs = await getJobsForCustomer(customerId);
        return NextResponse.json({ jobs: mockJobs });
      } catch (mockError) {
        console.error('Final fallback mock data error:', mockError);
      }
    }
    
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}
