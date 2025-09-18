import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };
  
  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizes[size]} ${className}`} />
  );
}

interface LoadingPageProps {
  message?: string;
}

export function LoadingPage({ message = 'Loading...' }: LoadingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}

interface LoadingCardProps {
  message?: string;
}

export function LoadingCard({ message = 'Loading...' }: LoadingCardProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <LoadingSpinner size="md" />
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}

// Simple loading component for general use
export function Loading({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return <LoadingSpinner size={size} className={className} />;
}