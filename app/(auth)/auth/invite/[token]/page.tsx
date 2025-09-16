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
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold">
            Complete Your Account Setup
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            You&apos;ve been invited to access the ServiceM8 customer portal
          </p>
        </div>
        <InviteForm token={token} email={invitation.email} />
      </div>
    </div>
  );
}


