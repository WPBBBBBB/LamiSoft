import { useAuth } from '@/contexts/auth-context'

/**
 * Custom hook للتحقق من صلاحيات المستخدم
 */
export function usePermissions() {
  const { currentUser } = useAuth()

  /**
   * التحقق من صلاحية محددة
   */
  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false
    
    // المدير لديه كل الصلاحيات
    if (currentUser.permission_type === 'مدير') {
      return true
    }
    
    // التحقق من الصلاحية المحددة
    if (currentUser.permissions && permission in currentUser.permissions) {
      return currentUser.permissions[permission as keyof typeof currentUser.permissions] === true
    }
    
    return false
  }

  /**
   * التحقق من نوع الصلاحية
   */
  const isRole = (role: 'مدير' | 'محاسب' | 'موظف'): boolean => {
    return currentUser?.permission_type === role
  }

  /**
   * التحقق من أي من الصلاحيات
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }

  /**
   * التحقق من كل الصلاحيات
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission))
  }

  /**
   * الحصول على قائمة الصلاحيات المفعلة
   */
  const getActivePermissions = (): string[] => {
    if (!currentUser?.permissions) return []
    
    return Object.entries(currentUser.permissions)
      .filter(([_, value]) => value === true)
      .map(([key]) => key)
  }

  return {
    currentUser,
    hasPermission,
    isRole,
    hasAnyPermission,
    hasAllPermissions,
    getActivePermissions,
    isAdmin: isRole('مدير'),
    isAccountant: isRole('محاسب'),
    isEmployee: isRole('موظف'),
  }
}
