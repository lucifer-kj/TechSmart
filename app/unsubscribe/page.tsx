import { Suspense } from 'react';
import { UnsubscribePage } from '@/components/notifications/unsubscribe-page';
import { LoadingPage } from '@/components/ui/loading';

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string; email?: string }>;
}

export default async function UnsubscribePageRoute({ searchParams }: UnsubscribePageProps) {
  const params = await searchParams;
  const { token, email } = params;

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Invalid Unsubscribe Link
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The unsubscribe link is missing or invalid. Please check your email for the correct link.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingPage message="Loading unsubscribe page..." />}>
      <UnsubscribePage token={token} email={email} />
    </Suspense>
  );
}
