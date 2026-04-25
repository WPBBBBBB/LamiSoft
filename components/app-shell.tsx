"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { SettingsProvider } from "@/components/providers/settings-provider"
import { ThemeApplier } from "@/components/providers/theme-applier"
import { AuthProvider } from "@/contexts/auth-context"
import { CustomButtonsProvider } from "@/contexts/custom-buttons-context"
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
import { CookieConsentBanner } from "@/components/cookie-consent-banner"
import { CookieThemeSync } from "@/components/providers/cookie-theme-sync"

export function AppShell({
  children,
  nonce,
}: {
  children: React.ReactNode
  nonce?: string
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login" || pathname === "/forgot-password"
  const isWelcomePage = pathname === "/welcome" || pathname === "/"
  const isReminderLoginPage = pathname === "/reminder-login"
  const isReminderPage = pathname?.startsWith("/reminder")

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
    >
      <CookieThemeSync />
      <SettingsProvider>
        <ThemeApplier>
          <AuthProvider>
            <CustomButtonsProvider>
              <WeatherProvider>
                <NotificationProvider>
                  <ProtectedRoute>
                    {isLoginPage || isWelcomePage || isReminderPage ? (
                      <main className="min-h-screen">{children}</main>
                    ) : (
                      <div className="relative flex min-h-screen">
                        <Sidebar
                          mobileOpen={mobileSidebarOpen}
                          onMobileClose={() => setMobileSidebarOpen(false)}
                        />
                        <div
                          className="flex-1 min-w-0 md:ml-(--sidebar-width,288px)"
                        >
                          <Header onMenuToggle={() => setMobileSidebarOpen(prev => !prev)} />
                          <main className="container mx-auto p-4 md:p-6">{children}</main>
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
            </CustomButtonsProvider>
          </AuthProvider>
        </ThemeApplier>
      </SettingsProvider>

      <CookieConsentBanner />

      <GlobalKeyboardShortcuts />
      <Toaster />
    </ThemeProvider>
  )
}
