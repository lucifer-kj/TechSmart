import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ServiceM8Client } from "@/lib/servicem8";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.SERVICEM8_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ServiceM8 API key not configured" }, { status: 500 });
  }

  try {
    const client = new ServiceM8Client(apiKey);
    
    // Get job details
    const { jobId } = await params;
    const job = await client.getJobDetails(jobId);
    
    // Get job materials
    const materials = await client.getJobMaterials(jobId);
    
    // Get job attachments
    const attachments = await client.getJobAttachments(jobId);

    return NextResponse.json({ 
      job, 
      materials, 
      attachments 
    });
  } catch (error) {
    console.error('ServiceM8 API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch job details' }, { status: 500 });
  }
}
