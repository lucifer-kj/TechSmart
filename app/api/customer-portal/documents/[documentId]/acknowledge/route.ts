import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { customerPortalAPI } from "@/lib/customer-portal-api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { documentId } = await params;
    const body = await request.json();
    const { signature, notes, acknowledgedBy } = body;

    if (!signature || !acknowledgedBy) {
      return NextResponse.json({ 
        error: "Signature and acknowledged by are required" 
      }, { status: 400 });
    }

    // For now, use a mock company UUID - in production, this would come from the session
    const companyUuid = "company-123";
    
    const success = await customerPortalAPI.acknowledgeDocument(
      documentId,
      {
        signature,
        notes,
        acknowledgedBy,
        acknowledgedAt: new Date().toISOString()
      },
      companyUuid
    );

    if (success) {
      return NextResponse.json({ 
        message: "Document acknowledged successfully" 
      });
    } else {
      return NextResponse.json({ 
        error: "Failed to acknowledge document" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Document acknowledgment error:', error);
    return NextResponse.json({ 
      error: 'Failed to acknowledge document' 
    }, { status: 500 });
  }
}
