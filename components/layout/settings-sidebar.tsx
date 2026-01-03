"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ResizableSidebar } from "@/components/ui/resizable-sidebar"
import { useSettings } from "@/components/providers/settings-provider"
import { useAuth } from "@/contexts/auth-context"
import {
  Palette,
  Languages,
  Type,
  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
  Database,
  RotateCcw,
  FileText,
  MessageCircle,
  Printer,
  User,
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean // إضافة خاصية لتحديد الأزرار الخاصة بالمدير فقط
}

const navigation: NavItem[] = [
  {
    title: "الحساب",
    href: "/settings/account",
    icon: User,
  },
  {
    title: "المظهر",
    href: "/settings/appearance",
    icon: Palette,
  },
  {
    title: "اللغات",
    href: "/settings/language",
    icon: Languages,
  },
  {
    title: "الخطوط",
    href: "/settings/fonts",
    icon: Type,
  },
  {
    title: "إعدادات الطباعة",
    href: "/settings/print-settings",
    icon: Printer,
  },
  {
    title: "قاعدة البيانات",
    href: "/settings/database",
    icon: Database,
    adminOnly: true, // للمدير فقط
  },
  {
    title: "خدمة الواتساب",
    href: "/settings/whatsapp",
    icon: MessageCircle,
    adminOnly: true, // للمدير فقط
  },
  {
    title: "سجل الحركات",
    href: "/settings/system-log",
    icon: FileText,
    adminOnly: true, // للمدير فقط
  },
  {
    title: "تصفير النظام",
    href: "/settings/system-reset",
    icon: RotateCcw,
    adminOnly: true, // للمدير فقط
  },
]

export function SettingsSidebar() {
  const pathname = usePathname()
  const { currentUser } = useAuth()
  const {
    settingsSidebarWidth,
    setSettingsSidebarWidth,
    settingsSidebarCollapsed,
    setSettingsSidebarCollapsed,
  } = useSettings()

  return (
    <ResizableSidebar
      defaultWidth={settingsSidebarWidth}
      minWidth={200}
      maxWidth={400}
      collapsed={settingsSidebarCollapsed}
      onWidthChange={setSettingsSidebarWidth}
      className="fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] border-r bg-background"
      side="left"
    >
      <div className="flex h-full flex-col">
        {}
        <div className="flex h-14 items-center justify-between border-b px-4">
          {!settingsSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              <h2 className="text-lg font-semibold">الإعدادات</h2>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsSidebarCollapsed(!settingsSidebarCollapsed)}
            className="transition-transform hover:scale-110"
          >
            {settingsSidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>

        {}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navigation.map((item) => {
              // إخفاء الأزرار الخاصة بالمدير إذا لم يكن المستخدم مديراً
              if (item.adminOnly && currentUser?.permission_type !== 'مدير') {
                return null
              }

              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground",
                    settingsSidebarCollapsed && "justify-center"
                  )}
                  title={settingsSidebarCollapsed ? item.title : undefined}
                >
                  <item.icon className={cn("h-5 w-5", settingsSidebarCollapsed ? "h-6 w-6" : "")} />
                  {!settingsSidebarCollapsed && <span>{item.title}</span>}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>
      </div>
    </ResizableSidebar>
  )
}
