'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { z } from 'zod';

// Form validation schema
const preferencesFormSchema = z.object({
  email_notifications: z.boolean(),
  sms_notifications: z.boolean(),
  push_notifications: z.boolean(),
  email_frequency: z.enum(['immediate', 'daily', 'weekly']),
  notify_quotes: z.boolean(),
  notify_payments: z.boolean(),
  notify_job_updates: z.boolean(),
  notify_documents: z.boolean(),
  notify_invitations: z.boolean(),
  notify_security: z.boolean(),
  notify_marketing: z.boolean(),
  quiet_hours_start: z.string().optional(),
  quiet_hours_end: z.string().optional(),
  timezone: z.string(),
});

type PreferencesFormData = z.infer<typeof preferencesFormSchema>;

interface NotificationPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  email_frequency: 'immediate' | 'daily' | 'weekly';
  notify_quotes: boolean;
  notify_payments: boolean;
  notify_job_updates: boolean;
  notify_documents: boolean;
  notify_invitations: boolean;
  notify_security: boolean;
  notify_marketing: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone: string;
}

interface NotificationStats {
  totalEmails: number;
  deliveredEmails: number;
  openedEmails: number;
  clickedEmails: number;
  bouncedEmails: number;
  lastEmailSent: Date | null;
}

interface PreferencesFormProps {
  onSave?: (preferences: PreferencesFormData) => void;
  onCancel?: () => void;
}

export function NotificationPreferencesForm({ onSave, onCancel }: PreferencesFormProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load preferences on component mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/notifications/preferences');
      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
      setStats(data.stats);

    } catch (error) {
      console.error('Error loading preferences:', error);
      setError(error instanceof Error ? error.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Validate form data
      const validatedData = preferencesFormSchema.parse(preferences);

      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save preferences');
      }

      setSuccess('Notification preferences saved successfully');
      onSave?.(validatedData);

    } catch (error) {
      console.error('Error saving preferences:', error);
      setError(error instanceof Error ? error.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
      setSuccess('Notification preferences reset to defaults');

    } catch (error) {
      console.error('Error resetting preferences:', error);
      setError(error instanceof Error ? error.message : 'Failed to reset preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  const updatePreference = (key: keyof NotificationPreferences, value: unknown) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loading size="lg" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading preferences...</p>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 dark:text-red-400">Failed to load notification preferences</p>
        <Button onClick={loadPreferences} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Notification Preferences
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage how and when you receive notifications from SmartTech
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
          <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900 p-4">
          <div className="text-sm text-green-800 dark:text-green-200">{success}</div>
        </div>
      )}

      {/* Email Statistics */}
      {stats && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Email Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalEmails}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Emails</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.deliveredEmails}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Delivered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.openedEmails}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Opened</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.clickedEmails}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Clicked</div>
            </div>
          </div>
        </div>
      )}

      {/* Global Notification Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Global Notification Settings
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Notifications
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Receive notifications via email
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.email_notifications}
              onChange={(e) => updatePreference('email_notifications', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                SMS Notifications
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Receive notifications via SMS (coming soon)
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.sms_notifications}
              onChange={(e) => updatePreference('sms_notifications', e.target.checked)}
              disabled
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Push Notifications
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Receive browser push notifications
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.push_notifications}
              onChange={(e) => updatePreference('push_notifications', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* Email Frequency */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Email Frequency
        </h3>
        <div className="space-y-3">
          {[
            { value: 'immediate', label: 'Immediate', description: 'Send emails as soon as events occur' },
            { value: 'daily', label: 'Daily Digest', description: 'Receive a daily summary of all notifications' },
            { value: 'weekly', label: 'Weekly Summary', description: 'Receive a weekly summary of all notifications' },
          ].map((option) => (
            <div key={option.value} className="flex items-center">
              <input
                type="radio"
                id={`frequency-${option.value}`}
                name="email_frequency"
                value={option.value}
                checked={preferences.email_frequency === option.value}
                onChange={(e) => updatePreference('email_frequency', e.target.value as string)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor={`frequency-${option.value}`} className="ml-3">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {option.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Types */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Notification Types
        </h3>
        <div className="space-y-4">
          {[
            { key: 'notify_quotes', label: 'Quote Approvals', description: 'Notifications about quotes requiring approval' },
            { key: 'notify_payments', label: 'Payment Reminders', description: 'Reminders about overdue payments' },
            { key: 'notify_job_updates', label: 'Job Updates', description: 'Updates about job status and progress' },
            { key: 'notify_documents', label: 'Document Notifications', description: 'Alerts when new documents are available' },
            { key: 'notify_invitations', label: 'Invitations', description: 'Invitations to join the portal' },
            { key: 'notify_security', label: 'Security Alerts', description: 'Important security-related notifications' },
            { key: 'notify_marketing', label: 'Marketing Communications', description: 'Promotional emails and updates' },
          ].map((notification) => (
            <div key={notification.key} className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {notification.label}
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {notification.description}
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences[notification.key as keyof NotificationPreferences] as boolean}
                onChange={(e) => updatePreference(notification.key as keyof NotificationPreferences, e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Quiet Hours
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Set specific hours when you don&apos;t want to receive notifications
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Time
            </label>
            <input
              type="time"
              value={preferences.quiet_hours_start || ''}
              onChange={(e) => updatePreference('quiet_hours_start', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Time
            </label>
            <input
              type="time"
              value={preferences.quiet_hours_end || ''}
              onChange={(e) => updatePreference('quiet_hours_end', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Timezone */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Timezone
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Timezone
          </label>
          <select
            value={preferences.timezone}
            onChange={(e) => updatePreference('timezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Australia/Sydney">Sydney (AEST)</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-end">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          {saving ? <Loading size="sm" className="mr-2" /> : null}
          Reset to Defaults
        </Button>
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          {saving ? <Loading size="sm" className="mr-2" /> : null}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
