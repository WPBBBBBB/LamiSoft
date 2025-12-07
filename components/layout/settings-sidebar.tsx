"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ResizableSidebar } from "@/components/ui/resizable-sidebar"
import { useSettings } from "@/components/providers/settings-provider"
import {
  Palette,
  Languages,
  Type,
  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: any
}

const navigation: NavItem[] = [
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
]

export function SettingsSidebar() {
  const pathname = usePathname()
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
      className="fixed left-0 top-0 z-40 h-screen border-r bg-background"
      side="left"
    >
      <div className="flex h-full flex-col">
        {/* Header */}
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

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navigation.map((item) => {
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
