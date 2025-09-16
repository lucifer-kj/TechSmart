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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/servicem8/jobs", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load jobs");
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (e: unknown) {
        setErr((e as Error).message || "Error loading jobs");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

      {jobs.length === 0 ? (
        <EmptyJobsState onRefresh={() => window.location.reload()} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
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
