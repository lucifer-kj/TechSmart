"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { CustomerListTable } from "@/components/admin/customer-list-table";
import { CustomerFilters } from "@/components/admin/customer-filters";

type Customer = {
  id: string;
  servicem8_customer_uuid: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
  job_count: number;
  last_login?: string;
  status: 'active' | 'inactive' | 'banned';
};

type CustomerFilters = {
  search: string;
  status: 'all' | 'active' | 'inactive' | 'banned';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    status: 'all',
    dateRange: 'all'
  });
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.dateRange !== 'all') params.append('dateRange', filters.dateRange);

      const response = await fetch(`/api/admin/customers?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load customers");
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (e: unknown) {
      setError((e as Error).message || "Error loading customers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = () => {
    // Navigate to customer creation page
    window.location.href = '/admin/customers/new';
  };

  const handleBulkAction = async (action: 'ban' | 'activate' | 'export') => {
    if (selectedCustomers.length === 0) {
      alert('Please select customers first');
      return;
    }

    try {
      const response = await fetch('/api/admin/customers/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          customerIds: selectedCustomers
        })
      });

      if (!response.ok) throw new Error(`Failed to ${action} customers`);
      
      // Reload customers
      await loadCustomers();
      setSelectedCustomers([]);
    } catch (error) {
      console.error('Bulk action error:', error);
      alert(`Failed to ${action} customers`);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !filters.search || 
      customer.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      customer.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
      customer.phone?.includes(filters.search);
    
    const matchesStatus = filters.status === 'all' || customer.status === filters.status;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <LoadingCard message="Loading customers..." />;
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
                onClick={() => loadCustomers()}
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
            Customer Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage customer accounts and portal access
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button variant="outline" size="sm">
            📊 Export All
          </Button>
          <Button onClick={handleCreateCustomer}>
            + New Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {customers.filter(c => c.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Inactive Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {customers.filter(c => c.status === 'inactive').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Banned Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {customers.filter(c => c.status === 'banned').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <CustomerFilters 
        filters={filters}
        onFiltersChange={setFilters}
        selectedCount={selectedCustomers.length}
        onBulkAction={handleBulkAction}
      />

      {/* Customer Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerListTable
            customers={filteredCustomers}
            selectedCustomers={selectedCustomers}
            onSelectionChange={setSelectedCustomers}
            onCustomerUpdate={loadCustomers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
