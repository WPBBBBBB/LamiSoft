"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Home,
  BarChart3,
  Calendar,
  DollarSign,
  ShoppingCart,
  Wallet,
  TrendingUp,
  MessageSquare,
  Send,
  Hash,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Menu,
  Users,
  Shield,
  LogOut,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ResizableSidebar } from "@/components/ui/resizable-sidebar"
import { useSettings } from "@/components/providers/settings-provider"
import { useAuth } from "@/contexts/auth-context"

interface NavItem {
  title: string
  href: string
  icon: any
  badge?: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navigation: (NavItem | NavGroup)[] = [
  {
    title: "الصفحة الرئيسية",
    href: "/home",
    icon: Home,
  },
  {
    title: "الإحصائيات",
    items: [
      {
        title: "الإحصائيات الشاملة",
        href: "/stats/comprehensive",
        icon: BarChart3,
      },
      {
        title: "الإحصائيات اليومية",
        href: "/stats/daily",
        icon: Calendar,
      },
      {
        title: "إحصائيات المبيعات",
        href: "/stats/sales",
        icon: TrendingUp,
      },
      {
        title: "إحصائيات المشتريات",
        href: "/stats/purchases",
        icon: ShoppingCart,
      },
    ],
  },
  {
    title: "الأرصدة والأرباح",
    items: [
      {
        title: "المصاريف",
        href: "/balance/expenses",
        icon: DollarSign,
      },
      {
        title: "أرصدة المواد",
        href: "/balance/materials",
        icon: Wallet,
      },
      {
        title: "أرباح المبيعات",
        href: "/balance/sales-profit",
        icon: TrendingUp,
      },
      {
        title: "صافي الأرباح",
        href: "/balance/net-profit",
        icon: DollarSign,
      },
    ],
  },
  {
    title: "الأشخاص",
    href: "/customers",
    icon: Users,
  },
  {
    title: "الخدمات",
    items: [
      {
        title: "إدارة الواتساب",
        href: "/services/whatsapp-management",
        icon: MessageSquare,
      },
      {
        title: "واتساب",
        href: "/services/whatsapp",
        icon: MessageSquare,
      },
      {
        title: "تلغرام",
        href: "/services/telegram",
        icon: Send,
      },
      {
        title: "ديسكورد",
        href: "/services/discord",
        icon: Hash,
      },
    ],
  },
  {
    title: "المستخدمين والصلاحيات",
    href: "/users-permissions",
    icon: Shield,
  },
  {
    title: "الإعدادات",
    href: "/settings",
    icon: Settings,
  },
]

function NavLink({ item, collapsed }: { item: NavItem; collapsed?: boolean }) {
  const pathname = usePathname()
  const isActive = pathname === item.href

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground",
        collapsed && "justify-center"
      )}
      title={collapsed ? item.title : undefined}
    >
      {!collapsed && (
        <>
          <span className="flex-1 text-right">{item.title}</span>
          {item.badge && (
            <Badge variant="secondary">
              {item.badge}
            </Badge>
          )}
        </>
      )}
      <item.icon className={cn("h-4 w-4", collapsed && "h-6 w-6")} />
    </Link>
  )
}

function NavGroup({ group, collapsed }: { group: NavGroup; collapsed?: boolean }) {
  const [isOpen, setIsOpen] = useState(true)
  const pathname = usePathname()
  const isActive = group.items.some((item) => pathname === item.href)

  if (collapsed) {
    // Show only first item icon when collapsed
    const firstItem = group.items[0]
    return <NavLink item={firstItem} collapsed={collapsed} />
  }

  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-between px-3 py-2 text-sm font-medium",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-right flex-1">{group.title}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
      {isOpen && (
        <div className="space-y-1 pl-6">
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} collapsed={false} />
          ))}
        </div>
      )}
    </div>
  )
}


function getGreeting(fullName?: string) {
  const hour = new Date().getHours()
  if (hour < 12) {
    return `صباح الخير يا ${fullName ?? ''}`.trim()
  } else if (hour < 17) {
    return `طاب مساؤك يا ${fullName ?? ''}`.trim()
  } else {
    return `مساء الخير يا ${fullName ?? ''}`.trim()
  }
}

export default function Sidebar() {
  const { currentUser, logout } = useAuth()
  const [greeting, setGreeting] = useState("")
  const {
    mainSidebarWidth,
    setMainSidebarWidth,
    mainSidebarCollapsed,
    setMainSidebarCollapsed,
  } = useSettings()

  useEffect(() => {
    setGreeting(getGreeting(currentUser?.full_name))
  }, [currentUser])

  useEffect(() => {
    // Update CSS variable when width changes
    const width = mainSidebarCollapsed ? 80 : mainSidebarWidth
    document.documentElement.style.setProperty("--sidebar-width", `${width}px`)
  }, [mainSidebarWidth, mainSidebarCollapsed])

  return (
    <ResizableSidebar
      defaultWidth={mainSidebarWidth}
      minWidth={200}
      maxWidth={500}
      collapsed={mainSidebarCollapsed}
      onWidthChange={setMainSidebarWidth}
      className="fixed left-0 top-0 z-40 h-screen border-r bg-background"
      side="left"
    >
      <div className="flex h-full flex-col">
        {/* Toggle Button */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          {!mainSidebarCollapsed && (
            <h2 className="text-lg font-semibold">القائمة</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMainSidebarCollapsed(!mainSidebarCollapsed)}
            className="transition-transform hover:scale-110"
          >
            {mainSidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {!mainSidebarCollapsed && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-1">
                {greeting}
              </h2>
              <p className="text-sm text-muted-foreground">
                مرحباً بك في لوحة التحكم
              </p>
            </div>
          )}
          <nav className="space-y-2">
            {navigation.map((item, index) => {
              if ("items" in item) {
                return <NavGroup key={index} group={item} collapsed={mainSidebarCollapsed} />
              }
              return <NavLink key={item.href} item={item} collapsed={mainSidebarCollapsed} />
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="border-t p-4">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950",
              mainSidebarCollapsed && "justify-center"
            )}
            onClick={() => {
              logout()
              window.location.href = "/login"
            }}
            title={mainSidebarCollapsed ? "تسجيل الخروج" : undefined}
          >
            {!mainSidebarCollapsed && (
              <span className="flex-1 text-right">تسجيل الخروج</span>
            )}
            <LogOut className={cn("h-4 w-4", mainSidebarCollapsed && "h-6 w-6")} />
          </Button>
        </div>
      </div>
    </ResizableSidebar>
  )
}
