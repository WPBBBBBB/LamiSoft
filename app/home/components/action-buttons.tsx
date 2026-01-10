"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import {
  ShoppingCart,
  TrendingUp,
  Wallet,
  PackageOpen,
  Warehouse,
  FileText,
  ClipboardList,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react"
import { PaymentModal } from "@/components/modals/payment-modal"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { usePermissions, useLongPress } from "@/lib/hooks"
import { useCustomButtons } from "@/contexts/custom-buttons-context"
import type { CustomButton } from "@/contexts/custom-buttons-context"

// خريطة الأيقونات
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  ShoppingCart,
  Wallet,
  ClipboardList,
  PackageOpen,
  Warehouse,
  FileText,
}

// Component منفصل لكل زر مخصص
function CustomButtonItem({ 
  button, 
  index, 
  totalButtons,
  onMoveUp, 
  onMoveDown, 
  onRemove,
  onOpenPaymentModal 
}: { 
  button: CustomButton
  index: number
  totalButtons: number
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onRemove: (id: string) => void
  onOpenPaymentModal: () => void
}) {
  const { currentLanguage } = useSettings()
  const router = useRouter()
  const [contextMenuOpen, setContextMenuOpen] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)
  
  const IconComponent = iconMap[button.icon]
  
  const handleLongPress = () => {
    setContextMenuOpen(true)
  }
  
  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
    delay: 1000,
  })

  // استخراج isLongPress لأنه ليس prop صالح للـ DOM elements
  const { isLongPress, ...domHandlers } = longPressHandlers
  const { onClick: longPressOnClick, ...restDomHandlers } = domHandlers as {
    onClick?: (e: React.MouseEvent) => void
  }

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPress()) return

    // للأزرار بدون href (مثل الصندوق)
    if (button.id === "cashBox") {
      e.preventDefault()
      onOpenPaymentModal()
      return
    }

    if (button.href) {
      e.preventDefault()
      router.push(button.href)
    }
  }

  const buttonContent = (
    <>
      <IconComponent className={`h-5 w-5 ${button.colorClass || ""}`} />
      <span className="font-medium">{t(button.labelKey, currentLanguage.code)}</span>
    </>
  )

  return (
    <div ref={buttonRef} className="relative">
      <Button
        variant={button.variant || "default"}
        className="w-full justify-start gap-3 h-11 mb-3 relative"
        {...restDomHandlers}
        onClick={(e) => {
          longPressOnClick?.(e)
          handleClick(e)
        }}
      >
        {buttonContent}
      </Button>
      
      {contextMenuOpen && (
        <div 
          className="absolute left-0 right-0 bottom-full mb-2 z-50 w-full"
          style={{ minWidth: '224px' }}
        >
          <div className="bg-popover text-popover-foreground rounded-md border shadow-md p-1">
            {index > 0 && (
              <button
                onClick={() => {
                  onMoveUp(button.id)
                  setContextMenuOpen(false)
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                <ChevronUp className="h-4 w-4 ml-2" />
                {t('moveUp', currentLanguage.code)}
              </button>
            )}
            {index < totalButtons - 1 && (
              <button
                onClick={() => {
                  onMoveDown(button.id)
                  setContextMenuOpen(false)
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                <ChevronDown className="h-4 w-4 ml-2" />
                {t('moveDown', currentLanguage.code)}
              </button>
            )}
            <button
              onClick={() => {
                onRemove(button.id)
                setContextMenuOpen(false)
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-red-600"
            >
              <X className="h-4 w-4 ml-2" />
              {t('removeFromHome', currentLanguage.code)}
            </button>
          </div>
        </div>
      )}
      
      {contextMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setContextMenuOpen(false)}
        />
      )}
    </div>
  )
}

const buttonGroups = [
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
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const { 
    isAdmin, 
    isAccountant, 
    isEmployee, 
    hasPermission 
  } = usePermissions()
  const { 
    homeButtons, 
    removeHomeButton, 
    moveHomeButtonUp, 
    moveHomeButtonDown 
  } = useCustomButtons()

  // التحقق من صلاحيات الموظف
  const canViewStores = isAdmin || isAccountant || (isEmployee && hasPermission('view_stores'))
  const canAddPurchase = isAdmin || isAccountant || (isEmployee && hasPermission('add_purchase'))
  const canViewStoreTransfer = isAdmin || isAccountant || (isEmployee && hasPermission('view_store_transfer'))

  return (
    <>
      <div className="space-y-6">
        {/* العمليات الأساسية - الأزرار المخصصة */}
        {homeButtons.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground">
              {t('mainOperations', currentLanguage.code)}
            </h3>
            <div className="space-y-3">
              {homeButtons
                .sort((a, b) => a.order - b.order)
                .map((button, index) => {
                  // التحقق من الصلاحيات
                  if (button.id === "addPurchase" && !canAddPurchase) {
                    return null
                  }
                  return (
                    <CustomButtonItem
                      key={button.id}
                      button={button}
                      index={index}
                      totalButtons={homeButtons.length}
                      onMoveUp={moveHomeButtonUp}
                      onMoveDown={moveHomeButtonDown}
                      onRemove={removeHomeButton}
                      onOpenPaymentModal={() => setPaymentModalOpen(true)}
                    />
                  )
                })}
            </div>
          </div>
        )}

        {/* باقي الأقسام */}
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
                if (button.labelKey === "stores") {
                  // إخفاء زر المخازن للموظف العادي إذا لم تكن لديه الصلاحية
                  if (!canViewStores) {
                    return null
                  }
                  return (
                    <Button
                      key={btnIdx}
                      variant={button.variant}
                      className="w-full justify-start gap-3 h-11 mb-2"
                      onClick={() => router.push("/stores")}
                    >
                      <button.icon className="h-5 w-5 theme-info" />
                      <span className="font-medium">{t(button.labelKey, currentLanguage.code)}</span>
                    </Button>
                  )
                }

                if (button.labelKey === "storeTransfer") {
                  // إخفاء زر النقل المخزني للموظف العادي إذا لم تكن لديه الصلاحية
                  if (!canViewStoreTransfer) {
                    return null
                  }
                  return (
                    <Button
                      key={btnIdx}
                      variant={button.variant}
                      className="w-full justify-start gap-3 h-11"
                      onClick={() => router.push("/store-transfer")}
                    >
                      <button.icon className="h-5 w-5 theme-warning" />
                      <span className="font-medium">{t(button.labelKey, currentLanguage.code)}</span>
                    </Button>
                  )
                }

                if (button.labelKey === "reportsAndStatements") {
                  return (
                    <Button
                      key={btnIdx}
                      variant={button.variant}
                      className="w-full justify-start gap-3 h-11"
                      onClick={() => router.push("/reports")}
                    >
                      <button.icon className="h-5 w-5 theme-info" />
                      <span className="font-medium">{t(button.labelKey, currentLanguage.code)}</span>
                    </Button>
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
