"use client";

import { usePathname } from "next/navigation";
import { Navigation, BottomNavigation } from "@/components/navigation";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Check if we're on an auth page (these have their own layout)
  const isAuthPage = pathname.startsWith('/login') || 
                     pathname.startsWith('/forgot-password') || 
                     pathname.startsWith('/reset-password') || 
                     pathname.startsWith('/invalid-invitation') ||
                     pathname.startsWith('/auth/');
  
  // Check if we're on an admin page (these have their own layout with AdminNavigation)
  const isAdminPage = pathname.startsWith('/admin/');

  // Auth pages use their own layout
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Admin pages use their own layout (defined in app/admin/layout.tsx)
  if (isAdminPage) {
    return <>{children}</>;
  }

  // Regular pages with customer portal navigation
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <main className="pb-16 lg:pb-0 lg:ml-64">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
