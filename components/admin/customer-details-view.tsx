"use client";

import Link from "next/link";
import { useState } from "react";
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
  has_portal_access?: boolean;
  portal_access_created_at?: string;
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
  onStatusChange: (status: 'active' | 'inactive' | 'banned', reason?: string) => void;
  onPortalAccessToggle: (hasAccess: boolean) => void;
}

export function CustomerDetailsView({ customer, jobs, onStatusChange, onPortalAccessToggle }: CustomerDetailsViewProps) {
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [showAllJobs, setShowAllJobs] = useState(false);

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

  const handleStatusChange = (newStatus: 'active' | 'inactive' | 'banned') => {
    if (newStatus === 'banned') {
      setShowBanModal(true);
    } else {
      onStatusChange(newStatus);
    }
  };

  const handleBanConfirm = () => {
    onStatusChange('banned', banReason);
    setShowBanModal(false);
    setBanReason('');
  };

  const handleBanCancel = () => {
    setShowBanModal(false);
    setBanReason('');
  };

  const toggleJobExpansion = (jobId: string) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  const displayJobs = showAllJobs ? jobs : jobs.slice(0, 5);

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
                  onChange={(e) => handleStatusChange(e.target.value as 'active' | 'inactive' | 'banned')}
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const name = prompt('Update name', customer.name) || customer.name;
                  const email = prompt('Update email', customer.email) || customer.email;
                  const phone = prompt('Update phone', customer.phone) || customer.phone;
                  const address = prompt('Update address', customer.address || '') || customer.address || '';
                  await fetch(`/api/admin/customers/${customer.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, phone, address })
                  });
                  location.reload();
                }}
              >
                ✏️ Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBanModal(true)}
              >
                🚫 Ban
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await fetch(`/api/admin/customers/${customer.id}/unban`, { method: 'POST' });
                  location.reload();
                }}
              >
                ✅ Unban
              </Button>
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

      {/* Portal Access Management */}
      <Card>
        <CardHeader>
          <CardTitle>Portal Access Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Portal Access Status
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {customer.has_portal_access ? 'Customer has portal access' : 'Customer does not have portal access'}
              </p>
              {customer.portal_access_created_at && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Access created: {formatDate(customer.portal_access_created_at)}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={customer.has_portal_access || false}
                  onChange={(e) => onPortalAccessToggle(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Portal Access
                </span>
              </label>
            </div>
          </div>
          
          {customer.has_portal_access && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                Portal Access Actions
              </h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  🔑 Reset Password
                </Button>
                <Button variant="outline" size="sm">
                  ✉️ Send Login Link
                </Button>
                <Button variant="outline" size="sm">
                  📧 Resend Welcome Email
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Job History ({jobs.length})</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAllJobs(!showAllJobs)}
              >
                {showAllJobs ? 'Show Less' : `View All ${jobs.length} Jobs`}
              </Button>
              <Button variant="outline" size="sm">
                📊 Job Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No jobs found for this customer</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayJobs.map((job) => (
                <div key={job.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Link 
                          href={`/admin/jobs/${job.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Job #{job.job_no}
                        </Link>
                        {getJobStatusBadge(job.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleJobExpansion(job.id)}
                          className="text-xs"
                        >
                          {expandedJobs.has(job.id) ? '▼' : '▶'} Details
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {job.description || 'No description provided'}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Created: {formatDate(job.created_at)}</span>
                        <span>Updated: {formatDate(job.updated_at)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(job.generated_job_total || 0)}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <Button variant="outline" size="sm" className="text-xs">
                          📄 Docs
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs">
                          📧 Contact
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Job Details */}
                  {expandedJobs.has(job.id) && (
                    <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <div className="grid gap-4 md:grid-cols-2 pt-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Actions</h4>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="text-xs">
                              📋 View Details
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs">
                              📄 Documents
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs">
                              💬 Add Note
                            </Button>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status Timeline</h4>
                          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                            <div>• Created: {formatDate(job.created_at)}</div>
                            <div>• Last Updated: {formatDate(job.updated_at)}</div>
                            <div>• Current Status: {job.status}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {jobs.length > 5 && !showAllJobs && (
                <div className="text-center pt-4">
                  <Button variant="outline" onClick={() => setShowAllJobs(true)}>
                    View {jobs.length - 5} more jobs
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

      {/* Ban Confirmation Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">Ban Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to ban <strong>{customer.name}</strong>? 
                This will revoke their portal access and terminate any active sessions.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason for ban (required)
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Enter reason for banning this customer..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  rows={3}
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="outline" onClick={handleBanCancel}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleBanConfirm}
                  disabled={!banReason.trim()}
                >
                  Ban Customer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
