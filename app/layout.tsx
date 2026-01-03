"use client"
import { Geist, Geist_Mono } from "next/font/google";
import { usePathname } from "next/navigation";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { ThemeApplier } from "@/components/providers/theme-applier";
import { AuthProvider } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { WeatherProvider } from "@/components/providers/weather-provider";
import { WeatherDialog } from "@/app/home/components/weather-dialog";
import { GlobalKeyboardShortcuts } from "@/lib/keyboard-shortcuts";
import { NotificationProvider } from "@/components/providers/notification-provider";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { AnimatePresence } from "framer-motion";
import { WeatherDropZones } from "@/components/weather-drop-zones";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/forgot-password";

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <title>AL-LamiSoft</title>
        <meta name="description" content="نظام إدارة المشتريات والمبيعات بشكل احتراف" />
        <link rel="icon" href="/aave.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />

        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="application-name" content="AL-LamiSoft" />
        <meta name="mobile-web-app-capable" content="yes" />

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/pwa/apple-touch-icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SettingsProvider>
            <ThemeApplier>
              <AuthProvider>
                <WeatherProvider>
                  <NotificationProvider>
                    <ProtectedRoute>
                      {isLoginPage ? (
                        <main className="min-h-screen">
                          {children}
                        </main>
                      ) : (
                        <div className="relative flex min-h-screen">
                          <Sidebar />
                          <div className="flex-1" style={{ marginLeft: "var(--sidebar-width, 288px)" }}>
                            <Header />
                            <main className="container mx-auto p-6">
                              {children}
                            </main>
                          </div>
                        </div>
                      )}
                    </ProtectedRoute>
                    <AnimatePresence>
                      <NotificationPanel />
                    </AnimatePresence>
                    <WeatherDialog />
                    <WeatherDropZones />
                  </NotificationProvider>
                </WeatherProvider>
              </AuthProvider>
            </ThemeApplier>
          </SettingsProvider>
          <GlobalKeyboardShortcuts />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
