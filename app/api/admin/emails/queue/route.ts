import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { getEmailQueue } from '@/lib/email-queue';

// GET - Get queue statistics and items
export async function GET(_request: NextRequest) {
  void _request;
  return NextResponse.json({ message: 'Email queue not implemented (pre-Phase 2 state)' }, { status: 501 });
}

// DELETE - Clear failed emails from queue
export async function DELETE() {
  return NextResponse.json({ message: 'Email queue not implemented (pre-Phase 2 state)' }, { status: 501 });
}
