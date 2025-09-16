import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { customerPortalAPI } from "@/lib/customer-portal-api";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // For now, use a mock company UUID - in production, this would come from the session
    const companyUuid = "company-123";
    
    const paymentHistory = await customerPortalAPI.getPaymentHistory(companyUuid);
    
    return NextResponse.json({ payments: paymentHistory });
  } catch (error) {
    console.error('Payments API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch payment history' }, { status: 500 });
  }
}
