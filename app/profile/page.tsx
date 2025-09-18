import { requireAuth } from '@/lib/auth/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { ProfileManagement } from '@/components/profile/profile-management';
import { type ExtendedProfile } from '@/lib/types/profile';

export default async function ProfilePage() {
  const user = await requireAuth();
  const supabase = await createServerSupabase();

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Profile Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Unable to load your profile. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // Get extended profile data
  const { data: extendedData } = await supabase
    .from('user_profile_extensions')
    .select('phone, address, company, avatar_url, timezone, language')
    .eq('user_id', user.id)
    .single();

  // Get notification preferences
  const { data: notificationData } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const extendedProfile: ExtendedProfile = {
    ...profile,
    phone: extendedData?.phone || null,
    address: extendedData?.address || null,
    company: extendedData?.company || null,
    avatar_url: extendedData?.avatar_url || null,
    timezone: extendedData?.timezone || 'UTC',
    language: extendedData?.language || 'en',
    notification_preferences: notificationData ? {
      email_notifications: notificationData.email_notifications ?? true,
      push_notifications: notificationData.push_notifications ?? false,
      sms_notifications: notificationData.sms_notifications ?? false,
      job_updates: notificationData.job_updates ?? true,
      payment_reminders: notificationData.payment_reminders ?? true,
      document_notifications: notificationData.document_notifications ?? true,
      quote_approvals: notificationData.quote_approvals ?? true,
      frequency: notificationData.frequency ?? 'immediate',
    } : {
      email_notifications: true,
      push_notifications: false,
      sms_notifications: false,
      job_updates: true,
      payment_reminders: true,
      document_notifications: true,
      quote_approvals: true,
      frequency: 'immediate',
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Profile Settings
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your account information and preferences
          </p>
        </div>

        <ProfileManagement initialProfile={extendedProfile} />
      </div>
    </div>
  );
}
