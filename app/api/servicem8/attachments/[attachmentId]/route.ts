import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ServiceM8Client } from "@/lib/servicem8";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
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
    
    // Download the attachment
    const { attachmentId } = await params;
    const blob = await client.downloadAttachment(attachmentId);
    
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
