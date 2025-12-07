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
        // المستخدم غير مسجل دخول ويحاول الوصول لصفحة محمية
        router.replace("/login")
      } else if (user && pathname === "/login") {
        // المستخدم مسجل دخول ويحاول الوصول لصفحة تسجيل الدخول
        router.replace("/home")
      }
    }
  }, [user, loading, pathname, router])

  // عرض شاشة تحميل أثناء التحقق
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

  // السماح بعرض المحتوى إذا كان المستخدم في المكان الصحيح
  const isPublicRoute = publicRoutes.includes(pathname)
  if (!user && !isPublicRoute) {
    return null // سيتم إعادة التوجيه في useEffect
  }

  return <>{children}</>
}
