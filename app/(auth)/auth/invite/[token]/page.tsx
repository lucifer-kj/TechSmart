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
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
            <span className="text-2xl">👋</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Complete Your Account Setup
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            You&apos;ve been invited to access the SmartTech customer portal
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            Set up your account to get started
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700">
          <InviteForm token={token} email={invitation.email} />
        </div>
        
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


