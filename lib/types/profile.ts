import { z } from 'zod';

// Base user profile type from database
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'customer';
  customer_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Extended profile with additional fields
export interface ExtendedProfile extends UserProfile {
  phone?: string | null;
  address?: string | null;
  company?: string | null;
  avatar_url?: string | null;
  timezone?: string | null;
  language?: string | null;
  notification_preferences?: NotificationPreferences;
}

// Notification preferences
export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  job_updates: boolean;
  payment_reminders: boolean;
  document_notifications: boolean;
  quote_approvals: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

// Profile update request
export interface ProfileUpdateRequest {
  full_name?: string;
  phone?: string;
  address?: string;
  company?: string;
  timezone?: string;
  language?: string;
  notification_preferences?: Partial<NotificationPreferences>;
}

// Password change request
export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// Profile update response
export interface ProfileUpdateResponse {
  success: boolean;
  message: string;
  profile?: ExtendedProfile;
  errors?: Record<string, string[]>;
}

// Password change response
export interface PasswordChangeResponse {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

// Avatar upload response
export interface AvatarUploadResponse {
  success: boolean;
  message: string;
  avatar_url?: string;
  errors?: Record<string, string[]>;
}

// Zod schemas for validation
export const notificationPreferencesSchema = z.object({
  email_notifications: z.boolean().default(true),
  push_notifications: z.boolean().default(false),
  sms_notifications: z.boolean().default(false),
  job_updates: z.boolean().default(true),
  payment_reminders: z.boolean().default(true),
  document_notifications: z.boolean().default(true),
  quote_approvals: z.boolean().default(true),
  frequency: z.enum(['immediate', 'daily', 'weekly']).default('immediate'),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name is too long').optional(),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  address: z.string().max(500, 'Address is too long').optional().or(z.literal('')),
  company: z.string().max(100, 'Company name is too long').optional().or(z.literal('')),
  timezone: z.string().optional(),
  language: z.string().optional(),
  notification_preferences: notificationPreferencesSchema.optional(),
});

export const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  confirm_password: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

// Profile form state
export interface ProfileFormState {
  full_name: string;
  phone: string;
  address: string;
  company: string;
  timezone: string;
  language: string;
  notification_preferences: NotificationPreferences;
}

// Password form state
export interface PasswordFormState {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// Profile page props
export interface ProfilePageProps {
  initialProfile: ExtendedProfile;
}

// Profile form props
export interface ProfileFormProps {
  profile: ExtendedProfile;
  onUpdate: (data: ProfileUpdateRequest) => Promise<void>;
  loading?: boolean;
}

// Password change form props
export interface PasswordChangeFormProps {
  onChangePassword: (data: PasswordChangeRequest) => Promise<void>;
  loading?: boolean;
}

// Notification preferences form props
export interface NotificationPreferencesFormProps {
  preferences: NotificationPreferences;
  onUpdate: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  loading?: boolean;
}

// Error types
export interface ProfileError {
  field: string;
  message: string;
}

export interface ProfileErrors {
  [key: string]: string[];
}

// API response types
export interface ProfileApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ProfileErrors;
}

// Form validation result
export interface ValidationResult {
  success: boolean;
  errors: ProfileErrors;
  data?: unknown;
}
