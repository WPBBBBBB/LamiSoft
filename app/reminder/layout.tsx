"use client"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, Settings, LogOut, Send, Menu, X } from "lucide-react"
import Logo from "@/components/welcome/Logo"
import { ReminderAuthProvider, useReminderAuth } from "@/contexts/reminder-auth-context"

function ReminderSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useReminderAuth()

  const SIDEBAR_STORAGE_KEY = "reminder_sidebar_open"
  const SIDEBAR_WIDTH_OPEN = 256
  const SIDEBAR_WIDTH_CLOSED = 0

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (saved === "open") {
        setIsSidebarOpen(true)
        return
      }
      if (saved === "closed") {
        setIsSidebarOpen(false)
        return
      }

      // Default behavior: open on desktop, closed on mobile.
      setIsSidebarOpen(window.innerWidth >= 768)
    } catch {
      // Ignore storage errors (e.g. privacy mode)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, isSidebarOpen ? "open" : "closed")
    } catch {
      // Ignore storage errors
    }
  }, [isSidebarOpen])

  const menuItems = [
    { icon: LayoutDashboard, label: "لوحة التحكم", path: "/reminder/dashboard" },
    { icon: Send, label: "إرسال رسائل", path: "/reminder/send" },
    { icon: Users, label: "إدارة المستخدمين", path: "/reminder/users" },
    { icon: Settings, label: "الإعدادات", path: "/reminder/settings" },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex relative" dir="rtl">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: 100, opacity: 0 }}
        animate={{
          x: 0,
          opacity: 1,
          width: isSidebarOpen ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED,
        }}
        transition={{ duration: 0.2 }}
        className={`border-l bg-card/50 backdrop-blur-sm flex flex-col overflow-hidden fixed md:static inset-y-0 right-0 z-40 ${
          isSidebarOpen ? "" : "border-l-0"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <Logo className="scale-90" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="إغلاق القائمة"
              className="shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2">نظام التذكير التلقائي</p>
          <p className="text-xs text-center mt-1 font-semibold" style={{ color: "var(--theme-primary)" }}>
            {user.full_name}
          </p>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item, idx) => {
            const Icon = item.icon
            const isActive = pathname === item.path
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start gap-3 ${isActive ? "shadow-md" : ""}`}
                  title={item.label}
                  onClick={() => router.push(item.path)}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Button>
              </motion.div>
            )
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full gap-2" onClick={logout}>
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {!isSidebarOpen && (
          <div className="fixed right-3 top-3 z-50">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="فتح القائمة"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}

export default function ReminderLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReminderAuthProvider>
      <ReminderSidebar>{children}</ReminderSidebar>
    </ReminderAuthProvider>
  )
}
