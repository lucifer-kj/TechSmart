"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { DocumentViewer } from "@/components/document-viewer";
import { QuoteApprovalForm } from "@/components/quote-approval-form";
import { CustomerFeedback } from "@/components/customer-feedback";

type JobMaterial = {
  uuid: string;
  name: string;
  description: string;
  qty: number;
  cost_ex_tax: number;
  total_ex_tax: number;
  total_inc_tax: number;
};

type Attachment = {
  uuid: string;
  file_name: string;
  file_type: string;
  attachment_source: string;
  date_created: string;
  file_size: number;
};

type JobDetails = {
  uuid: string;
  job_number: string;
  job_description: string;
  status: "Quote" | "Work Order" | "Invoice" | "Complete" | "Cancelled";
  generated_job_total: number;
  job_address: string;
  date_created: string;
  date_last_modified: string;
  date_completed?: string;
};

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default function JobDetailPage(props: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobDetails | null>(null);
  const [materials, setMaterials] = useState<JobMaterial[]>([]);
  const [documents, setDocuments] = useState<{
    uuid: string;
    file_name: string;
    file_type: string;
    file_size: number;
    attachment_source: string;
    date_created: string;
    downloadUrl: string;
    previewUrl?: string;
    category: 'quote' | 'invoice' | 'photo' | 'document';
  }[]>([]);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { jobId } = await props.params;
        const res = await fetch(`/api/servicem8/jobs/${jobId}`);
        if (!res.ok) throw new Error("Failed to load job details");
        const data = await res.json();

        setJob(data.job);
        setMaterials(data.materials || []);
        const docs = (data.attachments || []).map((att: Attachment) => ({
          ...att,
          downloadUrl: `/api/servicem8/attachments/${att.uuid}`,
          category: att.attachment_source?.toLowerCase() === "quote"
            ? "quote"
            : att.attachment_source?.toLowerCase() === "invoice"
            ? "invoice"
            : att.attachment_source?.toLowerCase() === "photo"
            ? "photo"
            : "document",
        }));
        setDocuments(docs);
      } catch (e: unknown) {
        setError((e as Error).message || "Error loading job");
      } finally {
        setLoading(false);
      }
    })();
  }, [props.params]);

  const handleBack = () => router.back();

  const handleDownload = (attachmentId: string) => {
    window.open(`/api/servicem8/attachments/${attachmentId}`, "_blank");
  };

  const handleApprove = async (signature: string, notes: string) => {
    if (!job) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/servicem8/jobs/${job.uuid}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, notes }),
      });
      if (!res.ok) throw new Error("Approval failed");
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Failed to approve quote");
    } finally {
      setApproving(false);
    }
  };

  const handleFeedbackSubmit = async (data: {
    jobId: string;
    feedback: string;
    rating: number;
    feedbackType: 'general' | 'complaint' | 'compliment' | 'suggestion';
  }): Promise<boolean> => {
    try {
      const response = await fetch(`/api/customer-portal/jobs/${data.jobId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      return true;
    } catch (error) {
      console.error('Feedback submission error:', error);
      return false;
    }
  };

  if (loading) return <LoadingCard message="Loading job..." />;
  if (error) {
    return (
      <div className="px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <Button onClick={() => router.refresh()}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job) return null;

  const isQuote = job.status === "Quote";

  return (
    <div className="px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job #{job.job_number}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{job.job_address}</p>
        </div>
        <Button variant="outline" onClick={handleBack}>Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">{job.job_description}</p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Status</span>
              <p className="font-medium">{job.status}</p>
            </div>
            <div>
              <span className="text-gray-500">Total</span>
              <p className="font-medium">
                {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(job.generated_job_total || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Materials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {materials.map((m) => (
              <div key={m.uuid} className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{m.qty}x {m.name}</span>
                <span className="font-medium">{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(m.total_inc_tax)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentViewer
            documents={documents}
            onDownload={handleDownload}
          />
        </CardContent>
      </Card>

      {isQuote && (
        <Card>
          <CardHeader>
            <CardTitle>Approve Quote</CardTitle>
          </CardHeader>
          <CardContent>
            <QuoteApprovalForm
              jobNumber={job.job_number}
              jobDescription={job.job_description}
              materials={materials}
              totalAmount={job.generated_job_total || 0}
              onApprove={handleApprove}
              isLoading={approving}
            />
          </CardContent>
        </Card>
      )}

      {/* Customer Feedback */}
      <CustomerFeedback
        jobId={job.uuid}
        jobNumber={job.job_number}
        onSubmit={handleFeedbackSubmit}
      />
    </div>
  );
}


