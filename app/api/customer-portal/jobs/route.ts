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
  
  // Helper function to return mock data
  const returnMockData = async () => {
    try {
      const customerId = process.env.SERVICEM8_CUSTOMER_UUID || "company-123";
      const mockJobs = await getJobsForCustomer(customerId);
      return NextResponse.json({ jobs: mockJobs });
    } catch (error) {
      console.error('Mock data error:', error);
      return NextResponse.json({ error: 'Failed to load mock data' }, { status: 500 });
    }
  };
  
  // If in development mode and no API key, return mock data immediately
  if (isDevelopment && hasMockData) {
    return await returnMockData();
  }

  const user = await getAuthUser();
  if (!user) {
    // Fallback to mock data if auth fails in development
    if (isDevelopment) {
      console.log('Auth failed, falling back to mock data in development');
      return await returnMockData();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Derive customer/company from session
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.customer_id) {
      console.log('Profile lookup failed:', profileError);
      // Fallback to mock data if profile not found in development
      if (isDevelopment) {
        console.log('Profile not found, falling back to mock data in development');
        return await returnMockData();
      }
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }
    
    const { data: customerRow, error: customerError } = await supabase
      .from('customers')
      .select('id, servicem8_customer_uuid')
      .eq('id', profile.customer_id)
      .single();
    
    if (!customerRow?.servicem8_customer_uuid) {
      console.log('Customer lookup failed:', customerError);
      // Fallback to mock data if customer mapping not found in development
      if (isDevelopment) {
        console.log('Customer mapping not found, falling back to mock data in development');
        return await returnMockData();
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
      console.log('Final error fallback to mock data in development');
      return await returnMockData();
    }
    
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}
