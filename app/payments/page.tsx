"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { EmptyPaymentsState } from "@/components/empty-state";
import { PaymentStatus } from "@/components/payment-status";

type Payment = {
  jobNumber: string;
  description: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partial';
  dueDate?: string;
  paidDate?: string;
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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

  const handlePayNow = (paymentId: string) => {
    console.log('Pay now for:', paymentId);
  };

  const handleViewInvoice = (paymentId: string) => {
    console.log('View invoice for:', paymentId);
  };

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Payments
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View payment history and manage outstanding invoices
        </p>
      </div>

      {payments.length === 0 ? (
        <EmptyPaymentsState />
      ) : (
        <PaymentStatus
          payments={payments}
          onPayNow={handlePayNow}
          onViewInvoice={handleViewInvoice}
        />
      )}
    </div>
  );
}
