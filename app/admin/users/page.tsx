"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/loading";

type AdminUser = {
  id: string;
  email: string;
  role: 'admin' | 'customer';
  is_active: boolean;
  created_at: string;
  last_login?: string;
  customer_id?: string;
  customer_name?: string;
  servicem8_customer_uuid?: string;
  job_count?: number;
  last_activity?: string;
};

type ServiceM8Client = {
  uuid: string;
  name: string;
  email: string;
  mobile: string;
  address: string;
  active: number;
  date_created: string;
  date_last_modified: string;
};

type UserFilters = {
  role: string;
  status: string;
  search: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [serviceM8Clients, setServiceM8Clients] = useState<ServiceM8Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState<string | null>(null);
  const [showServiceM8Clients, setShowServiceM8Clients] = useState(false);
  const [filters, setFilters] = useState<UserFilters>({
    role: '',
    status: '',
    search: ''
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load users");
      const data = await response.json();
      setUsers(data.users || []);
    } catch (e: unknown) {
      setError((e as Error).message || "Error loading users");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadServiceM8Clients = useCallback(async () => {
    try {
      const response = await fetch('/api/servicem8/customers', { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load ServiceM8 clients");
      const data = await response.json();
      setServiceM8Clients(data.clients || []);
    } catch (e: unknown) {
      console.error('Failed to load ServiceM8 clients:', e);
      setServiceM8Clients([]);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (showServiceM8Clients) {
      loadServiceM8Clients();
    }
  }, [showServiceM8Clients, loadServiceM8Clients]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">Admin</Badge>;
      case 'customer':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">Customer</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 
      <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Active</Badge> :
      <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">Inactive</Badge>;
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (!response.ok) throw new Error('Failed to update user status');
      
      // Reload users
      await loadUsers();
    } catch (error) {
      console.error('User status update error:', error);
      alert('Failed to update user status');
    }
  };

  const handleCreateUserFromServiceM8 = async (client: ServiceM8Client) => {
    setCreatingUser(client.uuid);
    
    try {
      // If client doesn't have email, prompt for one
      let email = client.email;
      if (!email) {
        const promptedEmail = prompt(`"${client.name}" doesn't have an email address.\n\nPlease enter an email address for this ServiceM8 client:`);
        
        if (!promptedEmail || !promptedEmail.includes('@')) {
          alert('Valid email address is required to create portal access');
          setCreatingUser(null);
          return;
        }
        
        email = promptedEmail;
      }

      const response = await fetch('/api/admin/users/create-from-servicem8', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicem8_customer_uuid: client.uuid,
          email: email,
          generateCredentials: true,
          sendWelcomeEmail: false
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          alert(`Customer "${client.name}" already has portal access`);
        } else {
          throw new Error(data.error || 'Failed to create user account');
        }
        return;
      }

      alert(`User account created successfully for ${client.name}!\n\nLogin credentials:\nEmail: ${data.login_instructions.email}\nPassword: ${data.login_instructions.password}\n\nPlease share these credentials securely with the customer.`);
      
      // Reload users to show the new user
      await loadUsers();
      // Reload ServiceM8 clients to update the list
      await loadServiceM8Clients();
    } catch (error) {
      console.error('Create user error:', error);
      alert(`Failed to create user account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreatingUser(null);
    }
  };

  const handleViewUserData = (customerId: string) => {
    // Navigate to customer details page
    window.location.href = `/admin/customers/${customerId}`;
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = !filters.role || user.role === filters.role;
    const matchesStatus = !filters.status || 
      (filters.status === 'active' && user.is_active) ||
      (filters.status === 'inactive' && !user.is_active);
    const matchesSearch = !filters.search || 
      user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.customer_name?.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesRole && matchesStatus && matchesSearch;
  });

  // Filter ServiceM8 clients that don't already have portal access
  const clientsWithoutAccess = serviceM8Clients.filter(client => {
    return !users.some(user => user.servicem8_customer_uuid === client.uuid);
  });

  if (loading) {
    return <LoadingCard message="Loading users..." />;
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
                onClick={() => loadUsers()}
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
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage admin and customer user accounts
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowServiceM8Clients(!showServiceM8Clients)}
          >
            {showServiceM8Clients ? '📋 Hide ServiceM8 Clients' : '👥 ServiceM8 Clients'}
          </Button>
          <Button variant="outline" size="sm">
            📊 User Report
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadUsers()}>
            🔄 Refresh Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {users.filter(u => u.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Admin Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Customer Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {users.filter(u => u.role === 'customer').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ServiceM8 Clients Without Portal Access */}
      {showServiceM8Clients && (
        <Card>
          <CardHeader>
            <CardTitle>ServiceM8 Clients Without Portal Access ({clientsWithoutAccess.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {clientsWithoutAccess.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">All ServiceM8 clients have portal access</p>
              </div>
            ) : (
              <div className="space-y-4">
                {clientsWithoutAccess.map((client) => (
                  <div key={client.uuid} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{client.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Email: {client.email ? client.email : '⚠️ No email (will prompt when creating access)'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Phone: {client.mobile || 'No phone'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        ServiceM8 ID: {client.uuid}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleCreateUserFromServiceM8(client)}
                        disabled={creatingUser === client.uuid}
                      >
                        {creatingUser === client.uuid ? 'Creating...' : 
                         !client.email ? 'Create Access (Add Email)' : 'Create Portal Access'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="customer">Customer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search by email or customer name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFilters({ role: '', status: '', search: '' })}
            >
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No users found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{user.email}</div>
                      {getRoleBadge(user.role)}
                      {getStatusBadge(user.is_active)}
                    </div>
                    {user.customer_name && (
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Customer: {user.customer_name}
                        </p>
                        {user.servicem8_customer_uuid && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            ServiceM8 ID: {user.servicem8_customer_uuid}
                          </p>
                        )}
                        {user.job_count !== undefined && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Jobs: {user.job_count}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Created: {formatDate(user.created_at)}</span>
                      {user.last_login && <span>Last Login: {formatDate(user.last_login)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={user.is_active ? "destructive" : "primary"}
                      size="sm"
                      onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button variant="outline" size="sm">
                      🔑 Reset Password
                    </Button>
                    {user.customer_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewUserData(user.customer_id!)}
                      >
                        📊 View Data
                      </Button>
                    )}
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
