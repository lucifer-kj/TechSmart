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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900 mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Invalid Unsubscribe Link
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              The unsubscribe link is missing or invalid. Please check your email for the correct link.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Go to Login
            </button>
          </div>
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
