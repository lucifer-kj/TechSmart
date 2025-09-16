import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.SERVICEM8_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ServiceM8 API key not configured" }, { status: 500 });
  }

  try {
    // For now, return mock data - in production, you'd fetch from ServiceM8
    const mockCompany = {
      uuid: "company-123",
      name: "SmartTech Solutions",
      email: "info@smarttech.com",
      mobile: "+61 400 123 456",
      address: "123 Business St, Sydney NSW 2000",
      active: 1,
      date_created: new Date().toISOString(),
      date_last_modified: new Date().toISOString(),
    };

    return NextResponse.json({ company: mockCompany });
  } catch (error) {
    console.error('ServiceM8 API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch company data' }, { status: 500 });
  }
}
