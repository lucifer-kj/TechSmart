// Re-export the useAuth hook from auth-context for convenience
export { useAuth, useRequireAuth, useRequireRole } from '@/lib/auth-context';

// Additional auth-related hooks
import { useAuth as useAuthContext } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Hook for automatic redirect based on auth state
export function useAuthRedirect(redirectTo?: string) {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && redirectTo) {
      router.push(redirectTo);
    }
  }, [user, loading, redirectTo, router]);

  return { user, loading };
}

// Hook for protecting routes that require authentication
export function useProtectedRoute(redirectTo: string = '/login') {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo);
    }
  }, [user, loading, redirectTo, router]);

  return { user, loading, isAuthenticated: !!user };
}

// Hook for protecting admin routes
export function useAdminRoute(redirectTo: string = '/unauthorized') {
  const { user, profile, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (profile?.role !== 'admin') {
        router.push(redirectTo);
      }
    }
  }, [user, profile, loading, redirectTo, router]);

  return { 
    user, 
    profile, 
    loading, 
    isAdmin: profile?.role === 'admin',
    isAuthenticated: !!user 
  };
}

// Hook for protecting customer routes
export function useCustomerRoute(redirectTo: string = '/unauthorized') {
  const { user, profile, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (profile?.role !== 'customer') {
        router.push(redirectTo);
      }
    }
  }, [user, profile, loading, redirectTo, router]);

  return { 
    user, 
    profile, 
    loading, 
    isCustomer: profile?.role === 'customer',
    isAuthenticated: !!user 
  };
}

// Hook for checking if user can access a specific customer's data
export function useCustomerAccess(customerId: string) {
  const { user, profile, loading } = useAuthContext();

  const hasAccess = !loading && user && (
    profile?.role === 'admin' || 
    profile?.customer_id === customerId
  );

  return {
    hasAccess,
    loading,
    user,
    profile,
    isAdmin: profile?.role === 'admin',
    isCustomer: profile?.role === 'customer',
  };
}
