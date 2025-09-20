import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { customerPortalAPI } from "@/lib/customer-portal-api";

export async function GET() {
  // Development mode bypass for testing
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Helper function to return mock dashboard data
  const returnMockDashboard = () => {
    try {
      // Using mock data for development
      const mockDashboardData = {
        totalJobs: 8,
        activeJobs: 3,
        pendingApprovals: 2,
        totalValue: 5500,
        pendingPayments: 2,
        overduePayments: 1,
        totalPaid: 600,
        recentJobs: [
          {
            uuid: "job-123",
            job_number: "ST-1001",
            description: "Air conditioning maintenance and repair",
            status: "Work Order",
            generated_job_total: 450.00,
            date_last_modified: new Date().toISOString(),
          },
          {
            uuid: "job-456",
            job_number: "ST-1002",
            description: "Smart sensor installation and configuration",
            status: "Quote",
            generated_job_total: 850.00,
            date_last_modified: new Date().toISOString(),
          },
        ],
      };
      return NextResponse.json(mockDashboardData);
    } catch (error) {
      console.error('Mock dashboard data error:', error);
      return NextResponse.json({ error: 'Failed to load mock dashboard data' }, { status: 500 });
    }
  };
  
  // If in development mode and no API key, return mock data immediately
  if (isDevelopment && !process.env.SERVICEM8_API_KEY) {
    return returnMockDashboard();
  }

  const user = await getAuthUser();
  if (!user) {
    // Fallback to mock data if auth fails in development
    if (isDevelopment) {
      console.log('Auth failed, falling back to mock dashboard data in development');
      return returnMockDashboard();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // For now, use a mock company UUID - in production, this would come from the session
    const companyUuid = process.env.SERVICEM8_CUSTOMER_UUID || "company-123";
    
    const dashboardData = await customerPortalAPI.getDashboardData(companyUuid);
    
    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Dashboard API Error:', error);
    
    // Final fallback to mock data in development
    if (isDevelopment) {
      console.log('Final error fallback to mock dashboard data in development');
      return returnMockDashboard();
    }
    
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
