"use client";
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function RootPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [checkingWelcome, setCheckingWelcome] = useState(true)

  useEffect(() => {
    // Wait for auth to complete
    if (isLoading) return

    try {
      // Only show welcome if user is NOT logged in AND hasn't seen it before
      const seenWelcome = typeof window !== "undefined" && localStorage.getItem("al_lamisoft_seen_welcome")
      
      if (!user && !seenWelcome) {
        // First-time visitor, not logged in -> show welcome
        if (typeof window !== "undefined") {
          localStorage.setItem("al_lamisoft_seen_welcome", "1")
        }
        router.replace("/welcome")
        setCheckingWelcome(false)
        return
      }
    } catch (e) {
      // ignore localStorage errors (e.g., Safari private mode)
    }

    // User is logged in -> go to home
    if (user) {
      router.replace("/home")
    } else {
      // User is not logged in but has seen welcome -> go to login
      router.replace("/login")
    }
    
    setCheckingWelcome(false)
  }, [user, isLoading, router])

  if (checkingWelcome || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return null
}
