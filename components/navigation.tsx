"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';

interface NavigationProps {
  currentPath?: string;
}

export function Navigation({ currentPath = '/' }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/jobs', label: 'Jobs', icon: '🔧' },
    { href: '/documents', label: 'Documents', icon: '📄' },
    { href: '/payments', label: 'Payments', icon: '💳' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

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
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                U
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Customer User
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  customer@smarttech.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Bottom navigation for mobile
export function BottomNavigation({ currentPath = '/' }: NavigationProps) {
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
