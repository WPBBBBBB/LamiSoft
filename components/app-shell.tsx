"use client"

import { useEffect, useState } from "react"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { SettingsProvider } from "@/components/providers/settings-provider"
import { ThemeApplier } from "@/components/providers/theme-applier"
import { AuthProvider } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import Header from "@/components/layout/header"
import Sidebar from "@/components/layout/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { WeatherProvider } from "@/components/providers/weather-provider"
import { WeatherDialog } from "@/app/home/components/weather-dialog"
import { GlobalKeyboardShortcuts } from "@/lib/keyboard-shortcuts"
import { NotificationProvider } from "@/components/providers/notification-provider"
import { NotificationPanel } from "@/components/notifications/notification-panel"
import { AnimatePresence } from "framer-motion"
import { WeatherDropZones } from "@/components/weather-drop-zones"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isLoginPage, setIsLoginPage] = useState(false)

  useEffect(() => {
    const pathname = window.location.pathname
    setIsLoginPage(pathname === "/login" || pathname === "/forgot-password")
  }, [])

  return (
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
                    <main className="min-h-screen">{children}</main>
                  ) : (
                    <div className="relative flex min-h-screen">
                      <Sidebar />
                      <div
                        className="flex-1"
                        style={{ marginLeft: "var(--sidebar-width, 288px)" }}
                      >
                        <Header />
                        <main className="container mx-auto p-6">{children}</main>
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
  )
}
