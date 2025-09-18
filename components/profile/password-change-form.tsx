'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { 
  type PasswordChangeRequest, 
  type PasswordFormState,
  type PasswordChangeFormProps 
} from '@/lib/types/profile';

export function PasswordChangeForm({ onChangePassword, loading }: PasswordChangeFormProps) {
  const [formData, setFormData] = useState<PasswordFormState>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleInputChange = (field: keyof PasswordFormState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.current_password) {
      newErrors.current_password = 'Current password is required';
    }

    if (!formData.new_password) {
      newErrors.new_password = 'New password is required';
    } else {
      if (formData.new_password.length < 8) {
        newErrors.new_password = 'Password must be at least 8 characters';
      } else if (!/[A-Z]/.test(formData.new_password)) {
        newErrors.new_password = 'Password must contain at least one uppercase letter';
      } else if (!/[a-z]/.test(formData.new_password)) {
        newErrors.new_password = 'Password must contain at least one lowercase letter';
      } else if (!/\d/.test(formData.new_password)) {
        newErrors.new_password = 'Password must contain at least one number';
      } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.new_password)) {
        newErrors.new_password = 'Password must contain at least one special character';
      }
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Password confirmation is required';
    } else if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    if (formData.current_password === formData.new_password) {
      newErrors.new_password = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const passwordData: PasswordChangeRequest = {
      current_password: formData.current_password,
      new_password: formData.new_password,
      confirm_password: formData.confirm_password,
    };

    await onChangePassword(passwordData);
    
    // Clear form after successful submission
    setFormData({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (password.length === 0) return { strength: '', color: '' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score <= 2) return { strength: 'Weak', color: 'text-red-600' };
    if (score <= 3) return { strength: 'Fair', color: 'text-yellow-600' };
    if (score <= 4) return { strength: 'Good', color: 'text-blue-600' };
    return { strength: 'Strong', color: 'text-green-600' };
  };

  const passwordStrength = getPasswordStrength(formData.new_password);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Change Password
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Update your password to keep your account secure.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current Password */}
        <div>
          <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Password *
          </label>
          <div className="mt-1 relative">
            <input
              id="current_password"
              type={showPasswords.current ? 'text' : 'password'}
              value={formData.current_password}
              onChange={(e) => handleInputChange('current_password', e.target.value)}
              className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm ${
                errors.current_password ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter your current password"
              disabled={loading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
            >
              <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showPasswords.current ? '🙈' : '👁️'}
              </span>
            </button>
          </div>
          {errors.current_password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.current_password}</p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            New Password *
          </label>
          <div className="mt-1 relative">
            <input
              id="new_password"
              type={showPasswords.new ? 'text' : 'password'}
              value={formData.new_password}
              onChange={(e) => handleInputChange('new_password', e.target.value)}
              className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm ${
                errors.new_password ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter your new password"
              disabled={loading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
            >
              <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showPasswords.new ? '🙈' : '👁️'}
              </span>
            </button>
          </div>
          {errors.new_password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.new_password}</p>
          )}
          
          {/* Password Strength Indicator */}
          {formData.new_password && (
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      passwordStrength.color === 'text-red-600' ? 'bg-red-500' :
                      passwordStrength.color === 'text-yellow-600' ? 'bg-yellow-500' :
                      passwordStrength.color === 'text-blue-600' ? 'bg-blue-500' :
                      'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min(100, (formData.new_password.length / 8) * 100)}%` 
                    }}
                  />
                </div>
                <span className={`text-sm font-medium ${passwordStrength.color}`}>
                  {passwordStrength.strength}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm New Password *
          </label>
          <div className="mt-1 relative">
            <input
              id="confirm_password"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={formData.confirm_password}
              onChange={(e) => handleInputChange('confirm_password', e.target.value)}
              className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm ${
                errors.confirm_password ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Confirm your new password"
              disabled={loading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
            >
              <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showPasswords.confirm ? '🙈' : '👁️'}
              </span>
            </button>
          </div>
          {errors.confirm_password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirm_password}</p>
          )}
        </div>

        {/* Password Requirements */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Password Requirements:
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li className={`flex items-center ${formData.new_password.length >= 8 ? 'text-green-600' : ''}`}>
              <span className="mr-2">{formData.new_password.length >= 8 ? '✅' : '❌'}</span>
              At least 8 characters
            </li>
            <li className={`flex items-center ${/[A-Z]/.test(formData.new_password) ? 'text-green-600' : ''}`}>
              <span className="mr-2">{/[A-Z]/.test(formData.new_password) ? '✅' : '❌'}</span>
              One uppercase letter
            </li>
            <li className={`flex items-center ${/[a-z]/.test(formData.new_password) ? 'text-green-600' : ''}`}>
              <span className="mr-2">{/[a-z]/.test(formData.new_password) ? '✅' : '❌'}</span>
              One lowercase letter
            </li>
            <li className={`flex items-center ${/\d/.test(formData.new_password) ? 'text-green-600' : ''}`}>
              <span className="mr-2">{/\d/.test(formData.new_password) ? '✅' : '❌'}</span>
              One number
            </li>
            <li className={`flex items-center ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.new_password) ? 'text-green-600' : ''}`}>
              <span className="mr-2">{/[!@#$%^&*(),.?":{}|<>]/.test(formData.new_password) ? '✅' : '❌'}</span>
              One special character
            </li>
          </ul>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || !formData.current_password || !formData.new_password || !formData.confirm_password}
            className="px-6 py-2"
          >
            {loading ? (
              <>
                <Loading size="sm" className="mr-2" />
                Changing Password...
              </>
            ) : (
              'Change Password'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
