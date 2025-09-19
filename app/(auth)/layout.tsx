import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SmartTech Client Portal - Authentication",
  description: "Secure customer portal authentication",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Full-width layout for auth pages - no sidebar margin */}
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}
