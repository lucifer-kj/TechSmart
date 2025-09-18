import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation, BottomNavigation } from "@/components/navigation";
import { ErrorBoundary } from "@/components/error-boundary";
import { AuthProvider } from "@/lib/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartTech Client Portal",
  description: "Secure customer portal connected to ServiceM8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <AuthProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <Navigation />
              <main className="lg:ml-64 pb-16 lg:pb-0">
                <div className="min-h-screen">
                  {children}
                </div>
              </main>
              <BottomNavigation />
            </div>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
