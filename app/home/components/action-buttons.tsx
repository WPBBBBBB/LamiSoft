"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  ShoppingCart,
  TrendingUp,
  Wallet,
  PackageOpen,
  Warehouse,
  Users,
  FileText,
} from "lucide-react"
import { PaymentModal } from "@/components/modals/payment-modal"

const buttonGroups = [
  {
    title: "العمليات الأساسية",
    buttons: [
      { label: "إضافة بيع", icon: TrendingUp, variant: "default" as const },
      { label: "إضافة شراء", icon: ShoppingCart, variant: "default" as const },
      { label: "الصندوق", icon: Wallet, variant: "default" as const },
    ],
  },
  {
    title: "إدارة المخزون",
    buttons: [
      { label: "المخازن", icon: Warehouse, variant: "secondary" as const },
      { label: "النقل المخزني", icon: PackageOpen, variant: "secondary" as const },
    ],
  },
  {
    title: "الأشخاص",
    buttons: [
      { label: "الأشخاص", icon: Users, variant: "secondary" as const },
    ],
  },
  {
    title: "التقارير",
    buttons: [
      { label: "التقارير والكشوفات", icon: FileText, variant: "outline" as const },
    ],
  },
]

export function ActionButtons() {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  return (
    <>
      <div className="space-y-6">
        {buttonGroups.map((group, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground">{group.title}</h3>
            <div className="space-y-3">
              {group.buttons.map((button, btnIdx) => {
                // إذا كان الزر "إضافة بيع"، نجعله رابط لصفحة إضافة البيع
                if (button.label === "إضافة بيع") {
                  return (
                    <Link key={btnIdx} href="/sales/add">
                      <Button
                        variant={button.variant}
                        className="w-full justify-start gap-3 h-11 mb-3"
                      >
                        <button.icon className="h-5 w-5" />
                        <span className="font-medium">{button.label}</span>
                      </Button>
                    </Link>
                  )
                }

                // إذا كان الزر "إضافة شراء"، نجعله رابط لصفحة إضافة الشراء
                if (button.label === "إضافة شراء") {
                  return (
                    <Link key={btnIdx} href="/purchases/add">
                      <Button
                        variant={button.variant}
                        className="w-full justify-start gap-3 h-11 mb-3"
                      >
                        <button.icon className="h-5 w-5" />
                        <span className="font-medium">{button.label}</span>
                      </Button>
                    </Link>
                  )
                }

                // إذا كان الزر "الأشخاص"، نجعله رابط لصفحة الأشخاص
                if (button.label === "الأشخاص") {
                  return (
                    <Link key={btnIdx} href="/customers">
                      <Button
                        variant={button.variant}
                        className="w-full justify-start gap-3 h-11"
                      >
                        <button.icon className="h-5 w-5" />
                        <span className="font-medium">{button.label}</span>
                      </Button>
                    </Link>
                  )
                }

                // إذا كان الزر "الصندوق"، نفتح modal الدفع
                if (button.label === "الصندوق") {
                  return (
                    <Button
                      key={btnIdx}
                      variant={button.variant}
                      className="w-full justify-start gap-3 h-11"
                      onClick={() => setPaymentModalOpen(true)}
                    >
                      <button.icon className="h-5 w-5" />
                      <span className="font-medium">{button.label}</span>
                    </Button>
                  )
                }

                // إذا كان الزر "المخازن"، نجعله رابط لصفحة المخازن
                if (button.label === "المخازن") {
                  return (
                    <Link key={btnIdx} href="/stores">
                      <Button
                        variant={button.variant}
                        className="w-full justify-start gap-3 h-11 mb-2"
                      >
                        <button.icon className="h-5 w-5" />
                        <span className="font-medium">{button.label}</span>
                      </Button>
                    </Link>
                  )
                }

                // إذا كان الزر "النقل المخزني"، نجعله رابط لصفحة النقل
                if (button.label === "النقل المخزني") {
                  return (
                    <Link key={btnIdx} href="/store-transfer">
                      <Button
                        variant={button.variant}
                        className="w-full justify-start gap-3 h-11"
                      >
                        <button.icon className="h-5 w-5" />
                        <span className="font-medium">{button.label}</span>
                      </Button>
                    </Link>
                  )
                }
                
                return (
                  <Button
                    key={btnIdx}
                    variant={button.variant}
                    className="w-full justify-start gap-3 h-11"
                    onClick={() => console.log(`${button.label} clicked`)}
                  >
                    <button.icon className="h-5 w-5" />
                    <span className="font-medium">{button.label}</span>
                  </Button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <PaymentModal 
        open={paymentModalOpen} 
        onOpenChange={setPaymentModalOpen}
      />
    </>
  )
}
