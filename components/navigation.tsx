"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Loading } from './ui/loading';

interface NavigationProps {
  currentPath?: string;
}

export function Navigation({ currentPath = '/' }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, loading, signOut, isAdmin } = useAuth();

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-center h-32">
            <Loading />
          </div>
        </div>
      </div>
    );
  }

  // Don't show navigation if user is not authenticated
  if (!user) {
    return null;
  }

  const navigationItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/jobs', label: 'Jobs', icon: '🔧' },
    { href: '/documents', label: 'Documents', icon: '📄' },
    { href: '/payments', label: 'Payments', icon: '💳' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  // Add admin-specific navigation items
  if (isAdmin) {
    navigationItems.push(
      { href: '/admin/dashboard', label: 'Admin Dashboard', icon: '⚙️' },
      { href: '/admin/customers', label: 'Customers', icon: '👥' },
      { href: '/admin/jobs', label: 'All Jobs', icon: '🔧' },
      { href: '/admin/documents', label: 'Documents', icon: '📄' },
      { href: '/admin/users', label: 'Users', icon: '👤' }
    );
  }

  const isActive = (href: string) => {
    return currentPath === href || (href !== '/dashboard' && currentPath.startsWith(href));
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white/90 backdrop-blur-sm"
        >
          ☰
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">SmartTech Portal</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ✕
                </Button>
              </div>
              
              <nav className="space-y-2">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Navigation */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              SmartTech Portal
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Customer Portal
            </p>
          </div>
          
          <nav className="space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 capitalize">
                    {profile?.role}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Bottom navigation for mobile
export function BottomNavigation({ currentPath = '/' }: NavigationProps) {
  const { user, loading } = useAuth();

  // Don't show bottom navigation if user is not authenticated or loading
  if (loading || !user) {
    return null;
  }

  const navigationItems = [
    { href: '/dashboard', label: 'Home', icon: '🏠' },
    { href: '/jobs', label: 'Jobs', icon: '🔧' },
    { href: '/documents', label: 'Docs', icon: '📄' },
    { href: '/payments', label: 'Pay', icon: '💳' },
  ];

  const isActive = (href: string) => {
    return currentPath === href || (href !== '/dashboard' && currentPath.startsWith(href));
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <nav className="flex justify-around py-2">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              isActive(item.href)
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <span className="text-lg mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
