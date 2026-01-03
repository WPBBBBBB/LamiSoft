"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

interface ProtectedRouteProps {
  children: React.ReactNode
}

const publicRoutes = ["/login", "/forgot-password"]

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      const isPublicRoute = publicRoutes.includes(pathname)
      
      if (!user && !isPublicRoute) {
        router.replace("/login")
      } else if (user && pathname === "/login") {
        router.replace("/home")
      }
    }
  }, [user, loading, pathname, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  const isPublicRoute = publicRoutes.includes(pathname)
  if (!user && !isPublicRoute) {
    return null
  }

  return <>{children}</>
}
