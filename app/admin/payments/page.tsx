"use client";

import { useEffect, useState, useCallback } from "react";
import { useRealtime } from "@/hooks/useRealtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/loading";
import Link from "next/link";

type AdminPayment = {
  id: string;
  job_id: string;
  job_number: string;
  job_description: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue';
  reference: string;
  due_date: string;
  paid_date?: string;
  created_at: string;
  updated_at: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
};

type PaymentFilters = {
  status: string;
  customer: string;
  dateRange: string;
  sortBy: 'date' | 'amount' | 'customer' | 'due_date';
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PaymentFilters>({
    status: '',
    customer: '',
    dateRange: '',
    sortBy: 'date'
  });

  const loadPayments = useCallback(async (forceSync = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.customer) params.append('customer', filters.customer);
      if (filters.dateRange) params.append('dateRange', filters.dateRange);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      
      // Force sync on first load or manual sync
      if (forceSync) {
        params.append('sync', 'true');
      }

      console.log('📡 Loading payments with params:', params.toString());
      const response = await fetch(`/api/admin/payments?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load payments");
      const data = await response.json();
      
      console.log('📊 Payments API Response:', data);
      setPayments(data.payments || []);
      
      // Log ServiceM8 status for debugging
      if (data.servicem8_status) {
        console.log('📊 ServiceM8 Status:', data.servicem8_status);
        if (!data.servicem8_status.available) {
          console.warn('⚠️ ServiceM8 not available:', data.servicem8_status.error);
        }
      }
    } catch (e: unknown) {
      setError((e as Error).message || "Error loading payments");
      console.error('❌ Load payments error:', e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const isFirstLoad = true;
    loadPayments(isFirstLoad);
  }, [loadPayments]); // ✅ react-hooks/exhaustive-deps resolved

  // Realtime: update list on job updates that affect payments
  useRealtime<AdminPayment>({ table: 'jobs' }, ({ eventType, new: newRow }) => {
    // Only update if the job status affects payments (Invoice/Complete)
    if (eventType === 'UPDATE' && newRow) {
      const job = newRow as { status: string };
      if (['Invoice', 'Complete'].includes(job.status)) {
        loadPayments(false); // Refresh payments when job status changes
      }
    }
  });

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

  const getStatusBadge = (status: string, dueDate?: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Paid</Badge>;
      case 'overdue':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">Overdue</Badge>;
      case 'pending':
        // Check if due soon (within 7 days)
        if (dueDate) {
          const due = new Date(dueDate);
          const sevenDaysFromNow = new Date();
          sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
          if (due <= sevenDaysFromNow) {
            return <Badge variant="warning" className="bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100">Due Soon</Badge>;
          }
        }
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesStatus = !filters.status || payment.status === filters.status;
    const matchesCustomer = !filters.customer || 
      payment.customer_name.toLowerCase().includes(filters.customer.toLowerCase()) ||
      payment.customer_email.toLowerCase().includes(filters.customer.toLowerCase());
    
    return matchesStatus && matchesCustomer;
  });

  const sortedPayments = filteredPayments.sort((a, b) => {
    switch (filters.sortBy) {
      case 'amount':
        return (b.amount || 0) - (a.amount || 0);
      case 'customer':
        return a.customer_name.localeCompare(b.customer_name);
      case 'due_date':
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      case 'date':
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
  });

  const totalAmount = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const paidAmount = payments.filter(p => p.status === 'paid').reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const overdueAmount = payments.filter(p => p.status === 'overdue').reduce((sum, payment) => sum + (payment.amount || 0), 0);

  if (loading) {
    return <LoadingCard message="Loading payments..." />;
  }

  if (error) {
    return (
      <div className="px-4 py-8">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
              <Button 
                className="mt-4" 
                onClick={() => loadPayments()}
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Payment Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track and manage customer payments
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button variant="outline" size="sm">
            📊 Payment Report
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => loadPayments(false)}
            disabled={loading}
          >
            🔄 Refresh Data
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => loadPayments(true)}
            disabled={loading}
          >
            🔄 Sync ServiceM8
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(paidAmount)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {payments.filter(p => p.status === 'paid').length} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {formatCurrency(pendingAmount)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {payments.filter(p => p.status === 'pending').length} payments
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
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(overdueAmount)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {payments.filter(p => p.status === 'overdue').length} payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer
              </label>
              <input
                type="text"
                value={filters.customer}
                onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
                placeholder="Search by customer name or email"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as 'date' | 'amount' | 'customer' | 'due_date' }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="date">Date Updated</option>
                <option value="amount">Amount</option>
                <option value="customer">Customer Name</option>
                <option value="due_date">Due Date</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payments ({filteredPayments.length})</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFilters({ status: '', customer: '', dateRange: '', sortBy: 'date' })}
            >
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedPayments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No payments found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Link 
                        href={`/admin/jobs/${payment.job_id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Payment #{payment.reference}
                      </Link>
                      {getStatusBadge(payment.status, payment.due_date)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {payment.job_description || 'No description provided'}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Customer: {payment.customer_name}</span>
                      <span>Due: {formatDate(payment.due_date)}</span>
                      {payment.paid_date && <span>Paid: {formatDate(payment.paid_date)}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(payment.amount || 0)}
                    </div>
                    <Link 
                      href={`/admin/customers/${payment.customer_id}`}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      View Customer
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
