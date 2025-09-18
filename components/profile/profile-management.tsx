'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ProfileForm } from './profile-form';
import { PasswordChangeForm } from './password-change-form';
import { NotificationPreferencesForm } from './notification-preferences';
import { 
  type ExtendedProfile, 
  type ProfileUpdateRequest, 
  type PasswordChangeRequest,
  type NotificationPreferences,
  type ProfileApiResponse 
} from '@/lib/types/profile';

interface ProfileManagementProps {
  initialProfile: ExtendedProfile;
}

type ActiveTab = 'profile' | 'password' | 'notifications';

export function ProfileManagement({ initialProfile }: ProfileManagementProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [profile, setProfile] = useState<ExtendedProfile>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleProfileUpdate = async (data: ProfileUpdateRequest): Promise<void> => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: ProfileApiResponse<ExtendedProfile> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update profile');
      }

      if (result.data) {
        setProfile(result.data);
      }
      setSuccess('Profile updated successfully');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (data: PasswordChangeRequest): Promise<void> => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: ProfileApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to change password');
      }

      setSuccess('Password changed successfully');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async (preferences: Partial<NotificationPreferences>): Promise<void> => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification_preferences: preferences,
        }),
      });

      const result: ProfileApiResponse<ExtendedProfile> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update notification preferences');
      }

      if (result.data) {
        setProfile(result.data);
      }
      setSuccess('Notification preferences updated successfully');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, name: 'Profile Information', icon: '👤' },
    { id: 'password' as const, name: 'Password & Security', icon: '🔒' },
    { id: 'notifications' as const, name: 'Notifications', icon: '🔔' },
  ];

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900 p-4">
          <div className="text-sm text-green-800 dark:text-green-200">{success}</div>
        </div>
      )}
      
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
          <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
        </div>
      )}

      {/* Tab Navigation */}
      <Card className="p-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </Card>

      {/* Tab Content */}
      <Card className="p-6">
        {activeTab === 'profile' && (
          <ProfileForm
            profile={profile}
            onUpdate={handleProfileUpdate}
            loading={loading}
          />
        )}

        {activeTab === 'password' && (
          <PasswordChangeForm
            onChangePassword={handlePasswordChange}
            loading={loading}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationPreferencesForm
            preferences={profile.notification_preferences!}
            onUpdate={handleNotificationUpdate}
            loading={loading}
          />
        )}
      </Card>
    </div>
  );
}
