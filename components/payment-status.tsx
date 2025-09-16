"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface Payment {
  jobNumber: string;
  description: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partial';
  dueDate?: string;
  paidDate?: string;
}

interface PaymentStatusProps {
  payments: Payment[];
  onPayNow?: (paymentId: string) => void;
  onViewInvoice?: (paymentId: string) => void;
}

export function PaymentStatus({ payments, onPayNow, onViewInvoice }: PaymentStatusProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'success';
      case 'Pending': return 'warning';
      case 'Overdue': return 'destructive';
      case 'Partial': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid': return '✅';
      case 'Pending': return '⏳';
      case 'Overdue': return '⚠️';
      case 'Partial': return '🔄';
      default: return '❓';
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const totalOutstanding = payments
    .filter(p => p.status !== 'Paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaid = payments
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totalOutstanding)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {payments.filter(p => p.status !== 'Paid').length} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {payments.filter(p => p.status === 'Paid').length} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {payments.filter(p => isOverdue(p.dueDate)).length}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              invoices overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment List */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No payment history available
              </div>
            ) : (
              payments.map((payment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{getStatusIcon(payment.status)}</span>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        Job #{payment.jobNumber}
                      </h4>
                      <p className="text-sm text-gray-500">{payment.description}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        {payment.dueDate && (
                          <span className="text-xs text-gray-400">
                            Due: {formatDate(payment.dueDate)}
                            {isOverdue(payment.dueDate) && (
                              <span className="text-red-500 ml-1">(Overdue)</span>
                            )}
                          </span>
                        )}
                        {payment.paidDate && (
                          <span className="text-xs text-gray-400">
                            Paid: {formatDate(payment.paidDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(payment.amount)}
                      </div>
                      <Badge variant={getStatusColor(payment.status) as 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'}>
                        {payment.status}
                      </Badge>
                    </div>
                    
                    <div className="flex space-x-2">
                      {onViewInvoice && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewInvoice(payment.jobNumber)}
                        >
                          View Invoice
                        </Button>
                      )}
                      {payment.status !== 'Paid' && onPayNow && (
                        <Button
                          size="sm"
                          onClick={() => onPayNow(payment.jobNumber)}
                          className={payment.status === 'Overdue' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                          Pay Now
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
