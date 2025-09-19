"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/loading";
import Link from "next/link";

type AdminJob = {
  id: string;
  job_no: string;
  description: string;
  status: string;
  generated_job_total: number;
  created_at: string;
  updated_at: string;
  customer_id: string;
  customer_name: string;
  customer_email?: string;
};

type JobFilters = {
  status: string;
  customer: string;
  dateRange: string;
  sortBy: 'date' | 'total' | 'customer';
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<JobFilters>({
    status: '',
    customer: '',
    dateRange: '',
    sortBy: 'date'
  });

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.customer) params.append('customer', filters.customer);
      if (filters.dateRange) params.append('dateRange', filters.dateRange);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);

      const response = await fetch(`/api/admin/jobs?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load jobs");
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (e: unknown) {
      setError((e as Error).message || "Error loading jobs");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]); // ✅ react-hooks/exhaustive-deps resolved

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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'complete':
        return <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Complete</Badge>;
      case 'invoice':
        return <Badge variant="warning" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">Invoice</Badge>;
      case 'work order':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">Work Order</Badge>;
      case 'quote':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">Quote</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesStatus = !filters.status || job.status.toLowerCase() === filters.status.toLowerCase();
    const matchesCustomer = !filters.customer || 
      job.customer_name.toLowerCase().includes(filters.customer.toLowerCase()) ||
      job.customer_email?.toLowerCase().includes(filters.customer.toLowerCase());
    
    return matchesStatus && matchesCustomer;
  });

  const sortedJobs = filteredJobs.sort((a, b) => {
    switch (filters.sortBy) {
      case 'total':
        return (b.generated_job_total || 0) - (a.generated_job_total || 0);
      case 'customer':
        return a.customer_name.localeCompare(b.customer_name);
      case 'date':
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
  });

  if (loading) {
    return <LoadingCard message="Loading all jobs..." />;
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
                onClick={() => loadJobs()}
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
            All Jobs
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage jobs across all customers
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button variant="outline" size="sm">
            📊 Export Report
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              const params = new URLSearchParams();
              if (filters.status) params.append('status', filters.status);
              if (filters.customer) params.append('customer', filters.customer);
              if (filters.dateRange) params.append('dateRange', filters.dateRange);
              if (filters.sortBy) params.append('sortBy', filters.sortBy);
              params.append('refresh', 'true');
              setLoading(true);
              try {
                const res = await fetch(`/api/admin/jobs?${params.toString()}`, { cache: 'no-store' });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Refresh failed');
                setJobs(data.jobs || []);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          >
            🔄 Refresh Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {jobs.filter(j => j.status !== 'Complete' && j.status !== 'Cancelled').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Pending Quotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {jobs.filter(j => j.status === 'Quote').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(jobs.reduce((sum, job) => sum + (job.generated_job_total || 0), 0))}
            </div>
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
                <option value="Quote">Quote</option>
                <option value="Work Order">Work Order</option>
                <option value="Invoice">Invoice</option>
                <option value="Complete">Complete</option>
                <option value="Cancelled">Cancelled</option>
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
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as 'date' | 'total' | 'customer' }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="date">Date Updated</option>
                <option value="total">Total Amount</option>
                <option value="customer">Customer Name</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Jobs ({filteredJobs.length})</CardTitle>
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
          {sortedJobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No jobs found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Link 
                        href={`/admin/jobs/${job.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Job #{job.job_no}
                      </Link>
                      {getStatusBadge(job.status)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {job.description || 'No description provided'}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Customer: {job.customer_name}</span>
                      <span>Created: {formatDate(job.created_at)}</span>
                      <span>Updated: {formatDate(job.updated_at)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(job.generated_job_total || 0)}
                    </div>
                    <Link 
                      href={`/admin/customers/${job.customer_id}`}
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
