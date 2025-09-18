'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { 
  type ProfileUpdateRequest, 
  type ProfileFormState,
  type ProfileFormProps 
} from '@/lib/types/profile';

export function ProfileForm({ profile, onUpdate, loading }: ProfileFormProps) {
  const [formData, setFormData] = useState<ProfileFormState>({
    full_name: profile.full_name || '',
    phone: profile.phone || '',
    address: profile.address || '',
    company: profile.company || '',
    timezone: profile.timezone || 'UTC',
    language: profile.language || 'en',
    notification_preferences: profile.notification_preferences || {
      email_notifications: true,
      push_notifications: false,
      sms_notifications: false,
      job_updates: true,
      payment_reminders: true,
      document_notifications: true,
      quote_approvals: true,
      frequency: 'immediate',
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Check if form has changes
    const hasFormChanges = 
      formData.full_name !== (profile.full_name || '') ||
      formData.phone !== (profile.phone || '') ||
      formData.address !== (profile.address || '') ||
      formData.company !== (profile.company || '') ||
      formData.timezone !== (profile.timezone || 'UTC') ||
      formData.language !== (profile.language || 'en');
    
    setHasChanges(hasFormChanges);
  }, [formData, profile]);

  const handleInputChange = (field: keyof ProfileFormState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (formData.address && formData.address.length > 500) {
      newErrors.address = 'Address is too long (max 500 characters)';
    }

    if (formData.company && formData.company.length > 100) {
      newErrors.company = 'Company name is too long (max 100 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const updateData: ProfileUpdateRequest = {
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim() || undefined,
      address: formData.address.trim() || undefined,
      company: formData.company.trim() || undefined,
      timezone: formData.timezone,
      language: formData.language,
    };

    await onUpdate(updateData);
  };

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Profile Information
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Update your personal information and contact details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Full Name *
            </label>
            <input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm ${
                errors.full_name ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter your full name"
              disabled={loading}
            />
            {errors.full_name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.full_name}</p>
            )}
          </div>

          {/* Email (Read-only) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={profile.email}
              disabled
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm ${
                errors.phone ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="+1 (555) 123-4567"
              disabled={loading}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
            )}
          </div>

          {/* Company */}
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Company
            </label>
            <input
              id="company"
              type="text"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm ${
                errors.company ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Your company name"
              disabled={loading}
            />
            {errors.company && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.company}</p>
            )}
          </div>

          {/* Timezone */}
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Timezone
            </label>
            <select
              id="timezone"
              value={formData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
              disabled={loading}
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Language
            </label>
            <select
              id="language"
              value={formData.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
              disabled={loading}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Address
          </label>
          <textarea
            id="address"
            rows={3}
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm ${
              errors.address ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter your address"
            disabled={loading}
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.address}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
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
              'Update Profile'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
