import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function InvalidInvitationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900 mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Invalid Invitation
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            This invitation link is invalid, expired, or has already been used.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 space-y-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p className="font-medium mb-3">This could happen if:</p>
            <ul className="space-y-2 text-left">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                The invitation has expired
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                The invitation has already been used
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                The link was copied incorrectly
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                The invitation was cancelled
              </li>
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

          <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
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
