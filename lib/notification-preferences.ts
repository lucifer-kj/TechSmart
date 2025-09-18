import { createClient as createServerSupabase } from './supabase/server';
import { z } from 'zod';

// Notification preference schemas
export const notificationPreferencesSchema = z.object({
  email_notifications: z.boolean().default(true),
  sms_notifications: z.boolean().default(false),
  push_notifications: z.boolean().default(true),
  email_frequency: z.enum(['immediate', 'daily', 'weekly']).default('immediate'),
  notify_quotes: z.boolean().default(true),
  notify_payments: z.boolean().default(true),
  notify_job_updates: z.boolean().default(true),
  notify_documents: z.boolean().default(true),
  notify_invitations: z.boolean().default(true),
  notify_security: z.boolean().default(true),
  notify_marketing: z.boolean().default(false),
  quiet_hours_start: z.string().optional(),
  quiet_hours_end: z.string().optional(),
  timezone: z.string().default('UTC'),
});

export const updateNotificationPreferencesSchema = notificationPreferencesSchema.partial();

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type UpdateNotificationPreferencesPayload = z.infer<typeof updateNotificationPreferencesSchema>;

// Email frequency types
export type EmailFrequency = 'immediate' | 'daily' | 'weekly';

// Notification types
export type NotificationType = 
  | 'quotes'
  | 'payments' 
  | 'job_updates'
  | 'documents'
  | 'invitations'
  | 'security'
  | 'marketing';

export interface NotificationPreferenceCheck {
  shouldSend: boolean;
  reason?: string;
  frequency?: EmailFrequency;
}

export class NotificationPreferencesService {
  private supabase!: Awaited<ReturnType<typeof createServerSupabase>>;

  constructor() {
    this.initializeSupabase();
  }

  private async initializeSupabase() {
    this.supabase = await createServerSupabase();
  }

