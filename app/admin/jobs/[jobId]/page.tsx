"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/loading";
import Link from "next/link";

type AdminJobDetail = {
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
  customer_phone?: string;
  address?: string;
  materials?: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  attachments?: Array<{
    id: string;
    filename: string;
    file_type: string;
    uploaded_at: string;
  }>;
};

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default function AdminJobDetailPage(props: PageProps) {
  const router = useRouter();
  const [job, setJob] = useState<AdminJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { jobId } = await props.params;
        
        const response = await fetch(`/api/admin/jobs/${jobId}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load job details");
        const data = await response.json();
        setJob(data.job);
      } catch (e: unknown) {
        setError((e as Error).message || "Error loading job details");
      } finally {
        setLoading(false);
      }
    })();
  }, [props.params]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
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

  const handleBack = () => router.back();

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;

    try {
      const response = await fetch(`/api/admin/jobs/${job.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update job status');
      
      // Reload job data
      const jobResponse = await fetch(`/api/admin/jobs/${job.id}`, { cache: "no-store" });
      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        setJob(jobData.job);
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('Failed to update job status');
    }
  };

  if (loading) {
    return <LoadingCard message="Loading job details..." />;
  }

  if (error || !job) {
    return (
      <div className="px-4 py-8">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 font-medium">
                {error || "Job not found"}
              </p>
              <Button 
                className="mt-4" 
                onClick={handleBack}
              >
                Go Back
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
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              ← Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Job #{job.job_no}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Job Details & Management
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button variant="outline" size="sm">
            📊 Generate Report
          </Button>
          <Button variant="outline" size="sm">
            ✉️ Contact Customer
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Job Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Job Information</CardTitle>
              <div className="flex items-center space-x-2">
                {getStatusBadge(job.status)}
                <select
                  value={job.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
                >
                  <option value="Quote">Quote</option>
                  <option value="Work Order">Work Order</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Complete">Complete</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Job Number</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">#{job.job_no}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Value</label>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(job.generated_job_total || 0)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(job.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(job.updated_at)}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {job.description || 'No description provided'}
              </p>
            </div>
            {job.address && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{job.address}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Name</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{job.customer_name}</p>
            </div>
            {job.customer_email && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{job.customer_email}</p>
              </div>
            )}
            {job.customer_phone && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{job.customer_phone}</p>
              </div>
            )}
            <div className="pt-4">
              <Link 
                href={`/admin/customers/${job.customer_id}`}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
              >
                View Customer Details →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Materials */}
      {job.materials && job.materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Materials & Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {job.materials.map((material) => (
                <div key={material.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{material.description}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Quantity: {material.quantity} × {formatCurrency(material.unit_price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(material.total_price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {job.attachments && job.attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documents & Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {job.attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{attachment.filename}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Type: {attachment.file_type} • Uploaded: {formatDate(attachment.uploaded_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      👁️ View
                    </Button>
                    <Button variant="outline" size="sm">
                      📥 Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
