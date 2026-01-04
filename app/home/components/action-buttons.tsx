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
  FileText,
} from "lucide-react"
import { PaymentModal } from "@/components/modals/payment-modal"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { usePermissions } from "@/lib/hooks"

const buttonGroups = [
  {
    titleKey: "mainOperations",
    buttons: [
      { labelKey: "addSale", icon: TrendingUp, variant: "default" as const },
      { labelKey: "addPurchase", icon: ShoppingCart, variant: "default" as const },
      { labelKey: "cashBox", icon: Wallet, variant: "default" as const },
    ],
  },
  {
    titleKey: "inventoryManagement",
    buttons: [
      { labelKey: "stores", icon: Warehouse, variant: "secondary" as const },
      { labelKey: "storeTransfer", icon: PackageOpen, variant: "secondary" as const },
    ],
  },
  {
    titleKey: "reports",
    buttons: [
      { labelKey: "reportsAndStatements", icon: FileText, variant: "outline" as const },
    ],
  },
]

export function ActionButtons() {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const { currentLanguage } = useSettings()
  const { 
    isAdmin, 
    isAccountant, 
    isEmployee, 
    hasPermission 
  } = usePermissions()

  // التحقق من صلاحيات الموظف
  const canViewStores = isAdmin || isAccountant || (isEmployee && hasPermission('view_stores'))
  const canAddPurchase = isAdmin || isAccountant || (isEmployee && hasPermission('add_purchase'))
  const canViewStoreTransfer = isAdmin || isAccountant || (isEmployee && hasPermission('view_store_transfer'))

  return (
    <>
      <div className="space-y-6">
        {buttonGroups.map((group, idx) => {
          // إخفاء قسم إدارة المخزون إذا لم يكن هناك أزرار تحته
          if (group.titleKey === "inventoryManagement") {
            const hasStoresButton = canViewStores
            const hasTransferButton = canViewStoreTransfer
            
            // إذا لم يكن هناك أي زر متاح، لا تعرض القسم
            if (!hasStoresButton && !hasTransferButton) {
              return null
            }
          }

          return (
          <div key={idx} className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground">{t(group.titleKey, currentLanguage.code)}</h3>
            <div className="space-y-3">
              {group.buttons.map((button, btnIdx) => {
                if (button.labelKey === "addSale") {
                  return (
                    <Link key={btnIdx} href="/sales/add">
                      <Button
                        variant={button.variant}
                        className="w-full justify-start gap-3 h-11 mb-3"
                      >
                        <button.icon className="h-5 w-5 theme-success" />
                        <span className="font-medium">{t(button.labelKey, currentLanguage.code)}</span>
                      </Button>
                    </Link>
                  )
                }

                if (button.labelKey === "addPurchase") {
                  // عرض زر إضافة شراء للمدير والمحاسب والموظف العادي الذي لديه الصلاحية
                  if (canAddPurchase) {
                    return (
                      <Link key={btnIdx} href="/purchases/add">
                        <Button
                          variant={button.variant}
                          className="w-full justify-start gap-3 h-11 mb-3"
                        >
                          <button.icon className="h-5 w-5 theme-danger" />
                          <span className="font-medium">{t(button.labelKey, currentLanguage.code)}</span>
                        </Button>
                      </Link>
                    )
                  }
                  return null
                }

                if (button.labelKey === "cashBox") {
                  return (
                    <Button
                      key={btnIdx}
                      variant={button.variant}
                      className="w-full justify-start gap-3 h-11"
                      onClick={() => setPaymentModalOpen(true)}
                    >
                      <button.icon className="h-5 w-5 theme-warning" />
                      <span className="font-medium">{t(button.labelKey, currentLanguage.code)}</span>
                    </Button>
                  )
                }

                if (button.labelKey === "stores") {
                  // إخفاء زر المخازن للموظف العادي إذا لم تكن لديه الصلاحية
                  if (!canViewStores) {
                    return null
                  }
                  return (
                    <Link key={btnIdx} href="/stores">
                      <Button
                        variant={button.variant}
                        className="w-full justify-start gap-3 h-11 mb-2"
                      >
                        <button.icon className="h-5 w-5 theme-info" />
                        <span className="font-medium">{t(button.labelKey, currentLanguage.code)}</span>
                      </Button>
                    </Link>
                  )
                }

                if (button.labelKey === "storeTransfer") {
                  // إخفاء زر النقل المخزني للموظف العادي إذا لم تكن لديه الصلاحية
                  if (!canViewStoreTransfer) {
                    return null
                  }
                  return (
                    <Link key={btnIdx} href="/store-transfer">
                      <Button
                        variant={button.variant}
                        className="w-full justify-start gap-3 h-11"
                      >
                        <button.icon className="h-5 w-5 theme-warning" />
                        <span className="font-medium">{t(button.labelKey, currentLanguage.code)}</span>
                      </Button>
                    </Link>
                  )
                }

                if (button.labelKey === "reportsAndStatements") {
                  return (
                    <Link key={btnIdx} href="/reports">
                      <Button
                        variant={button.variant}
                        className="w-full justify-start gap-3 h-11"
                      >
                        <button.icon className="h-5 w-5 theme-info" />
                        <span className="font-medium">{t(button.labelKey, currentLanguage.code)}</span>
                      </Button>
                    </Link>
                  )
                }
                
                // Default - shouldn't reach here
                return null
              })}
            </div>
          </div>
          )
        })}
      </div>

      <PaymentModal 
        open={paymentModalOpen} 
        onOpenChange={setPaymentModalOpen}
      />
    </>
  )
}
