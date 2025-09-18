'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { 
  type NotificationPreferences,
  type NotificationPreferencesFormProps 
} from '@/lib/types/profile';

export function NotificationPreferencesForm({ 
  preferences, 
  onUpdate, 
  loading 
}: NotificationPreferencesFormProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(preferences);
  const [hasChanges, setHasChanges] = useState(false);

  const handleToggle = (field: keyof NotificationPreferences) => {
    const newValue = !formData[field];
    setFormData(prev => ({ ...prev, [field]: newValue }));
    setHasChanges(true);
  };

  const handleFrequencyChange = (frequency: 'immediate' | 'daily' | 'weekly') => {
    setFormData(prev => ({ ...prev, frequency }));
    setHasChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(formData);
    setHasChanges(false);
  };

  const handleReset = () => {
    setFormData(preferences);
    setHasChanges(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Notification Preferences
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Choose how and when you want to receive notifications.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Notification Channels */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Notification Channels
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
              <button
                type="button"
                onClick={() => handleToggle('email_notifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.email_notifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                disabled={loading}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.email_notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
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
              <button
                type="button"
                onClick={() => handleToggle('push_notifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.push_notifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                disabled={loading}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.push_notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  SMS Notifications
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Receive notifications via SMS (requires phone number)
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('sms_notifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.sms_notifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                disabled={loading}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.sms_notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Notification Types
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Job Updates
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Get notified when job status changes
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('job_updates')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.job_updates ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                disabled={loading}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.job_updates ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Payment Reminders
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Get reminded about pending payments
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('payment_reminders')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.payment_reminders ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                disabled={loading}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.payment_reminders ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Document Notifications
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Get notified about new documents
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('document_notifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.document_notifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                disabled={loading}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.document_notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quote Approvals
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Get notified when quotes need approval
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('quote_approvals')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.quote_approvals ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                disabled={loading}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.quote_approvals ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Notification Frequency */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Notification Frequency
          </h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="frequency"
                value="immediate"
                checked={formData.frequency === 'immediate'}
                onChange={() => handleFrequencyChange('immediate')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                disabled={loading}
              />
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Immediate
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Receive notifications as soon as they occur
                </div>
              </div>
            </label>

            <label className="flex items-center">
              <input
                type="radio"
                name="frequency"
                value="daily"
                checked={formData.frequency === 'daily'}
                onChange={() => handleFrequencyChange('daily')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                disabled={loading}
              />
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Daily Digest
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Receive a daily summary of notifications
                </div>
              </div>
            </label>

            <label className="flex items-center">
              <input
                type="radio"
                name="frequency"
                value="weekly"
                checked={formData.frequency === 'weekly'}
                onChange={() => handleFrequencyChange('weekly')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                disabled={loading}
              />
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Weekly Digest
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Receive a weekly summary of notifications
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          {hasChanges && (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={loading}
            >
              Reset
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading || !hasChanges}
            className="px-6 py-2"
          >
            {loading ? (
              <>
                <Loading size="sm" className="mr-2" />
                Updating...
              </>
            ) : (
              'Update Preferences'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
