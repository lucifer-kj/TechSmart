import { NextRequest, NextResponse } from "next/server";
import { getServiceM8Config, validateServiceM8ApiKey } from "@/lib/servicem8-config";

export async function GET(request: NextRequest) {
  try {
    const config = await getServiceM8Config();
    
    if (!config) {
      return NextResponse.json(
        { 
          error: "ServiceM8 API key not configured",
          configured: false 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      configured: true,
      company: {
        uuid: config.companyUuid,
        name: config.companyName,
        email: config.companyEmail,
        phone: config.companyPhone,
        address: config.companyAddress,
        isActive: config.isActive
      },
      api: {
        baseUrl: config.baseUrl,
        hasApiKey: !!config.apiKey
      }
    });
  } catch (error) {
    console.error('Error fetching ServiceM8 config:', error);
    return NextResponse.json(
      { 
        error: "Failed to fetch ServiceM8 configuration",
        configured: false 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    const validation = await validateServiceM8ApiKey(apiKey);
    
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: validation.error || "Invalid API key",
          valid: false 
        },
        { status: 401 }
      );
    }

    // If validation is successful, we could optionally fetch company info
    // but we don't want to expose the full config without proper authentication
    return NextResponse.json({
      valid: true,
      message: "API key is valid"
    });
  } catch (error) {
    console.error('Error validating ServiceM8 API key:', error);
    return NextResponse.json(
      { 
        error: "Failed to validate API key",
        valid: false 
      },
      { status: 500 }
    );
  }
}
