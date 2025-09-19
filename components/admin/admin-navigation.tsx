"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function AdminNavigation() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: "📊",
      current: pathname === "/admin/dashboard"
    },
    {
      name: "Customers",
      href: "/admin/customers",
      icon: "👥",
      current: pathname.startsWith("/admin/customers")
    },
    {
      name: "Jobs",
      href: "/admin/jobs",
      icon: "🔧",
      current: pathname.startsWith("/admin/jobs")
    },
    {
      name: "Users",
      href: "/admin/users",
      icon: "👤",
      current: pathname.startsWith("/admin/users")
    },
    {
      name: "Documents",
      href: "/admin/documents",
      icon: "📄",
      current: pathname.startsWith("/admin/documents")
    },
    {
      name: "Payments",
      href: "/admin/payments",
      icon: "💰",
      current: pathname.startsWith("/admin/payments")
    },
    {
      name: "Reports",
      href: "/admin/reports",
      icon: "📈",
      current: pathname.startsWith("/admin/reports")
    },
    {
      name: "Settings",
      href: "/admin/settings",
      icon: "⚙️",
      current: pathname.startsWith("/admin/settings")
    }
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-xl transition-all duration-300 ${
      isCollapsed ? "w-16" : "w-64"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Admin Portal
            </h1>
            <p className="text-sm text-gray-500">ServiceM8 Management</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? "→" : "←"}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
              item.current
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 shadow-sm"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            }`}
            title={isCollapsed ? item.name : undefined}
          >
            <span className="text-lg mr-3 flex-shrink-0">{item.icon}</span>
            {!isCollapsed && <span className="font-medium">{item.name}</span>}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <div className="mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Admin User</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Administrator</p>
              </div>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        >
          <span className="mr-3">🚪</span>
          {!isCollapsed && "Logout"}
        </Button>
      </div>
    </div>
  );
}
