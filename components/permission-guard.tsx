"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface PermissionGuardProps {
  children: React.ReactNode
  requiredPermission?: string
  requiredRole?: 'مدير' | 'محاسب' | 'موظف'
  allowedRoles?: ('مدير' | 'محاسب' | 'موظف')[]
}

export function PermissionGuard({ 
  children, 
  requiredPermission,
  requiredRole,
  allowedRoles
}: PermissionGuardProps) {
  const router = useRouter()
  const { currentUser, isLoading } = useAuth()

  const checkAccess = (): boolean => {
    if (!currentUser) return false

    if (currentUser.permission_type === 'مدير') return true

    if (requiredRole) {
      return currentUser.permission_type === requiredRole
    }

    if (allowedRoles && allowedRoles.length > 0) {
      return allowedRoles.includes(currentUser.permission_type)
    }

    if (requiredPermission) {
      if (!currentUser.permissions) return false
      return currentUser.permissions[requiredPermission as keyof typeof currentUser.permissions] === true
    }

    return true
  }

  useEffect(() => {
    if (!isLoading && !checkAccess()) {
      toast.error("ليس لديك صلاحية للوصول إلى هذه الصفحة")
      router.replace("/home")
    }
  }, [currentUser, isLoading, requiredPermission, requiredRole, allowedRoles, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    )
  }

  if (!checkAccess()) {
    return null
  }

  return <>{children}</>
}
