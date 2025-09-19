"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { EmptyPaymentsState } from "@/components/empty-state";
import { PaymentStatus } from "@/components/payment-status";
import { useRealtime } from "@/hooks/useRealtime";
import { RealtimeStatusIndicator } from "@/components/realtime-status-indicator";

type Payment = {
  id: string;
  jobNumber: string;
  description: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partial';
  dueDate?: string;
  paidDate?: string;
  statusHistory?: PaymentStatusUpdate[];
};

type PaymentStatusUpdate = {
  id: string;
  previous_status: string;
  new_status: string;
  updated_at: string;
  updated_by: string;
  notes?: string;
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rtStatus, setRtStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/customer-portal/payments", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load payments");
        const data = await res.json();
        setPayments(data.payments || []);
      } catch (e: unknown) {
        setErr((e as Error).message || "Error loading payments");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Listen to payment status updates and new payments
  const { status } = useRealtime<Payment>({ table: 'payments' }, ({ eventType, new: newRow, old }) => {
    if (eventType === 'INSERT' && newRow) {
      setPayments(prev => [newRow as Payment, ...prev]);
    } else if (eventType === 'UPDATE' && newRow) {
      const updated = newRow as Payment;
      setPayments(prev => prev.map(p => p.id === updated.id ? updated : p));
    } else if (eventType === 'DELETE' && old) {
      const deleted = old as Payment;
      setPayments(prev => prev.filter(p => p.id !== deleted.id));
    }
  });

  useEffect(() => {
    setRtStatus(status);
  }, [status]);

  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  const handlePayNow = async (paymentId: string) => {
    setProcessingPayment(paymentId);
    try {
      // For now, redirect to external payment processor
      // In a real implementation, this would integrate with payment gateway
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) {
        setErr('Payment not found');
        return;
      }
      
      // Create payment intent or redirect to payment processor
      const response = await fetch(`/api/customer-portal/payments/${paymentId}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: payment.amount })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }
      
      const { paymentUrl } = await response.json();
      
      // Redirect to payment processor
      window.open(paymentUrl, '_blank');
      
    } catch (error) {
      console.error('Payment error:', error);
      setErr('Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleViewInvoice = async (paymentId: string) => {
    try {
      // Find related documents for this payment
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) {
        setErr('Payment not found');
        return;
      }
      
      // Open invoice document in new tab
      const invoiceUrl = `/api/servicem8/attachments/invoice-${paymentId}`;
      window.open(invoiceUrl, '_blank');
      
    } catch (error) {
      console.error('Invoice view error:', error);
      setErr('Failed to open invoice. Please try again.');
    }
  };

  // Fetch of payment status history is done inside detail views when needed.

  if (loading) {
    return <LoadingCard message="Loading payment history..." />;
  }

  if (err) {
    return (
      <div className="px-4 py-8">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 font-medium">{err}</p>
              <Button 
                className="mt-4" 
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Payments
        </h1>
        <div className="flex items-center gap-2">
          <RealtimeStatusIndicator status={rtStatus} />
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setLoading(true);
              setErr(null);
              try {
                const res = await fetch('/api/customer-portal/payments?refresh=true', { cache: 'no-store' });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Refresh failed');
                setPayments(data.payments || []);
              } catch (e) {
                setErr((e as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          >
            🔄 Refresh
          </Button>
        </div>
      </div>

      {payments.length === 0 ? (
        <EmptyPaymentsState />
      ) : (
        <PaymentStatus
          payments={payments}
          onPayNow={handlePayNow}
          onViewInvoice={handleViewInvoice}
          processingPayment={processingPayment}
        />
      )}
    </div>
  );
}
