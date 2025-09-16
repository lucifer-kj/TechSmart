import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ServiceM8Client } from "@/lib/servicem8";
import { customerPortalAPI } from "@/lib/customer-portal-api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.SERVICEM8_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ServiceM8 API key not configured" }, { status: 500 });
  }

  try {
    const client = new ServiceM8Client(apiKey);
    
    // Download the attachment
    const { attachmentId } = await params;
    const blob = await client.downloadAttachment(attachmentId);
    
    // Track the download
    const companyUuid = "company-123"; // In production, this would come from the session
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Track download asynchronously to avoid blocking the response
    customerPortalAPI.trackDocumentDownload(attachmentId, companyUuid, {
      ipAddress,
      userAgent,
      downloadSource: 'portal'
    }).catch(error => {
      console.error('Download tracking failed:', error);
    });
    
    // Convert blob to buffer
    const buffer = await blob.arrayBuffer();
    
    // Return the file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': blob.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="attachment-${attachmentId}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('ServiceM8 API Error:', error);
    return NextResponse.json({ error: 'Failed to download attachment' }, { status: 500 });
  }
}
