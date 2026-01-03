"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function useGlobalKeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      if (e.altKey && e.shiftKey && e.code === 'KeyN') {
        e.preventDefault()
        e.stopPropagation()
        router.push('/customers/add')
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [router])
}

export function GlobalKeyboardShortcuts() {
  useGlobalKeyboardShortcuts()
  return null
}
