import { NextResponse } from "next/server";
import { WebhookRetryService } from "@/lib/webhook-retry";

export async function POST(request: Request) {
  try {
    // Verify this is an internal/system call
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.INTERNAL_API_TOKEN;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const retryService = new WebhookRetryService();
    await retryService.processRetryQueue();

    return NextResponse.json({ 
      success: true, 
      message: 'Retry queue processed successfully' 
    });
  } catch (error) {
    console.error('Retry queue processing error:', error);
    return NextResponse.json({ 
      error: 'Failed to process retry queue' 
    }, { status: 500 });
  }
}

// Also support GET for health checks
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    message: 'Webhook retry processor is running' 
  });
}
