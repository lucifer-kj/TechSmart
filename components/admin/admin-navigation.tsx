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
    <div className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ${
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
          className="p-2"
        >
          {isCollapsed ? "→" : "←"}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigationItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              item.current
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <span className="text-lg mr-3">{item.icon}</span>
            {!isCollapsed && <span>{item.name}</span>}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <div className="mb-4">
            <p className="text-xs text-gray-500">Logged in as Admin</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start"
        >
          <span className="mr-3">🚪</span>
          {!isCollapsed && "Logout"}
        </Button>
      </div>
    </div>
  );
}
