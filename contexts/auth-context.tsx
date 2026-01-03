"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { UserWithPermissions } from '@/lib/users-operations'

interface AuthContextType {
  user: UserWithPermissions | null
  currentUser: UserWithPermissions | null
  loading: boolean
  isLoading: boolean
  login: (user: UserWithPermissions) => void
  logout: () => void
  hasPermission: (permission: string) => boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserWithPermissions | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const isUserWithPermissions = (value: unknown): value is UserWithPermissions => {
    if (!value || typeof value !== 'object') return false
    const record = value as Record<string, unknown>
    return typeof record.id === 'string'
  }

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch(`/api/auth/me`, {
          cache: 'no-store',
        })

        if (!response.ok) return

        const data: unknown = await response.json()
        if (isUserWithPermissions(data)) setCurrentUser(data)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = (user: UserWithPermissions) => {
    setCurrentUser(user)
  }

  const logout = () => {
    setCurrentUser(null)
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/login')
  }

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false
    
    if (currentUser.permission_type === 'مدير') {
      return true
    }
    
    if (currentUser.permissions && permission in currentUser.permissions) {
      return currentUser.permissions[permission as keyof typeof currentUser.permissions] === true
    }
    
    return false
  }

  const isAuthenticated = currentUser !== null

  return (
    <AuthContext.Provider 
      value={{ 
        user: currentUser,
        currentUser, 
        loading: isLoading,
        isLoading, 
        login, 
        logout, 
        hasPermission,
        isAuthenticated 
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
