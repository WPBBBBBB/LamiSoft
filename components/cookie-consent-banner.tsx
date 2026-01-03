"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getCookieConsent, setCookieConsent } from "@/lib/cookie-utils"

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(() => getCookieConsent() === null)

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-9998 p-4">
      <div className="container mx-auto">
        <Card className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              نستخدم كوكيز ضرورية لتسجيل الدخول وتشغيل الموقع. وبموافقتك سنحفظ أيضاً تفضيلات الثيم ونوع الخط على هذا الجهاز.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCookieConsent("rejected")
                  setVisible(false)
                }}
              >
                رفض
              </Button>
              <Button
                onClick={() => {
                  setCookieConsent("accepted")
                  setVisible(false)
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
