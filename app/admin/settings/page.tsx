"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/loading";

type SettingsData = {
  servicem8: {
    connected: boolean;
    apiKey: string;
    customerUuid?: string;
    lastSync?: string;
    status: 'active' | 'error' | 'disconnected';
    error?: string;
  };
  supabase: {
    connected: boolean;
    url: string;
    status: 'active' | 'error';
    tables: string[];
  };
  system: {
    version: string;
    environment: string;
    uptime: string;
    lastRestart?: string;
  };
  notifications: {
    emailEnabled: boolean;
    webhooksEnabled: boolean;
    slackIntegration?: boolean;
  };
  security: {
    rlsEnabled: boolean;
    adminUsers: number;
    lastPasswordChange?: string;
    twoFactorEnabled: boolean;
  };
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/settings', { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load settings");
      const data = await response.json();
      setSettings(data);
    } catch (e: unknown) {
      setError((e as Error).message || "Error loading settings");
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (service: 'servicem8' | 'supabase') => {
    setTestingConnection(service);
    try {
      const response = await fetch(`/api/admin/settings/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service })
      });
      
      if (!response.ok) throw new Error(`Failed to test ${service} connection`);
      
      const result = await response.json();
      alert(`${service.toUpperCase()} Connection Test: ${result.success ? 'SUCCESS' : 'FAILED'}\n${result.message}`);
      
      // Reload settings to get updated status
      await loadSettings();
    } catch (error) {
      console.error(`${service} connection test error:`, error);
      alert(`${service.toUpperCase()} connection test failed`);
    } finally {
      setTestingConnection(null);
    }
  };

  const handleSyncServiceM8 = async () => {
    setSaving('servicem8-sync');
    try {
      const response = await fetch('/api/admin/settings/sync-servicem8', {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to sync ServiceM8');
      
      const result = await response.json();
      alert(`ServiceM8 Sync Complete!\nCustomers synced: ${result.customersSync || 0}\nJobs synced: ${result.jobsSync || 0}`);
      
      await loadSettings();
    } catch (error) {
      console.error('ServiceM8 sync error:', error);
      alert('ServiceM8 sync failed');
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateSetting = async (category: string, key: string, value: boolean) => {
    setSaving(`${category}-${key}`);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, key, value })
      });
      
      if (!response.ok) throw new Error('Failed to update setting');
      
      await loadSettings();
    } catch (error) {
      console.error('Settings update error:', error);
      alert('Failed to update setting');
    } finally {
      setSaving(null);
    }
  };

  const handleClearCache = async () => {
    setSaving('cache');
    try {
      const response = await fetch('/api/admin/settings/clear-cache', {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to clear cache');
      
      alert('Cache cleared successfully');
    } catch (error) {
      console.error('Clear cache error:', error);
      alert('Failed to clear cache');
    } finally {
      setSaving(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Active</Badge>;
      case 'error':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">Error</Badge>;
      case 'disconnected':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">Disconnected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <LoadingCard message="Loading settings..." />;
  }

  if (error || !settings) {
    return (
      <div className="px-4 py-8">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 font-medium">
                {error || "Failed to load settings"}
              </p>
              <Button 
                className="mt-4" 
                onClick={loadSettings}
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
            System Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure integrations and system preferences
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCache}
            disabled={saving === 'cache'}
          >
            {saving === 'cache' ? '🔄 Clearing...' : '🗑️ Clear Cache'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSettings}
          >
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* ServiceM8 Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <span>ServiceM8 Integration</span>
              {getStatusBadge(settings.servicem8.status)}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestConnection('servicem8')}
                disabled={testingConnection === 'servicem8'}
              >
                {testingConnection === 'servicem8' ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncServiceM8}
                disabled={saving === 'servicem8-sync' || settings.servicem8.status !== 'active'}
              >
                {saving === 'servicem8-sync' ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Key
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {settings.servicem8.apiKey ? 
                  `${settings.servicem8.apiKey.substring(0, 8)}...` : 
                  'Not configured'
                }
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer UUID
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {settings.servicem8.customerUuid || 'Auto-detected'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Sync
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {formatDate(settings.servicem8.lastSync)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Connection Status
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {settings.servicem8.connected ? 'Connected' : 'Disconnected'}
                {settings.servicem8.error && (
                  <div className="text-red-600 dark:text-red-400 mt-1">
                    Error: {settings.servicem8.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supabase Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <span>Supabase Configuration</span>
              {getStatusBadge(settings.supabase.status)}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestConnection('supabase')}
              disabled={testingConnection === 'supabase'}
            >
              {testingConnection === 'supabase' ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Database URL
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {settings.supabase.url}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tables Available
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {settings.supabase.tables.length} tables configured
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Database Tables
            </label>
            <div className="flex flex-wrap gap-2">
              {settings.supabase.tables.map((table) => (
                <Badge key={table} variant="outline" className="text-xs">
                  {table}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Version
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {settings.system.version}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Environment
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {settings.system.environment}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Uptime
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {settings.system.uptime}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Restart
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {formatDate(settings.system.lastRestart)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Notifications
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Send email notifications for important events
                </p>
              </div>
              <Button
                variant={settings.notifications.emailEnabled ? "secondary" : "outline"}
                size="sm"
                onClick={() => handleUpdateSetting('notifications', 'emailEnabled', !settings.notifications.emailEnabled)}
                disabled={saving === 'notifications-emailEnabled'}
              >
                {settings.notifications.emailEnabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Webhook Notifications
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enable webhook endpoints for real-time updates
                </p>
              </div>
              <Button
                variant={settings.notifications.webhooksEnabled ? "secondary" : "outline"}
                size="sm"
                onClick={() => handleUpdateSetting('notifications', 'webhooksEnabled', !settings.notifications.webhooksEnabled)}
                disabled={saving === 'notifications-webhooksEnabled'}
              >
                {settings.notifications.webhooksEnabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Row Level Security (RLS)
              </label>
              <div className="flex items-center space-x-2">
                {getStatusBadge(settings.security.rlsEnabled ? 'active' : 'error')}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {settings.security.rlsEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Admin Users
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {settings.security.adminUsers} admin accounts
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Two-Factor Authentication
              </label>
              <div className="flex items-center space-x-2">
                {getStatusBadge(settings.security.twoFactorEnabled ? 'active' : 'disconnected')}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {settings.security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Password Change
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {formatDate(settings.security.lastPasswordChange)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
