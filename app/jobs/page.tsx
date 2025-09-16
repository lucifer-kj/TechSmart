"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { EmptyJobsState } from "@/components/empty-state";
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

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"date" | "total">("date");

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set("status", statusFilter);
        const res = await fetch(`/api/customer-portal/jobs?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load jobs");
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (e: unknown) {
        setErr((e as Error).message || "Error loading jobs");
      } finally {
        setLoading(false);
      }
    })();
  }, [statusFilter]);

  const handleViewDetails = (jobId: string) => {
    console.log('View details for job:', jobId);
  };

  const handleApproveQuote = (jobId: string) => {
    console.log('Approve quote for job:', jobId);
  };

  const handleDownloadDocument = (attachmentId: string) => {
    console.log('Download document:', attachmentId);
  };

  if (loading) {
    return <LoadingCard message="Loading jobs..." />;
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
          Jobs
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View and manage all your jobs
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Status</label>
          <select
            className="border rounded px-2 py-1 bg-background"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="Quote">Quote</option>
            <option value="Work Order">Work Order</option>
            <option value="Invoice">Invoice</option>
            <option value="Complete">Complete</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Sort by</label>
          <select
            className="border rounded px-2 py-1 bg-background"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'total')}
          >
            <option value="date">Date updated</option>
            <option value="total">Total amount</option>
          </select>
        </div>
        <Button variant="outline" onClick={() => setStatusFilter("")}>Reset</Button>
      </div>

      {jobs.length === 0 ? (
        <EmptyJobsState onRefresh={() => window.location.reload()} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs
            .slice()
            .sort((a, b) => {
              if (sortBy === "total") {
                return (b.generated_job_total || 0) - (a.generated_job_total || 0);
              }
              const aDate = new Date(a.date_last_modified || a.date_created).getTime();
              const bDate = new Date(b.date_last_modified || b.date_created).getTime();
              return bDate - aDate;
            })
            .map((job) => (
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
  );
}
