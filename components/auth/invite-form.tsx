'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitation } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";

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
    
    // Validation
    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, and one number");
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await acceptInvitation(token, password, fullName.trim());
      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }
      
      // Redirect to dashboard with success message
      router.push("/dashboard?welcome=true");
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
          <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email address
          </label>
          <input 
            id="email" 
            type="email" 
            value={email} 
            disabled 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 sm:text-sm" 
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            This email was used for your invitation
          </p>
        </div>
        
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Full name
          </label>
          <input 
            id="fullName" 
            type="text" 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
            required 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm" 
            placeholder="Enter your full name" 
            disabled={isLoading} 
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <input 
            id="password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm" 
            placeholder="Create a secure password" 
            disabled={isLoading} 
            minLength={8} 
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Must be at least 8 characters with uppercase, lowercase, and numbers
          </p>
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm password
          </label>
          <input 
            id="confirmPassword" 
            type="password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm" 
            placeholder="Confirm your password" 
            disabled={isLoading} 
            minLength={8} 
          />
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" 
        disabled={isLoading || !fullName.trim() || !password || !confirmPassword}
      >
        {isLoading ? (
          <>
            <Loading size="sm" className="mr-2" />
            Creating account...
          </>
        ) : (
          'Create Account & Sign In'
        )}
      </Button>
      
      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          By creating an account, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </form>
  );
}


