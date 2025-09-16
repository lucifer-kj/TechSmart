import { NextResponse } from "next/server";
import { verifyInvitationToken } from "@/lib/auth/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  const { data, error } = await verifyInvitationToken(token);
  if (error || !data) return NextResponse.json({ valid: false }, { status: 200 });
  return NextResponse.json({ valid: true, invitation: data }, { status: 200 });
}


