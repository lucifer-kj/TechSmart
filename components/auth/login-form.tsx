'use client'

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const { signIn, loading } = useAuth();
  const supabase = createClient();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);
    
    const { error } = await signIn(email, password);
    if (error) {
      setError(
        typeof error === "object" && error !== null && "message" in error
          ? (error as { message: string }).message
          : String(error)
      );
      setIsLoading(false);
      return;
    }
    
    // Let the middleware handle the redirect based on user role
    // This will redirect to /admin/dashboard for admins or /dashboard for customers
    router.push("/");
    router.refresh();
  };

  const handleMagicLinkLogin = async () => {
    setError("");
    setSuccess("");
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        setError(error.message);
      } else {
        setIsMagicLinkSent(true);
        setSuccess("Check your email for the magic link!");
      }
    } catch {
      setError("Failed to send magic link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isMagicLinkSent) {
    return (
      <div className="mt-8 space-y-6 text-center">
        <div className="text-green-600 font-medium">
          Magic link sent to {email}
        </div>
        <p className="text-sm text-gray-600">
          Check your email and click the link to sign in. The link will expire in 1 hour.
        </p>
        <Button 
          onClick={() => {
            setIsMagicLinkSent(false);
            setSuccess("");
          }}
          variant="outline"
          className="w-full"
        >
          Back to login
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
      )}
      {success && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{success}</div>
      )}
      
      <form onSubmit={handlePasswordLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input 
            id="email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            placeholder="Enter your email" 
            disabled={isLoading || loading} 
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input 
            id="password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            placeholder="Enter your password" 
            disabled={isLoading || loading} 
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading || loading}>
          {isLoading || loading ? "Signing in..." : "Sign in with Password"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or</span>
        </div>
      </div>

      <Button 
        onClick={handleMagicLinkLogin}
        variant="outline" 
        className="w-full" 
        disabled={!email || isLoading || loading}
      >
        {isLoading ? "Sending..." : "Sign in with Magic Link"}
      </Button>
      
      <div className="text-center space-y-2">
        <a
          href="/forgot-password"
          className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Forgot your password?
        </a>
        <div className="text-xs text-gray-500">
          Magic link login doesn&apos;t require a password
        </div>
      </div>
    </div>
  );
}


