import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getEmailTriggerService } from '@/lib/email-triggers';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { z } from 'zod';

const sendPaymentReminderSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  sendReminder: z.boolean().optional().default(true),
});

interface RouteParams {
  params: Promise<{ paymentId: string }>;
}

// POST - Send payment reminder email to customer
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { paymentId } = await params;
    const body = await request.json();
    const validatedData = sendPaymentReminderSchema.parse(body);

    const supabase = await createServerSupabase();

    // Get payment/invoice information
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, invoice_id, amount, status')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Get invoice information
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount, due_date, customer_id')
      .eq('id', payment.invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to send payment reminders
    if (user.profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized to send payment reminders' },
        { status: 403 }
      );
    }

    // Send reminder email if requested
    if (validatedData.sendReminder) {
      try {
        const emailTriggerService = await getEmailTriggerService();
        await emailTriggerService.sendPaymentReminderEmail(
          invoice.id,
          validatedData.customerId
        );
      } catch (emailError) {
        console.error('Failed to send payment reminder email:', emailError);
        return NextResponse.json(
          { error: 'Failed to send payment reminder email' },
          { status: 500 }
        );
      }
    }

    // Log the reminder
    // helper to extract IP from headers
    const getIpAddress = (): string => {
      const forwarded = request.headers.get('x-forwarded-for');
      if (forwarded && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
      }
      const realIp = request.headers.get('x-real-ip');
      if (realIp && realIp.length > 0) {
        return realIp;
      }
      return 'unknown';
    };

    await supabase
      .from('audit_logs')
      .insert({
        action: 'payment_reminder_sent',
        user_id: user.id,
        details: {
          payment_id: paymentId,
          invoice_id: invoice.id,
          customer_id: validatedData.customerId,
          amount: invoice.amount,
        },
        ip_address: getIpAddress(),
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    return NextResponse.json({
      message: 'Payment reminder sent successfully',
      payment: {
        id: paymentId,
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        due_date: invoice.due_date,
      },
    });

  } catch (error) {
    console.error('Send payment reminder error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues?.[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred while sending payment reminder' },
      { status: 500 }
    );
  }
}
