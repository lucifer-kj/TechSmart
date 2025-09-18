import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getEmailTriggerService } from '@/lib/email-triggers';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { z } from 'zod';

const notifyDocumentSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  notifyCustomer: z.boolean().optional().default(true),
});

interface RouteParams {
  params: Promise<{ documentId: string }>;
}

// POST - Send document notification email to customer
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { documentId } = await params;
    const body = await request.json();
    const validatedData = notifyDocumentSchema.parse(body);

    const supabase = await createServerSupabase();

    // Get document information
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, name, type, file_url')
      .eq('id', documentId)
      .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to notify about this document
    if (user.profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized to send document notifications' },
        { status: 403 }
      );
    }

    // Send notification email if requested
    if (validatedData.notifyCustomer) {
      try {
        const emailTriggerService = await getEmailTriggerService();
        await emailTriggerService.sendDocumentNotificationEmail(
          documentId,
          validatedData.customerId
        );
      } catch (emailError) {
        console.error('Failed to send document notification email:', emailError);
        return NextResponse.json(
          { error: 'Failed to send notification email' },
          { status: 500 }
        );
      }
    }

    // Log the notification
    const getIpAddress = (): string => {
      const forwarded = request.headers.get('x-forwarded-for');
      if (forwarded && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
      }
      return 'unknown';
    };
    await supabase
      .from('audit_logs')
      .insert({
        action: 'document_notification_sent',
        user_id: user.id,
        details: {
          document_id: documentId,
          customer_id: validatedData.customerId,
          document_name: document.name,
        },
        ip_address: getIpAddress(),
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    return NextResponse.json({
      message: 'Document notification sent successfully',
      document: {
        id: documentId,
        name: document.name,
        type: document.type,
      },
    });

  } catch (error) {
    console.error('Send document notification error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred while sending document notification' },
      { status: 500 }
    );
  }
}
