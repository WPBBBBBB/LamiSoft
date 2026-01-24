"use client";
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function RootPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Wait for auth to complete
    if (isLoading) return

    // User is logged in -> go to home
    if (user) {
      router.replace("/home")
    } else {
      // User is not logged in -> show welcome page
      router.replace("/welcome")
    }
    
    setChecking(false)
  }, [user, isLoading, router])

  if (checking || isLoading) {
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
