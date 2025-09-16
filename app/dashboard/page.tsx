"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { JobCard } from "@/components/job-card";

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
};

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'Quote' | 'Work Order' | 'Invoice' | 'Complete'>('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/servicem8/jobs", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load jobs");
        const data = await res.json();
        setJobs(data.jobs || []);
        
        // Calculate stats
        const jobData = data.jobs || [];
        setStats({
          totalJobs: jobData.length,
          activeJobs: jobData.filter((j: Job) => j.status !== 'Complete' && j.status !== 'Cancelled').length,
          pendingApprovals: jobData.filter((j: Job) => j.status === 'Quote').length,
          totalValue: jobData.reduce((sum: number, j: Job) => sum + (j.generated_job_total || 0), 0)
        });
      } catch (e: unknown) {
        setErr((e as Error).message || "Error loading jobs");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const filteredJobs = filter === 'all' 
    ? jobs 
    : jobs.filter(job => job.status === filter);

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

  if (loading) {
    return <LoadingCard message="Loading your dashboard..." />;
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
    <div className="px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            SmartTech Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your jobs, quotes, and payments
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button variant="outline" size="sm">
            📊 View Reports
          </Button>
        </div>
      </div>

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
          <p className="text-sm text-gray-500">
            {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
          </p>
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


