'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface UnsubscribePageProps {
  token: string;
  email?: string;
}

export function UnsubscribePage({ token, email }: UnsubscribePageProps) {
  const [loading, setLoading] = useState(true);
  const [, setVerifying] = useState(false);
  const [unsubscribing, setUnsubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [, setValidToken] = useState(false);

  const verifyToken = useCallback(async () => {
    try {
      setLoading(true);
      setVerifying(true);
      setError(null);

      const response = await fetch(`/api/notifications/unsubscribe?token=${token}&email=${email || ''}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid unsubscribe token');
      }

      setValidToken(true);
      setUserEmail(data.email);

    } catch (error) {
      console.error('Error verifying token:', error);
      setError(error instanceof Error ? error.message : 'Failed to verify unsubscribe token');
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  }, [email, token]);

  useEffect(() => {
    verifyToken();
  }, [token, verifyToken]);

  const handleUnsubscribe = async () => {
    try {
      setUnsubscribing(true);
      setError(null);

      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unsubscribe');
      }

      setSuccess(data.message || 'Successfully unsubscribed from email notifications');

    } catch (error) {
      console.error('Error unsubscribing:', error);
      setError(error instanceof Error ? error.message : 'Failed to unsubscribe');
    } finally {
      setUnsubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <Loading size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Verifying unsubscribe request...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Unsubscribe Failed
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Button onClick={verifyToken} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-green-600 dark:text-green-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Successfully Unsubscribed
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{success}</p>
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You will no longer receive email notifications from SmartTech.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              If you change your mind, you can re-enable notifications by logging into your account and updating your preferences.
            </p>
          </div>
          <div className="mt-6">
            <Button 
              onClick={() => window.location.href = '/login'}
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-blue-600 dark:text-blue-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Unsubscribe from Email Notifications
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to stop receiving email notifications from SmartTech?
          </p>
        </div>

        {userEmail && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Email:</strong> {userEmail}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2">By unsubscribing, you will no longer receive:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Job status updates</li>
              <li>Payment reminders</li>
              <li>Quote approval requests</li>
              <li>Document notifications</li>
              <li>Security alerts</li>
            </ul>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> You can re-enable email notifications at any time by logging into your account and updating your notification preferences.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Button
            onClick={handleUnsubscribe}
            disabled={unsubscribing}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            {unsubscribing ? (
              <>
                <Loading size="sm" className="mr-2" />
                Unsubscribing...
              </>
            ) : (
              'Yes, Unsubscribe Me'
            )}
          </Button>
          
          <Button
            onClick={() => window.location.href = '/login'}
            variant="outline"
            className="w-full"
          >
            Cancel and Go to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
