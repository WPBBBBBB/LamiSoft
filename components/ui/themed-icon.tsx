"use client"

import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ThemedIconProps {
  icon: LucideIcon
  className?: string
  size?: number
  variant?: "default" | "primary" | "accent" | "success" | "warning" | "danger" | "info"
}

export function ThemedIcon({ 
  icon: Icon, 
  className, 
  size = 20,
  variant = "default" 
}: ThemedIconProps) {
  const variantClass = variant === "default" ? "theme-icon" : `theme-${variant}`
  
  return (
    <Icon 
      size={size} 
      className={cn(variantClass, className)} 
    />
  )
}
