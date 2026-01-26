"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Home,
  BarChart3,
  Calendar,
  DollarSign,
  Wallet,
  TrendingUp,
  MessageSquare,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftOpen,
  PanelLeftClose,
  Shield,
  LogOut,
  Users,
  ClipboardList,
  ShoppingCart,
  Plus,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ResizableSidebar } from "@/components/ui/resizable-sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSettings } from "@/components/providers/settings-provider"
import { useAuth } from "@/contexts/auth-context"
import { useCustomButtons } from "@/contexts/custom-buttons-context"
import { useLongPress } from "@/lib/hooks"
import { t } from "@/lib/translations"
import { toast } from "sonner"
import { PaymentModal } from "@/components/modals/payment-modal"

interface NavItem {
  titleKey: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

interface NavGroup {
  titleKey: string
  items: NavItem[]
}

const navigationConfig: (NavItem | NavGroup)[] = [
  {
    titleKey: "home",
    href: "/home",
    icon: Home,
  },
  {
    titleKey: "statistics",
    items: [
      {
        titleKey: "comprehensiveStats",
        href: "/stats/comprehensive",
        icon: BarChart3,
      },
      {
        titleKey: "dailyStats",
        href: "/stats/daily",
        icon: Calendar,
      },
    ],
  },
  {
    titleKey: "procedures",
    items: [
      {
        titleKey: "addSale",
        href: "/sales/add",
        icon: TrendingUp,
      },
      {
        titleKey: "addPurchase",
        href: "/purchases/add",
        icon: ShoppingCart,
      },
      {
        titleKey: "cashBox",
        href: "#",
        icon: Wallet,
      },
      {
        titleKey: "inventoryCount",
        href: "/inventory-count",
        icon: ClipboardList,
      },
    ],
  },
  {
    titleKey: "balancesAndProfits",
    items: [
      {
        titleKey: "expenses",
        href: "/balance/expenses",
        icon: DollarSign,
      },
      {
        titleKey: "materialsBalance",
        href: "/balance/materials",
        icon: Wallet,
      },
      {
        titleKey: "salesProfit",
        href: "/balance/sales-profit",
        icon: TrendingUp,
      },
      {
        titleKey: "netProfit",
        href: "/balance/net-profit",
        icon: DollarSign,
      },
    ],
  },
  {
    titleKey: "services",
    items: [
      {
        titleKey: "whatsappManagement",
        href: "/services/whatsapp-management",
        icon: MessageSquare,
      },
    ],
  },
  {
    titleKey: "people",
    href: "/customers",
    icon: Users,
  },
  {
    titleKey: "usersAndPermissions",
    href: "/users-permissions",
    icon: Shield,
  },
  {
    titleKey: "settings",
    href: "/settings",
    icon: Settings,
  },
]

function NavLink({ item, collapsed, lang, inProceduresGroup, onOpenPaymentModal }: { item: NavItem; collapsed?: boolean; lang: string; inProceduresGroup?: boolean; onOpenPaymentModal?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const isActive = pathname === item.href
  const title = t(item.titleKey, lang)
  const { addHomeButton, homeButtons } = useCustomButtons()
  const [showContextMenu, setShowContextMenu] = useState(false)

  const isInHome = homeButtons.some(b => b.id === item.titleKey)

  // خريطة الأيقونات بشكل string
  const iconNames: Record<string, string> = {
    TrendingUp: "TrendingUp",
    ShoppingCart: "ShoppingCart",
    Wallet: "Wallet",
    ClipboardList: "ClipboardList",
  }

  // خريطة ألوان الأيقونات
  const iconColors: Record<string, string> = {
    addSale: "theme-success",
    addPurchase: "theme-danger",
    cashBox: "theme-warning",
    inventoryCount: "theme-info",
  }

  const handleAddToHome = () => {
    if (isInHome) {
      toast.info(t('alreadyInHome', lang))
      setShowContextMenu(false)
      return
    }

    const iconName = iconNames[item.icon.name] || "TrendingUp"
    
    addHomeButton({
      id: item.titleKey,
      labelKey: item.titleKey,
      icon: iconName,
      href: item.titleKey === "cashBox" ? undefined : item.href,
      variant: "default",
      colorClass: iconColors[item.titleKey] || "theme-info",
    })
    
    toast.success(t('addedToHome', lang))
    setShowContextMenu(false)
  }

  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (inProceduresGroup) {
        setShowContextMenu(true)
      }
    },
    delay: 1000,
  })

  const handleItemClick = (e: React.MouseEvent) => {
    // إذا كان زر الصندوق، افتح مودال الدفعة
    if (item.titleKey === "cashBox" && onOpenPaymentModal) {
      e.preventDefault()
      onOpenPaymentModal()
    }
  }

  // استخراج isLongPress لأنه ليس prop صالح للـ DOM
  const { isLongPress, ...linkHandlers } = longPressHandlers
  const { onClick: longPressOnClick, ...restHandlers } = linkHandlers as {
    onClick?: (e: React.MouseEvent) => void
  }

  const handleNavigate = (e: React.MouseEvent) => {
    if (isLongPress()) return

    if (item.titleKey === "cashBox" && onOpenPaymentModal) {
      e.preventDefault()
      onOpenPaymentModal()
      return
    }

    if (item.href && item.href !== "#") {
      e.preventDefault()
      router.push(item.href)
    }
  }

  const commonClasses = cn(
    "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:text-foreground",
    collapsed && "justify-center"
  )

  const content = (
    <>
      <item.icon 
        className={cn(
          "h-6 w-6 transition-colors",
          collapsed && "h-5 w-5",
          isActive ? "theme-icon-hover" : "theme-icon"
        )} 
      />
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{title}</span>
          {item.badge && (
            <Badge variant="secondary">
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </>
  )

  const linkElement = inProceduresGroup ? (
    <button
      type="button"
      className={commonClasses}
      title={collapsed ? title : undefined}
      {...restHandlers}
      onClick={(e) => {
        longPressOnClick?.(e)
        handleNavigate(e)
      }}
    >
      {content}
    </button>
  ) : (
    <Link
      href={item.href}
      className={commonClasses}
      title={collapsed ? title : undefined}
    >
      {content}
    </Link>
  )

  if (!inProceduresGroup) {
    return linkElement
  }

  return (
    <div className="relative">
      {linkElement}
      
      {showContextMenu && (
        <div 
          className="absolute left-0 right-0 bottom-full mb-2 z-9999"
          style={{ minWidth: '200px' }}
        >
          <div className="bg-popover text-popover-foreground rounded-md border shadow-md p-1">
            <button
              onClick={handleAddToHome}
              disabled={isInHome}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground",
                isInHome && "opacity-50 cursor-not-allowed"
              )}
            >
              <Plus className="h-4 w-4 ml-2" />
              {t('addToHome', lang)}
            </button>
          </div>
        </div>
      )}
      
      {showContextMenu && (
        <div 
          className="fixed inset-0 z-9998 bg-black/20" 
          onClick={() => setShowContextMenu(false)}
        />
      )}
    </div>
  )
}

