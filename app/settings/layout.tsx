"use client";
import { SettingsSidebar } from "@/components/layout/settings-sidebar"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  
  return (
    <div className="flex h-full">
      <SettingsSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              size="icon"
              title="رجوع"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
