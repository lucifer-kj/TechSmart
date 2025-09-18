import { NextResponse } from "next/server";
import { getInvitationService } from "@/lib/invitation-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }

    const invitationService = await getInvitationService();
    const result = await invitationService.verifyInvitationToken(token);
    
    if (result.error || !result.data) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }
    
    return NextResponse.json({ 
      valid: true, 
      invitation: result.data 
    }, { status: 200 });

  } catch (error) {
    console.error('Verify invitation error:', error);
    return NextResponse.json({ valid: false }, { status: 200 });
  }
}