  /**
   * Get user's notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data: user, error } = await this.supabase
        .from('user_profiles')
        .select('notification_preferences')
        .eq('id', userId)
        .single();

      if (error || !user) {
        console.error('Error fetching user preferences:', error);
        return null;
      }

      // Parse and validate preferences
      const preferences = user.notification_preferences as Record<string, unknown>;
      if (!preferences) {
        return this.getDefaultPreferences();
      }

      // Validate and merge with defaults
      const validatedPreferences = notificationPreferencesSchema.parse({
        ...this.getDefaultPreferences(),
        ...preferences,
      });

      return validatedPreferences;

    } catch (error) {
      console.error('Error parsing user preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Update user's notification preferences
   */
  async updateUserPreferences(
    userId: string, 
    updates: UpdateNotificationPreferencesPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate the updates
      const validatedUpdates = updateNotificationPreferencesSchema.parse(updates);

      // Get current preferences
      const currentPreferences = await this.getUserPreferences(userId);
      if (!currentPreferences) {
        return { success: false, error: 'User preferences not found' };
      }

      // Merge with current preferences
      const newPreferences = {
        ...currentPreferences,
        ...validatedUpdates,
      };

      // Update in database
      const { error } = await this.supabase
        .from('user_profiles')
        .update({
          notification_preferences: newPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user preferences:', error);
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      console.error('Error updating preferences:', error);
      if (error instanceof z.ZodError) {
        return { success: false, error: error.issues?.[0]?.message || 'Invalid input' };
      }
      return { success: false, error: 'Failed to update preferences' };
    }
  }

  /**
   * Check if user should receive a specific type of notification
   */
  async shouldSendNotification(
    userId: string,
    notificationType: NotificationType,
    _emailType?: string
  ): Promise<NotificationPreferenceCheck> {
    void _emailType;
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences) {
        return { shouldSend: true, reason: 'No preferences found, defaulting to send' };
      }

      // Check global email notifications
      if (!preferences.email_notifications) {
        return { 
          shouldSend: false, 
          reason: 'Email notifications disabled globally' 
        };
      }

      // Check specific notification type
      const typePreference = this.getTypePreference(preferences, notificationType);
      if (!typePreference) {
        return { 
          shouldSend: false, 
          reason: `${notificationType} notifications disabled` 
        };
      }

      // Check quiet hours
      if (this.isInQuietHours(preferences)) {
        return { 
          shouldSend: false, 
          reason: 'Currently in quiet hours' 
        };
      }

      return { 
        shouldSend: true, 
        frequency: preferences.email_frequency 
      };

    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return { shouldSend: true, reason: 'Error checking preferences, defaulting to send' };
    }
  }

  /**
   * Get default notification preferences
   */
  getDefaultPreferences(): NotificationPreferences {
    return {
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true,
      email_frequency: 'immediate',
      notify_quotes: true,
      notify_payments: true,
      notify_job_updates: true,
      notify_documents: true,
      notify_invitations: true,
      notify_security: true,
      notify_marketing: false,
      timezone: 'UTC',
    };
  }

  /**
   * Get preference for specific notification type
   */
  private getTypePreference(preferences: NotificationPreferences, type: NotificationType): boolean {
    switch (type) {
      case 'quotes':
        return preferences.notify_quotes;
      case 'payments':
        return preferences.notify_payments;
      case 'job_updates':
        return preferences.notify_job_updates;
      case 'documents':
        return preferences.notify_documents;
      case 'invitations':
        return preferences.notify_invitations;
      case 'security':
        return preferences.notify_security;
      case 'marketing':
        return preferences.notify_marketing;
      default:
        return true;
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quiet_hours_start || !preferences.quiet_hours_end) {
      return false;
    }

    try {
      const now = new Date();
      const userTimezone = preferences.timezone || 'UTC';
      
      // Convert current time to user's timezone
      const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
      const currentHour = userTime.getHours();
      const currentMinute = userTime.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      // Parse quiet hours
      const [startHour, startMinute] = preferences.quiet_hours_start.split(':').map(Number);
      const [endHour, endMinute] = preferences.quiet_hours_end.split(':').map(Number);
      
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      // Handle overnight quiet hours
      if (startTime > endTime) {
        return currentTime >= startTime || currentTime <= endTime;
      } else {
        return currentTime >= startTime && currentTime <= endTime;
      }

    } catch (error) {
      console.error('Error checking quiet hours:', error);
      return false;
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getUserNotificationStats(userId: string): Promise<{
    totalEmails: number;
    deliveredEmails: number;
    openedEmails: number;
    clickedEmails: number;
    bouncedEmails: number;
    lastEmailSent: Date | null;
  }> {
    try {
      // Get user's email
      const { data: user, error: userError } = await this.supabase
        .from('user_profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return {
          totalEmails: 0,
          deliveredEmails: 0,
          openedEmails: 0,
          clickedEmails: 0,
          bouncedEmails: 0,
          lastEmailSent: null,
        };
      }

      // Get email statistics
      const { data: emails, error: emailsError } = await this.supabase
        .from('emails')
        .select('status, sent_at')
        .eq('to', user.email)
        .order('sent_at', { ascending: false });

      if (emailsError || !emails) {
        return {
          totalEmails: 0,
          deliveredEmails: 0,
          openedEmails: 0,
          clickedEmails: 0,
          bouncedEmails: 0,
          lastEmailSent: null,
        };
      }

      const totalEmails = emails.length;
      const deliveredEmails = emails.filter(e => e.status === 'delivered').length;
      const openedEmails = emails.filter(e => e.status === 'opened').length;
      const clickedEmails = emails.filter(e => e.status === 'clicked').length;
      const bouncedEmails = emails.filter(e => e.status === 'bounced').length;
      const lastEmailSent = emails.length > 0 ? new Date(emails[0].sent_at) : null;

      return {
        totalEmails,
        deliveredEmails,
        openedEmails,
        clickedEmails,
        bouncedEmails,
        lastEmailSent,
      };

    } catch (error) {
      console.error('Error getting notification stats:', error);
      return {
        totalEmails: 0,
        deliveredEmails: 0,
        openedEmails: 0,
        clickedEmails: 0,
        bouncedEmails: 0,
        lastEmailSent: null,
      };
    }
  }

  /**
   * Bulk update preferences for multiple users
   */
  async bulkUpdatePreferences(
    userIds: string[],
    updates: UpdateNotificationPreferencesPayload
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const result = await this.updateUserPreferences(userId, updates);
        if (result.success) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error updating preferences for user ${userId}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Reset user preferences to defaults
   */
  async resetToDefaults(userId: string): Promise<{ success: boolean; error?: string }> {
    return await this.updateUserPreferences(userId, this.getDefaultPreferences());
  }

  /**
   * Get all users with specific preference settings
   */
  async getUsersWithPreference(
    preference: keyof NotificationPreferences,
    value: unknown
  ): Promise<string[]> {
    try {
      const { data: users, error } = await this.supabase
        .from('user_profiles')
        .select('id, notification_preferences')
        .not('notification_preferences', 'is', null);

      if (error || !users) {
        return [];
      }

      const userIds: string[] = [];
      for (const user of users) {
        const preferences = user.notification_preferences as Record<string, unknown>;
        if (preferences && preferences[preference] === value) {
          userIds.push(user.id);
        }
      }

      return userIds;

    } catch (error) {
      console.error('Error getting users with preference:', error);
      return [];
    }
  }
}

// Create singleton instance
let notificationPreferencesInstance: NotificationPreferencesService | null = null;

export async function getNotificationPreferencesService(): Promise<NotificationPreferencesService> {
  if (!notificationPreferencesInstance) {
    notificationPreferencesInstance = new NotificationPreferencesService();
  }
  return notificationPreferencesInstance;
}
