"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/loading";

type ReportData = {
  totalCustomers: number;
  activeUsers: number;
  totalJobs: number;
  completedJobs: number;
  pendingQuotes: number;
  approvedQuotes: number;
  totalDocuments: number;
  acknowledgedDocuments: number;
  totalRevenue: number;
  pendingPayments: number;
  recentActivity: ActivityItem[];
  customerGrowth: GrowthData[];
  jobsByStatus: StatusData[];
};

type ActivityItem = {
  id: string;
  event: string;
  customer_name?: string;
  actor_email?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
};

type GrowthData = {
  month: string;
  customers: number;
  users: number;
  jobs: number;
};

type StatusData = {
  status: string;
  count: number;
  value: number;
};

type DateRange = 'week' | 'month' | 'quarter' | 'year';

export default function AdminReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [refreshing, setRefreshing] = useState(false);

  const loadReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reports?range=${dateRange}`, { 
        cache: 'no-store' 
      });
      if (!response.ok) throw new Error('Failed to load report data');
      const data = await response.json();
      setReportData(data);
    } catch (e: unknown) {
      setError((e as Error).message || 'Error loading report data');
      console.error('Report data error:', e);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);


  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await fetch(`/api/admin/reports/export?format=${format}&range=${dateRange}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error(`Failed to export ${format.toUpperCase()}`);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-report-${dateRange}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export ${format.toUpperCase()}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'complete':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'quote':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      case 'work order':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'invoice':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  if (loading) {
    return <LoadingCard message="Loading reports..." />;
  }

  if (error || !reportData) {
    return (
      <div className="px-4 py-8">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 font-medium">
                {error || "Failed to load report data"}
              </p>
              <Button 
                className="mt-4" 
                onClick={loadReportData}
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Business insights and performance metrics
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
          >
            📊 Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
          >
            📄 Export PDF
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalCustomers}</div>
            <p className="text-xs text-gray-500 mt-1">
              {reportData.activeUsers} with portal access
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalJobs}</div>
            <p className="text-xs text-gray-500 mt-1">
              {reportData.completedJobs} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Quote Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.pendingQuotes > 0 
                ? Math.round((reportData.approvedQuotes / (reportData.approvedQuotes + reportData.pendingQuotes)) * 100)
                : 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {reportData.approvedQuotes} approved, {reportData.pendingQuotes} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(reportData.totalRevenue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(reportData.pendingPayments)} pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Jobs by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Jobs by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.jobsByStatus.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.count} jobs
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Customer Growth */}
        <Card>
          <CardHeader>
            <CardTitle>Growth Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.customerGrowth.slice(-6).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.month}</span>
                  <div className="flex space-x-4 text-sm">
                    <span className="text-blue-600">
                      {item.customers} customers
                    </span>
                    <span className="text-green-600">
                      {item.users} users
                    </span>
                    <span className="text-purple-600">
                      {item.jobs} jobs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Badge variant="secondary">
              Last {reportData.recentActivity.length} events
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {reportData.recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reportData.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {activity.event.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      {activity.customer_name && (
                        <Badge variant="outline" className="text-xs">
                          {activity.customer_name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                      <span>{formatDate(activity.created_at)}</span>
                      {activity.actor_email && (
                        <span>by {activity.actor_email}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
