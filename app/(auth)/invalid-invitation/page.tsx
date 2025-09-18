import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function InvalidInvitationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
            <svg
              className="h-6 w-6 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Invalid Invitation
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            This invitation link is invalid, expired, or has already been used.
          </p>
        </div>

        <div className="space-y-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>This could happen if:</p>
            <ul className="mt-2 space-y-1 text-left">
              <li>• The invitation has expired</li>
              <li>• The invitation has already been used</li>
              <li>• The link was copied incorrectly</li>
              <li>• The invitation was cancelled</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Link href="/login">
              <Button className="w-full">
                Go to Login
              </Button>
            </Link>
            
            <Link href="/forgot-password">
              <Button variant="outline" className="w-full">
                Forgot Password?
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Need help? Contact support at{' '}
              <a 
                href="mailto:support@smarttech.com" 
                className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                support@smarttech.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
