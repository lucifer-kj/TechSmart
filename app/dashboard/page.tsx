"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { JobCard } from "@/components/job-card";
// import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/hooks/useRealtime";
import { RealtimeStatusIndicator } from "@/components/realtime-status-indicator";
import { useAuth } from "@/hooks/useAuth";
import { NotificationPermission } from "@/components/notifications/notification-permission";

type Job = {
  uuid: string;
  job_number: string;
  job_description: string;
  status: 'Quote' | 'Work Order' | 'Invoice' | 'Complete' | 'Cancelled';
  generated_job_total: number;
  job_address: string;
  date_created: string;
  date_last_modified: string;
  date_completed?: string;
};

type DashboardStats = {
  totalJobs: number;
  activeJobs: number;
  pendingApprovals: number;
  totalValue: number;
  pendingPayments: number;
  overduePayments: number;
  totalPaid: number;
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'Quote' | 'Work Order' | 'Invoice' | 'Complete'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'value' | 'status'>('recent');
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // const supabase = createClient();

  // Calculate stats helper function
  const calculateStats = (jobData: Job[]): DashboardStats => {
    const totalValue = jobData.reduce((sum: number, j: Job) => sum + (j.generated_job_total || 0), 0);
    const paidJobs = jobData.filter((j: Job) => j.status === 'Complete');
    const invoiceJobs = jobData.filter((j: Job) => j.status === 'Invoice');
    
    return {
      totalJobs: jobData.length,
      activeJobs: jobData.filter((j: Job) => j.status !== 'Complete' && j.status !== 'Cancelled').length,
      pendingApprovals: jobData.filter((j: Job) => j.status === 'Quote').length,
      totalValue,
      pendingPayments: invoiceJobs.length,
      overduePayments: invoiceJobs.filter(j => {
        const dueDate = j.date_completed ? new Date(j.date_completed) : null;
        return dueDate && dueDate < new Date();
      }).length,
      totalPaid: paidJobs.reduce((sum: number, j: Job) => sum + (j.generated_job_total || 0), 0)
    };
  };

  // Initial data load (wait until auth state is known)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setErr("You must be signed in to view jobs.");
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/customer-portal/jobs", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load jobs");
        const data = await res.json();
        setJobs(data.jobs || []);
        setStats(calculateStats(data.jobs || []));
        setErr(null);
      } catch (e: unknown) {
        setErr((e as Error).message || "Error loading jobs");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user]);

  const { status: jobsRtStatus } = useRealtime<Job>({ table: 'jobs' }, ({ eventType, new: newRow, old }) => {
    if (eventType === 'INSERT' && newRow) {
      const newJob = newRow as Job;
      setJobs(prev => {
        const updated = [...prev, newJob];
        setStats(calculateStats(updated));
        return updated;
      });
    } else if (eventType === 'UPDATE' && newRow) {
      const updatedJob = newRow as Job;
      setJobs(prev => {
        const updated = prev.map(job => job.uuid === updatedJob.uuid ? updatedJob : job);
        setStats(calculateStats(updated));
        return updated;
      });
    } else if (eventType === 'DELETE' && old) {
      const deletedJob = old as Job;
      setJobs(prev => {
        const updated = prev.filter(job => job.uuid !== deletedJob.uuid);
        setStats(calculateStats(updated));
        return updated;
      });
    }
  });

  useEffect(() => {
    setRealtimeStatus(jobsRtStatus);
  }, [jobsRtStatus]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const filteredJobs = (filter === 'all' ? jobs : jobs.filter(job => job.status === filter))
    .slice()
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.date_last_modified).getTime() - new Date(a.date_last_modified).getTime();
      }
      if (sortBy === 'value') {
        return (b.generated_job_total || 0) - (a.generated_job_total || 0);
      }
      // status alphabetical, with active statuses first
      const order = ['Work Order', 'Quote', 'Invoice', 'Complete', 'Cancelled'];
      return order.indexOf(a.status) - order.indexOf(b.status);
    });

  const handleViewDetails = (jobId: string) => {
    // Navigate to job details page
    console.log('View details for job:', jobId);
  };

  const handleApproveQuote = (jobId: string) => {
    // Navigate to quote approval page
    console.log('Approve quote for job:', jobId);
  };

  const handleDownloadDocument = (attachmentId: string) => {
    // Handle document download
    console.log('Download document:', attachmentId);
  };

  if (authLoading || loading) {
    return <LoadingCard message="Loading your dashboard..." />;
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login?redirectTo=/dashboard';
    }
    return <LoadingCard message="Redirecting to login..." />;
  }

  if (err) {
    return (
      <div className="px-4 py-8">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-4">
                <div className="text-red-600 dark:text-red-400 text-6xl mb-2">⚠️</div>
                <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
                  Unable to Load Dashboard
                </h2>
                <p className="text-red-600 dark:text-red-400 font-medium mb-4">{err}</p>
              </div>
              
              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  onClick={() => window.location.reload()}
                >
                  🔄 Try Again
                </Button>
                
                <div className="text-sm text-red-500 dark:text-red-400">
                  <p className="mb-2">If the problem persists:</p>
                  <ul className="text-left space-y-1">
                    <li>• Check your internet connection</li>
                    <li>• Verify you&apos;re signed in correctly</li>
                    <li>• Contact support if the issue continues</li>
                  </ul>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/profile'}
                  className="text-xs"
                >
                  View Profile Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            SmartTech Portal
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600 dark:text-gray-400">
              Manage your jobs, quotes, and payments
            </p>
            <RealtimeStatusIndicator status={realtimeStatus} />
          </div>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button variant="outline" size="sm">
            📊 View Reports
          </Button>
        </div>
      </div>

      <NotificationPermission />

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalJobs}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
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
                {stats.activeJobs}
              </div>
              <p className="text-xs text-gray-500 mt-1">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.pendingApprovals}
              </div>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
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
                {formatCurrency(stats.totalValue)}
              </div>
              <p className="text-xs text-gray-500 mt-1">All jobs</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Summary Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.pendingPayments}
              </div>
              <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Overdue Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.overduePayments}
              </div>
              <p className="text-xs text-gray-500 mt-1">Past due date</p>
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
                {formatCurrency(stats.totalPaid)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Completed jobs</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'Quote', 'Work Order', 'Invoice', 'Complete'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {status === 'all' ? 'All Jobs' : status}
            {status !== 'all' && (
              <Badge variant="secondary" className="ml-2">
                {jobs.filter(j => j.status === status).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Jobs Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {filter === 'all' ? 'All Jobs' : `${filter} Jobs`}
          </h2>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Sort by</label>
            <select
              className="border rounded px-2 py-1 text-sm bg-background"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="recent">Most recent</option>
              <option value="value">Total value</option>
              <option value="status">Status</option>
            </select>
            <p className="text-sm text-gray-500">
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {filter === 'all' ? 'No jobs found' : `No ${filter.toLowerCase()} jobs found`}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.uuid}
                job={job}
                onViewDetails={handleViewDetails}
                onApproveQuote={handleApproveQuote}
                onDownloadDocument={handleDownloadDocument}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


