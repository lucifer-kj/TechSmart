'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitation } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

interface InviteFormProps { token: string; email: string }

export function InviteForm({ token, email }: InviteFormProps) {
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters long"); return; }
    setIsLoading(true);
    const { error } = await acceptInvitation(token, password, fullName);
    if (error) { setError(error.message); setIsLoading(false); return; }
    router.push("/dashboard");
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email address</label>
          <input id="email" type="email" value={email} disabled className="mt-1 w-full border rounded px-3 py-2 bg-gray-50" />
        </div>
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium">Full name</label>
          <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1 w-full border rounded px-3 py-2" placeholder="Enter your full name" disabled={isLoading} />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 w-full border rounded px-3 py-2" placeholder="Create a password" disabled={isLoading} minLength={8} />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium">Confirm password</label>
          <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="mt-1 w-full border rounded px-3 py-2" placeholder="Confirm your password" disabled={isLoading} minLength={8} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading || !fullName || !password || !confirmPassword}>
        {isLoading ? "Creating account..." : "Create Account & Sign In"}
      </Button>
    </form>
  );
}


