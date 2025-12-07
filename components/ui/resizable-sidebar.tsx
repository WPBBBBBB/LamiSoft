"use client"

import { ReactNode, useRef, useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ResizableSidebarProps {
  children: ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  collapsed?: boolean
  onWidthChange?: (width: number) => void
  className?: string
  side?: "left" | "right"
}

export function ResizableSidebar({
  children,
  defaultWidth = 288,
  minWidth = 200,
  maxWidth = 600,
  collapsed = false,
  onWidthChange,
  className,
  side = "left",
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setWidth(collapsed ? 80 : defaultWidth)
  }, [collapsed, defaultWidth])

  const startResizing = () => {
    setIsResizing(true)
  }

  const stopResizing = () => {
    setIsResizing(false)
  }

  const resize = (e: MouseEvent) => {
    if (isResizing && sidebarRef.current) {
      const sidebarRect = sidebarRef.current.getBoundingClientRect()
      let newWidth: number
      
      if (side === "left") {
        newWidth = e.clientX - sidebarRect.left
      } else {
        newWidth = sidebarRect.right - e.clientX
      }

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth)
        onWidthChange?.(newWidth)
        // Update CSS variable for main sidebar
        if (className?.includes("z-40")) {
          document.documentElement.style.setProperty("--sidebar-width", `${newWidth}px`)
        }
      }
    }
  }

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize)
      window.addEventListener("mouseup", stopResizing)
      document.body.style.cursor = "ew-resize"
      document.body.style.userSelect = "none"
    } else {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    return () => {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isResizing])

  return (
    <div
      ref={sidebarRef}
      className={cn("relative", className)}
      style={{ width: `${width}px`, transition: isResizing ? "none" : "width 0.2s ease" }}
    >
      {children}
      
      {!collapsed && (
        <div
          className={cn(
            "absolute top-0 w-1 h-full cursor-ew-resize group hover:bg-primary/20 transition-colors",
            side === "left" ? "right-0" : "left-0"
          )}
          onMouseDown={startResizing}
        >
          <div className="absolute inset-y-0 -inset-x-2" />
          <div className="absolute top-1/2 -translate-y-1/2 w-1 h-20 bg-border group-hover:bg-primary rounded-full transition-colors" 
            style={{ [side === "left" ? "right" : "left"]: 0 }}
          />
        </div>
      )}
    </div>
  )
}
