"use client"

import { ReactNode, useCallback, useEffect, useRef, useState } from "react"
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
  onMouseEnter?: () => void
  onMouseLeave?: () => void
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
  onMouseEnter,
  onMouseLeave,
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const activePointerIdRef = useRef<number | null>(null)

  const stopResizing = useCallback(() => {
    activePointerIdRef.current = null
    setIsResizing(false)
  }, [])

  const resize = useCallback(
    (e: PointerEvent) => {
      if (!isResizing || !sidebarRef.current) return
      if (collapsed) return

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
        if (className?.includes("z-40")) {
          document.documentElement.style.setProperty("--sidebar-width", `${newWidth}px`)
        }
      }
    },
    [className, collapsed, isResizing, maxWidth, minWidth, onWidthChange, side]
  )

  const startResizing = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only start on primary interaction
    if (e.pointerType === "mouse" && e.button !== 0) return
    if (!e.isPrimary) return

    e.preventDefault()
    e.stopPropagation()

    activePointerIdRef.current = e.pointerId
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Some browsers may throw if capture isn't available; safe to ignore.
    }

    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("pointermove", resize)
      window.addEventListener("pointerup", stopResizing)
      window.addEventListener("pointercancel", stopResizing)
      document.body.style.cursor = "ew-resize"
      document.body.style.userSelect = "none"
      document.body.style.touchAction = "none"
      document.documentElement.style.touchAction = "none"
    } else {
      window.removeEventListener("pointermove", resize)
      window.removeEventListener("pointerup", stopResizing)
      window.removeEventListener("pointercancel", stopResizing)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      document.body.style.touchAction = ""
      document.documentElement.style.touchAction = ""
    }

    return () => {
      window.removeEventListener("pointermove", resize)
      window.removeEventListener("pointerup", stopResizing)
      window.removeEventListener("pointercancel", stopResizing)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      document.body.style.touchAction = ""
      document.documentElement.style.touchAction = ""
    }
  }, [isResizing, resize, stopResizing])

  return (
    <div
      ref={sidebarRef}
      className={cn("relative", className)}
      style={{ width: `${collapsed ? 80 : width}px`, transition: isResizing ? "none" : "width 0.2s ease" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
      
      {!collapsed && (
        <div
          className={cn(
            "absolute top-0 w-1 h-full cursor-ew-resize touch-none select-none group hover:bg-primary/20 transition-colors",
            side === "left" ? "right-0" : "left-0"
          )}
          onPointerDown={startResizing}
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