function NavGroup({ group, collapsed, lang, onOpenPaymentModal }: { group: NavGroup; collapsed?: boolean; lang: string; onOpenPaymentModal?: () => void }) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`sidebar-group-${group.titleKey}`)
      return saved !== null ? JSON.parse(saved) : false
    }
    return false
  })
  const pathname = usePathname()
  const isActive = group.items.some((item) => pathname === item.href)
  const title = t(group.titleKey, lang)
  const inProceduresGroup = group.titleKey === "procedures"

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`sidebar-group-${group.titleKey}`, JSON.stringify(isOpen))
    }
  }, [isOpen, group.titleKey])

  if (collapsed) {
    const firstItem = group.items[0]
    return <NavLink item={firstItem} collapsed={collapsed} lang={lang} inProceduresGroup={inProceduresGroup} onOpenPaymentModal={onOpenPaymentModal} />
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
        {isOpen ? (
          <ChevronDown className="h-4 w-4 theme-icon" />
        ) : (
          <ChevronRight className="h-4 w-4 theme-icon" />
        )}
        <span className="text-left flex-1">{title}</span>
      </Button>
      {isOpen && (
        <div className="space-y-1 pl-6">
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} collapsed={false} lang={lang} inProceduresGroup={inProceduresGroup} onOpenPaymentModal={onOpenPaymentModal} />
          ))}
        </div>
      )}
    </div>
  )
}

