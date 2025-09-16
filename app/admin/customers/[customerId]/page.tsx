"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { CustomerDetailsView } from "@/components/admin/customer-details-view";

type Customer = {
  id: string;
  servicem8_customer_uuid: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  status: 'active' | 'inactive' | 'banned';
  job_count: number;
  total_value: number;
};

type CustomerJob = {
  id: string;
  job_no: string;
  description: string;
  status: string;
  generated_job_total: number;
  created_at: string;
  updated_at: string;
};

interface PageProps {
  params: Promise<{ customerId: string }>;
}

export default function CustomerDetailsPage(props: PageProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<CustomerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { customerId } = await props.params;
        
        // Load customer details
        const customerResponse = await fetch(`/api/admin/customers/${customerId}`, { cache: "no-store" });
        if (!customerResponse.ok) throw new Error("Failed to load customer details");
        const customerData = await customerResponse.json();
        setCustomer(customerData.customer);

        // Load customer jobs
        const jobsResponse = await fetch(`/api/admin/customers/${customerId}/jobs`, { cache: "no-store" });
        if (!jobsResponse.ok) throw new Error("Failed to load customer jobs");
        const jobsData = await jobsResponse.json();
        setJobs(jobsData.jobs || []);

      } catch (e: unknown) {
        setError((e as Error).message || "Error loading customer details");
      } finally {
        setLoading(false);
      }
    })();
  }, [props.params]);

  const handleBack = () => router.back();

  const handleStatusChange = async (newStatus: 'active' | 'inactive' | 'banned') => {
    if (!customer) return;

    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update customer status');
      
      // Reload customer data
      const customerResponse = await fetch(`/api/admin/customers/${customer.id}`, { cache: "no-store" });
      if (customerResponse.ok) {
        const customerData = await customerResponse.json();
        setCustomer(customerData.customer);
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('Failed to update customer status');
    }
  };

  if (loading) {
    return <LoadingCard message="Loading customer details..." />;
  }

  if (error || !customer) {
    return (
      <div className="px-4 py-8">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 font-medium">
                {error || "Customer not found"}
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
                {customer.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Customer Details & Job History
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button variant="outline" size="sm">
            📊 Generate Report
          </Button>
          <Button variant="outline" size="sm">
            ✉️ Send Email
          </Button>
        </div>
      </div>

      <CustomerDetailsView 
        customer={customer}
        jobs={jobs}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
