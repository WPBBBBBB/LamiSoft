"use client"

import { useSyncExternalStore } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getCookieConsent, setCookieConsent } from "@/lib/cookie-utils"

export function CookieConsentBanner() {
  const consent = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {}
      const handler = () => onStoreChange()
      window.addEventListener("storage", handler)
      window.addEventListener("als-cookie-consent", handler as EventListener)
      return () => {
        window.removeEventListener("storage", handler)
        window.removeEventListener("als-cookie-consent", handler as EventListener)
      }
    },
    () => getCookieConsent(),
    () => "accepted"
  )

  const visible = consent === null

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-9998 p-4">
      <div className="container mx-auto">
        <Card className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              نستخدم كوكيز ضرورية لتشغيل الموقع. بالموافقة سنحفظ تفضيلات المظهر ونوع الخط على هذا الجهاز.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCookieConsent("rejected")
                }}
              >
                رفض
              </Button>
              <Button
                onClick={() => {
                  setCookieConsent("accepted")
                }}
              >
                قبول
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
