"use client"

import { Bell, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/components/providers/notification-provider"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

export default function Header() {
  const { unreadCount, togglePanel } = useNotifications()
  const { currentUser } = useAuth()

  // التحقق من صلاحية عرض الإشعارات
  const canViewNotifications = currentUser?.permission_type === 'مدير' || 
    (currentUser?.permission_type === 'موظف' && currentUser?.permissions?.view_notifications)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center px-6">
        <div className="flex-1">
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/welcome" className="text-sm font-semibold opacity-80 hover:opacity-100">التعريف</Link>
            <a href="#features" className="text-sm font-semibold opacity-80 hover:opacity-100">المميزات</a>
            <a href="#faq" className="text-sm font-semibold opacity-80 hover:opacity-100">الأسئلة</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {/* Login button when not authenticated */}
          {!currentUser && (
            <Link href="/login">
              <Button variant="ghost" size="sm" className="ml-2">
                <span className="hidden sm:inline">تسجيل الدخول</span>
                <LogIn className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          )}
          
          
          {/* عرض زر الإشعارات فقط إذا كانت الصلاحية متاحة */}
          
          {/* عرض زر الإشعارات فقط إذا كانت الصلاحية متاحة */}
          {canViewNotifications && (
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10"
              onClick={togglePanel}
            >
              <Bell className={cn(
                "h-5 w-5 transition-all",
                unreadCount > 0 && "text-primary animate-pulse"
              )} />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1"
                  >
                    <Badge 
                      variant="destructive" 
                      className="h-5 min-w-5 rounded-full px-1 text-[10px] font-bold flex items-center justify-center"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
