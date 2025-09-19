"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { CustomerCreationForm } from "@/components/admin/customer-creation-form";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => router.back();

  const handleCustomerCreated = (customerId: string) => {
    // Navigate to the new customer's details page
    router.push(`/admin/customers/${customerId}`);
  };

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
                Create New Customer
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Add a new customer to the system and create portal access
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Creation Form */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CustomerCreationForm
            onCustomerCreated={handleCustomerCreated}
            onError={setError}
            onLoading={setLoading}
          />
        </div>

        {/* Help Card */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Creation Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-2">
                Required Information
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Customer name and contact details</li>
                <li>• ServiceM8 customer UUID (if existing)</li>
                <li>• Portal access preferences</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-2">
                What Happens Next
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Customer record created in Supabase</li>
                <li>• <strong>All existing jobs & data synced from ServiceM8</strong></li>
                <li>• Portal access credentials generated</li>
                <li>• Welcome email sent (if configured)</li>
                <li>• Customer can access portal with full data</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-2">
                Tips
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Use existing ServiceM8 UUID to auto-sync all data</li>
                <li>• System validates UUID exists in ServiceM8</li>
                <li>• All jobs, documents & history imported automatically</li>
                <li>• Generate temporary password for first login</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
              <Button 
                className="mt-4" 
                onClick={() => setError(null)}
                variant="outline"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-sm w-full mx-4">
            <CardContent className="pt-6">
              <LoadingCard message="Creating customer..." />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
