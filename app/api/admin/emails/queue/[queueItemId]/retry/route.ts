import { NextRequest, NextResponse } from 'next/server';
// import { requireAdmin } from '@/lib/auth/server';
// import { getEmailQueue } from '@/lib/email-queue';

interface RouteParams {
  params: Promise<{ queueItemId: string }>;
}

// POST - Retry failed email
export async function POST(request: NextRequest, { params }: RouteParams) {
  void request;
  void params;
  return NextResponse.json({ message: 'Email queue not implemented (pre-Phase 2 state)' }, { status: 501 });
}
