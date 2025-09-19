import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      refreshSession: jest.fn(),
      signInWithOtp: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }))
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn()
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null)
  })
}));

// Test component that uses auth context
function TestComponent() {
  const { user, profile, loading, error, signIn, signOut, isAdmin, isCustomer } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="error">{error || 'No Error'}</div>
      <div data-testid="user">{user ? user.email : 'No User'}</div>
      <div data-testid="profile">{profile ? profile.role : 'No Profile'}</div>
      <div data-testid="is-admin">{isAdmin ? 'Admin' : 'Not Admin'}</div>
      <div data-testid="is-customer">{isCustomer ? 'Customer' : 'Not Customer'}</div>
      <button onClick={() => signIn('test@example.com', 'password')}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide initial loading state', () => {
    const mockSupabase = createClient() as any;
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
  });

  it('should handle successful sign in', async () => {
    const mockSupabase = createClient() as any;
    const mockUser = { id: '123', email: 'test@example.com' };
    const mockProfile = { id: '123', role: 'customer', customer_id: 'customer-123', is_active: true };
    
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null
    });
    
    mockSupabase.from().select().eq().single.mockResolvedValue({
      data: mockProfile,
      error: null
    });
    
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    const signInButton = screen.getByText('Sign In');
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      });
    });
  });

  it('should handle sign in error', async () => {
    const mockSupabase = createClient() as any;
    const errorMessage = 'Invalid credentials';
    
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });
    
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: errorMessage }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    const signInButton = screen.getByText('Sign In');
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(errorMessage);
    });
  });

  it('should handle sign out', async () => {
    const mockSupabase = createClient() as any;
    
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });
    
    mockSupabase.auth.signOut.mockResolvedValue({
      error: null
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    const signOutButton = screen.getByText('Sign Out');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  it('should identify admin users correctly', async () => {
    const mockSupabase = createClient() as any;
    const mockUser = { id: '123', email: 'admin@example.com' };
    const mockProfile = { id: '123', role: 'admin', is_active: true };
    
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null
    });
    
    mockSupabase.from().select().eq().single.mockResolvedValue({
      data: mockProfile,
      error: null
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-admin')).toHaveTextContent('Admin');
      expect(screen.getByTestId('is-customer')).toHaveTextContent('Not Customer');
    });
  });

  it('should identify customer users correctly', async () => {
    const mockSupabase = createClient() as any;
    const mockUser = { id: '123', email: 'customer@example.com' };
    const mockProfile = { id: '123', role: 'customer', customer_id: 'customer-123', is_active: true };
    
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null
    });
    
    mockSupabase.from().select().eq().single.mockResolvedValue({
      data: mockProfile,
      error: null
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-customer')).toHaveTextContent('Customer');
      expect(screen.getByTestId('is-admin')).toHaveTextContent('Not Admin');
    });
  });

  it('should throw error when used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');
    
    consoleError.mockRestore();
  });
});
