'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { Card } from '@/components/ui/card';

interface Invitation {
  id: string;
  email: string;
  customer_id: string;
  invited_by: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  updated_at: string;
}

interface InvitationStats {
  total: number;
  pending: number;
  used: number;
  expired: number;
}

interface InvitationManagementProps {
  customerId?: string;
}

export function InvitationManagement({ customerId }: InvitationManagementProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newInvitation, setNewInvitation] = useState({
    email: '',
    expiresInDays: 7,
  });

  const fetchInvitations = useCallback(async () => {
    try {
      const url = customerId 
        ? `/api/admin/invitations?customerId=${customerId}`
        : '/api/admin/invitations';
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch invitations');
      }

      setInvitations(data.invitations);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch invitations');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchInvitations();
    if (!customerId) {
      fetchStats();
    }
  }, [customerId, fetchInvitations]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/invitations/stats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch stats');
      }

      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create');

    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newInvitation.email,
          customerId: customerId || 'default', // This should be passed from parent
          expiresInDays: newInvitation.expiresInDays,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create invitation');
      }

      setNewInvitation({ email: '', expiresInDays: 7 });
      setShowCreateForm(false);
      await fetchInvitations();
      if (!customerId) {
        await fetchStats();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create invitation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setActionLoading(invitationId);

    try {
      const response = await fetch(`/api/admin/invitations/${invitationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'resend' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend invitation');
      }

      await fetchInvitations();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to resend invitation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }

    setActionLoading(invitationId);

    try {
      const response = await fetch(`/api/admin/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel invitation');
      }

      await fetchInvitations();
      if (!customerId) {
        await fetchStats();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to cancel invitation');
    } finally {
      setActionLoading(null);
    }
  };

  const getInvitationStatus = (invitation: Invitation) => {
    if (invitation.used_at) {
      return { status: 'used', color: 'text-green-600 bg-green-100' };
    }
    
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();
    
    if (expiresAt < now) {
      return { status: 'expired', color: 'text-red-600 bg-red-100' };
    }
    
    return { status: 'pending', color: 'text-yellow-600 bg-yellow-100' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
          <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.total}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Invitations</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Pending</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {stats.used}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Used</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {stats.expired}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Expired</div>
          </Card>
        </div>
      )}

      {/* Create Invitation Form */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Create New Invitation
          </h3>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            variant="outline"
          >
            {showCreateForm ? 'Cancel' : 'New Invitation'}
          </Button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateInvitation} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={newInvitation.email}
                onChange={(e) => setNewInvitation({ ...newInvitation, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
                placeholder="customer@example.com"
                disabled={actionLoading === 'create'}
              />
            </div>
            
            <div>
              <label htmlFor="expiresInDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Expires In (Days)
              </label>
              <select
                id="expiresInDays"
                value={newInvitation.expiresInDays}
                onChange={(e) => setNewInvitation({ ...newInvitation, expiresInDays: parseInt(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
                disabled={actionLoading === 'create'}
              >
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={actionLoading === 'create' || !newInvitation.email}
              className="w-full"
            >
              {actionLoading === 'create' ? (
                <>
                  <Loading size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                'Create Invitation'
              )}
            </Button>
          </form>
        )}
      </Card>

      {/* Invitations List */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Invitations
        </h3>
        
        {invitations.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No invitations found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {invitations.map((invitation) => {
                  const status = getInvitationStatus(invitation);
                  return (
                    <tr key={invitation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {invitation.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                          {status.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(invitation.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(invitation.expires_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {status.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendInvitation(invitation.id)}
                              disabled={actionLoading === invitation.id}
                            >
                              {actionLoading === invitation.id ? (
                                <Loading size="sm" />
                              ) : (
                                'Resend'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelInvitation(invitation.id)}
                              disabled={actionLoading === invitation.id}
                              className="text-red-600 hover:text-red-700"
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
