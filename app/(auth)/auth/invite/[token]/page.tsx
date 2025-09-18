import { verifyInvitationToken } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { InviteForm } from "@/components/auth/invite-form";

type tParams = Promise<{ token: string }>;

interface PageProps { params: tParams }

export default async function InvitePage(props: PageProps) {
  const params = await props.params;
  const { token } = params;

  const { data: invitation, error } = await verifyInvitationToken(token);
  if (error || !invitation) {
    redirect("/auth/invalid-invitation");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
            <svg
              className="h-6 w-6 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Complete Your Account Setup
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            You&apos;ve been invited to access the SmartTech customer portal
          </p>
          <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-500">
            Set up your account to get started
          </p>
        </div>
        <InviteForm token={token} email={invitation.email} />
        
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Need help? Contact support at{' '}
            <a href="mailto:support@smarttech.com" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
              support@smarttech.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}