function getGreeting(fullName?: string, lang: string = 'ar') {
  const hour = new Date().getHours()
  const name = fullName ?? ''
  
  if (hour < 12) {
    if (lang === 'ku') return `${t('goodMorning', lang)} ${name}`.trim()
    if (lang === 'en') return `${t('goodMorning', lang)} ${name}`.trim()
    return `${t('goodMorning', lang)} يا ${name}`.trim()
  } else if (hour < 17) {
    if (lang === 'ku') return `${t('goodAfternoon', lang)} ${name}`.trim()
    if (lang === 'en') return `${t('goodAfternoon', lang)} ${name}`.trim()
    return `${t('goodAfternoon', lang)} يا ${name}`.trim()
  } else {
    if (lang === 'ku') return `${t('goodEvening', lang)} ${name}`.trim()
    if (lang === 'en') return `${t('goodEvening', lang)} ${name}`.trim()
    return `${t('goodEvening', lang)} يا ${name}`.trim()
  }
}

export default function Sidebar() {
  const { currentUser, logout } = useAuth()
  const {
    mainSidebarWidth,
    setMainSidebarWidth,
    mainSidebarCollapsed,
    setMainSidebarCollapsed,
    currentLanguage,
  } = useSettings()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [sidebarControlOpen, setSidebarControlOpen] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  
  const [expandOnHover, setExpandOnHover] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarExpandOnHover')
      return saved === 'true'
    }
    return false
  })

  const greeting = getGreeting(currentUser?.full_name, currentLanguage.code)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarExpandOnHover', expandOnHover.toString())
    }
  }, [expandOnHover])

  useEffect(() => {
    const isCollapsed = expandOnHover ? (mainSidebarCollapsed && !isHovering) : mainSidebarCollapsed
    const width = isCollapsed ? 80 : mainSidebarWidth
    document.documentElement.style.setProperty("--sidebar-width", `${width}px`)
  }, [mainSidebarWidth, mainSidebarCollapsed, expandOnHover, isHovering])

  const effectiveCollapsed = expandOnHover ? !isHovering : mainSidebarCollapsed

  return (
    <ResizableSidebar
      defaultWidth={mainSidebarWidth}
      minWidth={200}
      maxWidth={500}
      collapsed={effectiveCollapsed}
      onWidthChange={setMainSidebarWidth}
      className="fixed left-0 top-0 z-40 h-screen border-r bg-background"
      side="left"
      onMouseEnter={() => expandOnHover && setIsHovering(true)}
      onMouseLeave={() => expandOnHover && setIsHovering(false)}
    >
      <div className="flex h-full flex-col">
        {}
        <div className="flex h-14 items-center justify-between border-b px-4">
          {!effectiveCollapsed && (
            <h2 className="text-lg font-semibold">{t('menu', currentLanguage.code) || 'القائمة'}</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setMainSidebarCollapsed(!mainSidebarCollapsed)
              if (expandOnHover) setExpandOnHover(false)
            }}
            className="transition-transform hover:scale-110"
          >
            {effectiveCollapsed ? (
              <PanelLeftOpen className="h-5 w-5 theme-icon" />
            ) : (
              <PanelLeftClose className="h-5 w-5 theme-icon" />
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {!effectiveCollapsed && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-1">
                {greeting}
              </h2>
             
            </div>
          )}
          <nav className="space-y-2">
            {navigationConfig.map((item, index) => {
              // إخفاء زر المستخدمين والصلاحيات للمحاسب والموظف العادي
              if ('href' in item && item.titleKey === 'usersAndPermissions') {
                if (currentUser?.permission_type !== 'مدير') {
                  return null
                }
              }

              // تطبيق الصلاحيات للمحاسب والموظف (كلاهما يملكان نفس الصلاحيات الأساسية الأربعة)
              if (currentUser?.permission_type === 'محاسب' || currentUser?.permission_type === 'موظف') {
                // إخفاء/عرض الأشخاص بناءً على الصلاحية
                if ('href' in item && item.titleKey === 'people') {
                  if (!currentUser.permissions?.view_people) {
                    return null
                  }
                }
                
                // إخفاء/عرض الإحصائيات بناءً على الصلاحية
                if ('items' in item && item.titleKey === 'statistics') {
                  if (!currentUser.permissions?.view_statistics) {
                    return null
                  }
                }
                
                // إخفاء/عرض الأرصدة والأرباح بناءً على صلاحية الإحصائيات
                if ('items' in item && item.titleKey === 'balancesAndProfits') {
                  if (!currentUser.permissions?.view_statistics) {
                    return null
                  }
                }
                
                // إخفاء/عرض الخدمات بناءً على الصلاحية
                if ('items' in item && item.titleKey === 'services') {
                  if (!currentUser.permissions?.view_services) {
                    return null
                  }
                }
              }

              if ("items" in item) {
                return <NavGroup key={index} group={item} collapsed={effectiveCollapsed} lang={currentLanguage.code} onOpenPaymentModal={() => setPaymentModalOpen(true)} />
              }
              return <NavLink key={item.href} item={item} collapsed={effectiveCollapsed} lang={currentLanguage.code} onOpenPaymentModal={() => setPaymentModalOpen(true)} />
            })}
          </nav>
        </div>

        {}
        <div className="border-t p-4 space-y-2">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 theme-danger hover:bg-red-50 dark:hover:bg-red-950",
              effectiveCollapsed && "justify-center"
            )}
            onClick={() => setLogoutDialogOpen(true)}
            title={effectiveCollapsed ? t('logout', currentLanguage.code) : undefined}
          >
            {!effectiveCollapsed && (
              <span className="flex-1 text-right">{t('logout', currentLanguage.code)}</span>
            )}
            <LogOut className={cn("h-4 w-4 theme-danger", effectiveCollapsed && "h-6 w-6")} />
          </Button>

          {!effectiveCollapsed && (
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setSidebarControlOpen(!sidebarControlOpen)}
              >
                <PanelLeftOpen className="h-3 w-3 theme-icon" />
              </Button>

              {}
              {sidebarControlOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setSidebarControlOpen(false)}
                  />
                  <div className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-popover border rounded-lg shadow-lg p-2">
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setMainSidebarCollapsed(false)
                          setExpandOnHover(false)
                          setSidebarControlOpen(false)
                        }}
                        className={cn(
                          "w-full text-right px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2",
                          !mainSidebarCollapsed && !expandOnHover ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                        )}
                      >
                        <div className={cn("w-1.5 h-1.5 rounded-full", !mainSidebarCollapsed && !expandOnHover && "bg-current")} />
                        {t('expanded', currentLanguage.code)}
                      </button>
                      <button
                        onClick={() => {
                          setMainSidebarCollapsed(true)
                          setExpandOnHover(false)
                          setSidebarControlOpen(false)
                        }}
                        className={cn(
                          "w-full text-right px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2",
                          mainSidebarCollapsed && !expandOnHover ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                        )}
                      >
                        <div className={cn("w-1.5 h-1.5 rounded-full", mainSidebarCollapsed && !expandOnHover && "bg-current")} />
                        {t('collapsed', currentLanguage.code)}
                      </button>
                      <button
                        onClick={() => {
                          setMainSidebarCollapsed(true)
                          setExpandOnHover(true)
                          setSidebarControlOpen(false)
                        }}
                        className={cn(
                          "w-full text-right px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors flex items-center gap-2",
                          expandOnHover && "bg-accent text-accent-foreground"
                        )}
                      >
                        <div className={cn("w-1.5 h-1.5 rounded-full", expandOnHover && "bg-current")} />
                        {t('expandOnHover', currentLanguage.code)}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {}
        <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('confirmLogout', currentLanguage.code)}</DialogTitle>
              <DialogDescription>
                {t('confirmLogoutMessage', currentLanguage.code)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setLogoutDialogOpen(false)}
              >
                {t('cancel', currentLanguage.code)}
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  setLogoutDialogOpen(false)
                  await logout()
                }}
              >
                {t('logout', currentLanguage.code)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {}
        <PaymentModal 
          open={paymentModalOpen} 
          onOpenChange={setPaymentModalOpen}
        />
      </div>
    </ResizableSidebar>
  )
}
