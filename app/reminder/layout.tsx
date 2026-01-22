"use client"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, Settings, LogOut } from "lucide-react"
import Logo from "@/components/welcome/Logo"
import { ReminderAuthProvider, useReminderAuth } from "@/contexts/reminder-auth-context"

function ReminderSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useReminderAuth()

  const menuItems = [
    { icon: LayoutDashboard, label: "لوحة التحكم", path: "/reminder/dashboard" },
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
    <div className="min-h-screen bg-background flex" dir="rtl">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-64 border-l bg-card/50 backdrop-blur-sm flex flex-col"
      >
        {/* Logo */}
        <div className="p-6 border-b">
          <Logo className="scale-90" />
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
