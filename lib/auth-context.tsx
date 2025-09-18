'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient as createBrowserSupabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/auth/server';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: unknown }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ data: unknown; error: unknown }>;
  signOut: () => Promise<{ error: unknown }>;
  resetPassword: (email: string) => Promise<{ data: unknown; error: unknown }>;
  refreshSession: () => Promise<void>;
  isAdmin: boolean;
  isCustomer: boolean;
  hasRole: (role: 'admin' | 'customer') => boolean;
  canAccessCustomer: (customerId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
  });

  const supabase = createBrowserSupabase();

  // Fetch user profile
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, [supabase]);

  // Initialize auth state
  const initializeAuth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Get initial session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: sessionError.message 
        }));
        return;
      }

      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setState(prev => ({
          ...prev,
          user: session.user,
          profile,
          session,
          loading: false,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          profile: null,
          session: null,
          loading: false,
          error: null,
        }));
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [supabase, fetchUserProfile]);

  // Set up auth state listener
  useEffect(() => {
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setState(prev => ({
            ...prev,
            user: session.user,
            profile,
            session,
            loading: false,
            error: null,
          }));
        } else if (event === 'SIGNED_OUT') {
          setState(prev => ({
            ...prev,
            user: null,
            profile: null,
            session: null,
            loading: false,
            error: null,
          }));
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setState(prev => ({
            ...prev,
            user: session.user,
            profile,
            session,
            loading: false,
            error: null,
          }));
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [initializeAuth, supabase, fetchUserProfile]);

  // Auth methods
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await supabase.auth.signInWithPassword({ email, password });
      
      if (result.error) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: result.error.message 
        }));
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      return { data: null, error: { message: errorMessage } };
    }
  }, [supabase]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      
      if (result.error) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: result.error.message 
        }));
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      return { data: null, error: { message: errorMessage } };
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await supabase.auth.signOut();
      
      if (result.error) {
        setState(prev => ({ 
          ...prev,
          loading: false,
          error: result.error ? result.error.message : null
        }));
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      return { error: { message: errorMessage } };
    }
  }, [supabase]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (result.error) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: result.error.message 
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      return { data: null, error: { message: errorMessage } };
    }
  }, [supabase]);

  const refreshSession = useCallback(async () => {
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Error refreshing session:', error);
        setState(prev => ({ 
          ...prev, 
          error: error.message 
        }));
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [supabase]);

  // Computed properties
  const isAdmin = state.profile?.role === 'admin';
  const isCustomer = state.profile?.role === 'customer';

  const hasRole = useCallback((role: 'admin' | 'customer') => {
    return state.profile?.role === role;
  }, [state.profile]);

  const canAccessCustomer = useCallback((customerId: string) => {
    if (!state.profile) return false;
    if (state.profile.role === 'admin') return true;
    return state.profile.customer_id === customerId;
  }, [state.profile]);

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshSession,
    isAdmin,
    isCustomer,
    hasRole,
    canAccessCustomer,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for checking authentication status
export function useRequireAuth() {
  const { user, loading, error } = useAuth();
  
  return {
    isAuthenticated: !!user,
    isLoading: loading,
    error,
  };
}

// Hook for role-based access control
export function useRequireRole(role: 'admin' | 'customer') {
  const { user, profile, loading, error } = useAuth();
  
  return {
    hasAccess: !!user && profile?.role === role,
    isLoading: loading,
    error,
    user,
    profile,
  };
}
