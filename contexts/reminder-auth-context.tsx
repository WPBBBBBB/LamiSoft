"use client"
import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

interface ReminderUser {
  id: string
  full_name: string
  username: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ReminderAuthContextType {
  user: ReminderUser | null
  loading: boolean
  logout: () => Promise<void>
}

const ReminderAuthContext = createContext<ReminderAuthContextType | undefined>(undefined)

export function ReminderAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ReminderUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      // فقط للصفحات التي تبدأ بـ /reminder ولا تشمل صفحة تسجيل الدخول
      if (!pathname?.startsWith("/reminder") || pathname === "/reminder-login") {
        setLoading(false)
        return
      }

      const sessionToken = localStorage.getItem("reminder_session_token") || sessionStorage.getItem("reminder_session_token")
      
      if (!sessionToken) {
        setUser(null)
        setLoading(false)
        if (pathname !== "/reminder-login") {
          router.push("/reminder-login")
        }
        return
      }

      try {
        const response = await fetch("/api/reminder-auth/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionToken }),
        })

        if (!response.ok) {
          localStorage.removeItem("reminder_session_token")
          sessionStorage.removeItem("reminder_session_token")
          setUser(null)
          setLoading(false)
          if (pathname !== "/reminder-login") {
            router.push("/reminder-login")
          }
          return
        }

        const data = await response.json()
        setUser(data.user)
        setLoading(false)
      } catch (error) {
        console.error("Auth verification error:", error)
        localStorage.removeItem("reminder_session_token")
        sessionStorage.removeItem("reminder_session_token")
        setUser(null)
        setLoading(false)
        if (pathname !== "/reminder-login") {
          router.push("/reminder-login")
        }
      }
    }

    checkAuth()
  }, [pathname, router])

  const logout = async () => {
    const sessionToken = localStorage.getItem("reminder_session_token") || sessionStorage.getItem("reminder_session_token")
    if (sessionToken) {
      try {
        await fetch("/api/reminder-auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionToken }),
        })
      } catch (error) {
        console.error("Logout error:", error)
      }
      localStorage.removeItem("reminder_session_token")
      sessionStorage.removeItem("reminder_session_token")
    }
    setUser(null)
    router.push("/reminder-login")
  }

  return (
    <ReminderAuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </ReminderAuthContext.Provider>
  )
}

export function useReminderAuth() {
  const context = useContext(ReminderAuthContext)
  if (context === undefined) {
    throw new Error("useReminderAuth must be used within ReminderAuthProvider")
  }
  return context
}
