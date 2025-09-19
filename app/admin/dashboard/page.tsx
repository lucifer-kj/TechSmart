"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { useRouter } from "next/navigation";

type AdminStats = {
  totalCustomers: number;
  activeCustomers: number;
  totalJobs: number;
  activeJobs: number;
  pendingApprovals: number;
  totalRevenue: number;
  recentActivity: AdminActivity[];
};

type AdminActivity = {
  id: string;
  type: 'customer_created' | 'job_updated' | 'payment_received' | 'feedback_submitted';
  description: string;
  timestamp: string;
  customerName?: string;
  jobNumber?: string;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();


  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load admin dashboard data");
        const data = await response.json();
        setStats(data.stats);
      } catch (e: unknown) {
        setError((e as Error).message || "Error loading dashboard data");
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'customer_created': return '👤';
      case 'job_updated': return '🔧';
      case 'payment_received': return '💰';
      case 'feedback_submitted': return '💬';
      default: return '📋';
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'customers':
        router.push('/admin/customers');
        break;
      case 'jobs':
        router.push('/admin/jobs');
        break;
      case 'reports':
        router.push('/admin/reports');
        break;
      case 'settings':
        router.push('/admin/settings');
        break;
      case 'create-customer':
        router.push('/admin/customers/new');
        break;
    }
  };

  if (loading) {
    return <LoadingCard message="Loading admin dashboard..." />;
  }

  if (error) {
    return (
      <div className="px-4 py-8">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
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
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Overview of all customers, jobs, and system activity
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleQuickAction('reports')}
          >
            📊 Export Report
          </Button>
          <Button 
            onClick={() => handleQuickAction('create-customer')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            + New Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.activeCustomers} active
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
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalJobs}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.activeJobs} active
              </p>
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
              <p className="text-xs text-gray-500 mt-1">Awaiting customer approval</p>
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
                {formatCurrency(stats.totalRevenue)}
              </div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20"
              onClick={() => handleQuickAction('customers')}
            >
              <span className="text-2xl">👥</span>
              <span>Manage Customers</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2 hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-900/20"
              onClick={() => handleQuickAction('jobs')}
            >
              <span className="text-2xl">🔧</span>
              <span>View All Jobs</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2 hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-900/20"
              onClick={() => handleQuickAction('reports')}
            >
              <span className="text-2xl">📊</span>
              <span>Generate Reports</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2 hover:bg-gray-50 hover:border-gray-200 dark:hover:bg-gray-800"
              onClick={() => handleQuickAction('settings')}
            >
              <span className="text-2xl">⚙️</span>
              <span>System Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {stats && stats.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {activity.description}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{new Date(activity.timestamp).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
                      {activity.customerName && (
                        <>
                          <span>•</span>
                          <span>{activity.customerName}</span>
                        </>
                      )}
                      {activity.jobNumber && (
                        <>
                          <span>•</span>
                          <Badge variant="secondary">Job #{activity.jobNumber}</Badge>
                        </>
                      )}
                    </div>
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
