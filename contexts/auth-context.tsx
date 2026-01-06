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
  logout: () => Promise<void>
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
        } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = (user: UserWithPermissions) => {
    setCurrentUser(user)
  }

  const logout = async () => {
    try {
      // Clear user state first
      setCurrentUser(null)
      
      // Wait for server to clear the session cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        keepalive: true,
      })
      
      // Clear any client-side storage
      if (typeof window !== 'undefined') {
        // Clear localStorage if any auth data is stored
        Object.keys(localStorage).forEach(key => {
          if (key.includes('auth') || key.includes('user') || key.includes('session')) {
            localStorage.removeItem(key)
          }
        })
      }
      
      // Redirect to login page
      router.replace('/login')
      
      // Force a hard reload to clear any cached state
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.assign('/login')
        }
      }, 100)
    } catch (error) {
      // Even if logout API fails, still redirect to login
      router.replace('/login')
    }
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
