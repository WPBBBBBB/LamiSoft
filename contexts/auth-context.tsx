"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { UserWithPermissions } from '@/lib/users-operations'

interface AuthContextType {
  user: UserWithPermissions | null
  currentUser: UserWithPermissions | null
  loading: boolean
  isLoading: boolean
  login: (user: UserWithPermissions, rememberMe: boolean) => void
  logout: () => void
  hasPermission: (permission: string) => boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserWithPermissions | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadUser = () => {
      try {
        const savedUser = localStorage.getItem('currentUser')
        const rememberMe = localStorage.getItem('rememberMe') === 'true'
        
        if (savedUser && rememberMe) {
          setCurrentUser(JSON.parse(savedUser))
        }
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = (user: UserWithPermissions, rememberMe: boolean) => {
    setCurrentUser(user)
    
    if (rememberMe) {
      localStorage.setItem('currentUser', JSON.stringify(user))
      localStorage.setItem('rememberMe', 'true')
    } else {
      sessionStorage.setItem('currentUser', JSON.stringify(user))
      localStorage.removeItem('rememberMe')
    }
  }

  const logout = () => {
    setCurrentUser(null)
    localStorage.removeItem('currentUser')
    localStorage.removeItem('rememberMe')
    sessionStorage.removeItem('currentUser')
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
