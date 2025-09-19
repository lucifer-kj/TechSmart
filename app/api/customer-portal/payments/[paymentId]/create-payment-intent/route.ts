import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paymentId } = await params;
    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify customer has access to this payment
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.customer_id) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('customer_id', profile.customer_id)
      .single();

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // In a real implementation, this would integrate with payment processors like:
    // - Stripe
    // - PayPal
    // - Square
    // - Local payment gateway
    
    // For now, return a mock payment URL
    // In production, this would create a real payment intent
    const mockPaymentUrl = `https://payment.example.com/pay/${paymentId}?amount=${amount}&currency=AUD`;
    
    // Log payment intent creation for audit
    await supabase
      .from('audit_logs')
      .insert({
        customer_id: profile.customer_id,
        actor_id: user.id,
        event: 'payment_intent_created',
        metadata: {
          payment_id: paymentId,
          amount: amount,
          currency: 'AUD'
        }
      });

    return NextResponse.json({
      paymentUrl: mockPaymentUrl,
      paymentIntentId: `pi_${paymentId}_${Date.now()}`,
      amount: amount,
      currency: 'AUD',
      status: 'requires_payment_method'
    });

  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create payment intent',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
