"use client";

import { ReactNode } from "react";
import { AdminNavigation } from "@/components/admin/admin-navigation";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminNavigation />
      <main className="ml-64">
        {children}
      </main>
    </div>
  );
}
