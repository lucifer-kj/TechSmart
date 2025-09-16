"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Customer {
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
}

interface CustomerJob {
  id: string;
  job_no: string;
  description: string;
  status: string;
  generated_job_total: number;
  created_at: string;
  updated_at: string;
}

interface CustomerDetailsViewProps {
  customer: Customer;
  jobs: CustomerJob[];
  onStatusChange: (status: 'active' | 'inactive' | 'banned') => void;
}

export function CustomerDetailsView({ customer, jobs, onStatusChange }: CustomerDetailsViewProps) {
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
    switch (status) {
      case 'active':
        return <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Active</Badge>;
      case 'inactive':
        return <Badge variant="warning" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">Inactive</Badge>;
      case 'banned':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">Banned</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getJobStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'complete':
        return <Badge variant="success">Complete</Badge>;
      case 'invoice':
        return <Badge variant="warning">Invoice</Badge>;
      case 'work order':
        return <Badge variant="secondary">Work Order</Badge>;
      case 'quote':
        return <Badge variant="outline">Quote</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never logged in';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)} days ago`;
    } else {
      return formatDate(lastLogin);
    }
  };

  return (
    <div className="space-y-6">
      {/* Customer Information */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Customer Information</CardTitle>
              <div className="flex items-center space-x-2">
                {getStatusBadge(customer.status)}
                <select
                  value={customer.status}
                  onChange={(e) => onStatusChange(e.target.value as 'active' | 'inactive' | 'banned')}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="banned">Ban</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{customer.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer ID</label>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{customer.servicem8_customer_uuid}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{customer.email || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{customer.phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(customer.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Login</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formatLastLogin(customer.last_login)}</p>
              </div>
            </div>
            {customer.address && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{customer.address}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {customer.job_count}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Jobs</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(customer.total_value)}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(customer.total_value / Math.max(customer.job_count, 1))}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Job Value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Job History ({jobs.length})</CardTitle>
            <Button variant="outline" size="sm">
              View All Jobs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No jobs found for this customer</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.slice(0, 10).map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Link 
                        href={`/admin/jobs/${job.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Job #{job.job_no}
                      </Link>
                      {getJobStatusBadge(job.status)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {job.description || 'No description provided'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Created: {formatDate(job.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(job.generated_job_total || 0)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Updated: {formatDate(job.updated_at)}
                    </p>
                  </div>
                </div>
              ))}
              {jobs.length > 10 && (
                <div className="text-center pt-4">
                  <Button variant="outline">
                    View {jobs.length - 10} more jobs
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-gray-600 dark:text-gray-400">Customer profile updated</span>
              <span className="text-gray-500 dark:text-gray-500">2 hours ago</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-gray-600 dark:text-gray-400">New job created: Job #12345</span>
              <span className="text-gray-500 dark:text-gray-500">1 day ago</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span className="text-gray-600 dark:text-gray-400">Quote approved for Job #12344</span>
              <span className="text-gray-500 dark:text-gray-500">3 days ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
