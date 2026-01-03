"use client"

import { useEffect, useMemo, useState } from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false
    const ua = navigator.userAgent || ""
    return /iphone|ipad|ipod/i.test(ua)
  }, [])

  useEffect(() => {
    const updateInstalledState = () => {
      const standaloneByMedia = window.matchMedia?.("(display-mode: standalone)")?.matches
      const standaloneByIOS = (navigator as unknown as { standalone?: boolean }).standalone
      setIsInstalled(Boolean(standaloneByMedia || standaloneByIOS))
    }

    updateInstalledState()

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const onAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onAppInstalled)
    }
  }, [])

  if (isInstalled) return null

  const canPrompt = Boolean(deferredPrompt)

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice.catch(() => null)
      setDeferredPrompt(null)
      return
    }

    if (isIOS) {
      toast.message("لتثبيت التطبيق على iPhone/iPad:", {
        description: "افتح زر المشاركة (Share) ثم اختر Add to Home Screen",
      })
      return
    }

    toast.message("التثبيت غير متاح الآن", {
      description: "تأكد من فتح الموقع عبر HTTPS أو من متصفح يدعم التثبيت.",
    })
  }

  return (
    <Button
      variant={canPrompt ? "default" : "outline"}
      size="sm"
      onClick={handleInstall}
      className="h-10"
    >
      <Download className="h-4 w-4 ml-2" />
      تثبيت التطبيق
    </Button>
  )
}
