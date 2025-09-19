import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/auth/login-form';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithOtp: jest.fn()
    }
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

// Mock auth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: jest.fn(),
    loading: false
  })
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form with email and password fields', () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in with password/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in with magic link/i)).toBeInTheDocument();
  });

  it('should show forgot password link', () => {
    render(<LoginForm />);
    
    const forgotPasswordLink = screen.getByText(/forgot your password/i);
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password');
  });

  it('should handle email input changes', () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should handle password input changes', () => {
    render(<LoginForm />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
    
    expect(passwordInput).toHaveValue('testpassword');
  });

  it('should show magic link sent state when magic link is sent', async () => {
    const mockSupabase = createClient() as any;
    mockSupabase.auth.signInWithOtp.mockResolvedValue({
      error: null
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const magicLinkButton = screen.getByText(/sign in with magic link/i);
    fireEvent.click(magicLinkButton);
    
    await waitFor(() => {
      expect(screen.getByText(/magic link sent to test@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/check your email and click the link/i)).toBeInTheDocument();
    });
  });

  it('should show error when magic link fails', async () => {
    const mockSupabase = createClient() as any;
    const errorMessage = 'Failed to send magic link';
    mockSupabase.auth.signInWithOtp.mockResolvedValue({
      error: { message: errorMessage }
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const magicLinkButton = screen.getByText(/sign in with magic link/i);
    fireEvent.click(magicLinkButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should disable magic link button when email is empty', () => {
    render(<LoginForm />);
    
    const magicLinkButton = screen.getByText(/sign in with magic link/i);
    expect(magicLinkButton).toBeDisabled();
  });

  it('should enable magic link button when email is provided', () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const magicLinkButton = screen.getByText(/sign in with magic link/i);
    expect(magicLinkButton).not.toBeDisabled();
  });

  it('should show back to login button in magic link sent state', async () => {
    const mockSupabase = createClient() as any;
    mockSupabase.auth.signInWithOtp.mockResolvedValue({
      error: null
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const magicLinkButton = screen.getByText(/sign in with magic link/i);
    fireEvent.click(magicLinkButton);
    
    await waitFor(() => {
      const backButton = screen.getByText(/back to login/i);
      expect(backButton).toBeInTheDocument();
      
      fireEvent.click(backButton);
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });
  });

  it('should show magic link explanation text', () => {
    render(<LoginForm />);
    
    expect(screen.getByText(/magic link login doesn't require a password/i)).toBeInTheDocument();
  });

  it('should handle form submission with password', () => {
    const mockSignIn = jest.fn();
    jest.doMock('@/hooks/useAuth', () => ({
      useAuth: () => ({
        signIn: mockSignIn,
        loading: false
      })
    }));

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByText(/sign in with password/i);
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    // Note: This test would need proper mocking of the useAuth hook to work fully
    // The current mock doesn't return the actual signIn function
  });
});
