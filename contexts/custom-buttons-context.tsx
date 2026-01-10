"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export interface CustomButton {
  id: string
  labelKey: string
  icon: string // اسم الأيقونة كـ string
  href?: string
  onClick?: () => void
  variant?: "default" | "secondary" | "outline"
  colorClass?: string // theme-success, theme-danger, etc.
  order: number
}

interface CustomButtonsContextType {
  homeButtons: CustomButton[]
  addHomeButton: (button: Omit<CustomButton, "order">) => void
  removeHomeButton: (id: string) => void
  moveHomeButtonUp: (id: string) => void
  moveHomeButtonDown: (id: string) => void
  reorderHomeButtons: (buttons: CustomButton[]) => void
}

const CustomButtonsContext = createContext<CustomButtonsContextType | undefined>(undefined)

function normalizeHomeButtons(buttons: unknown): CustomButton[] {
  if (!Array.isArray(buttons)) return defaultHomeButtons
  return (buttons as CustomButton[])
    .filter((b) => b && typeof b.id === "string" && typeof b.labelKey === "string" && typeof b.icon === "string")
    .map((b, index) => {
      const order = typeof b.order === "number" ? b.order : index
      if (b.id === "cashBox") {
        return { ...b, order, href: undefined }
      }
      return { ...b, order }
    })
}

// الأزرار الافتراضية للصفحة الرئيسية
const defaultHomeButtons: CustomButton[] = [
  {
    id: "addSale",
    labelKey: "addSale",
    icon: "TrendingUp",
    href: "/sales/add",
    variant: "default",
    colorClass: "theme-success",
    order: 0,
  },
  {
    id: "addPurchase",
    labelKey: "addPurchase",
    icon: "ShoppingCart",
    href: "/purchases/add",
    variant: "default",
    colorClass: "theme-danger",
    order: 1,
  },
  {
    id: "cashBox",
    labelKey: "cashBox",
    icon: "Wallet",
    variant: "default",
    colorClass: "theme-warning",
    order: 2,
  },
]

export function CustomButtonsProvider({ children }: { children: ReactNode }) {
  const [homeButtons, setHomeButtons] = useState<CustomButton[]>(() => {
    if (typeof window !== 'undefined') {
      const savedButtons = localStorage.getItem("homeButtons")
      if (savedButtons) {
        try {
          return normalizeHomeButtons(JSON.parse(savedButtons))
        } catch (error) {
          console.error("Error loading home buttons:", error)
        }
      }
    }
    return defaultHomeButtons
  })

  // حفظ الأزرار في localStorage عند تغييرها
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("homeButtons", JSON.stringify(homeButtons))
    }
  }, [homeButtons])

  const addHomeButton = (button: Omit<CustomButton, "order">) => {
    // التحقق من أن الزر ليس موجوداً بالفعل
    if (homeButtons.find((b) => b.id === button.id)) {
      return
    }

    const maxOrder = Math.max(...homeButtons.map((b) => b.order), -1)
    const normalizedButton: Omit<CustomButton, "order"> =
      button.id === "cashBox" ? { ...button, href: undefined } : button

    const newButton: CustomButton = {
      ...normalizedButton,
      order: maxOrder + 1,
    }

    setHomeButtons([...homeButtons, newButton])
  }

  const removeHomeButton = (id: string) => {
    const newButtons = homeButtons.filter((b) => b.id !== id)
    // إعادة ترتيب الأزرار المتبقية
    const reorderedButtons = newButtons.map((b, index) => ({
      ...b,
      order: index,
    }))
    setHomeButtons(reorderedButtons)
  }

  const moveHomeButtonUp = (id: string) => {
    const index = homeButtons.findIndex((b) => b.id === id)
    if (index <= 0) return // لا يمكن تحريك الأول للأعلى

    const newButtons = [...homeButtons]
    const temp = newButtons[index - 1]
    newButtons[index - 1] = newButtons[index]
    newButtons[index] = temp

    // تحديث الـ order
    newButtons[index - 1].order = index - 1
    newButtons[index].order = index

    setHomeButtons(newButtons)
  }

  const moveHomeButtonDown = (id: string) => {
    const index = homeButtons.findIndex((b) => b.id === id)
    if (index < 0 || index >= homeButtons.length - 1) return // لا يمكن تحريك الأخير للأسفل

    const newButtons = [...homeButtons]
    const temp = newButtons[index + 1]
    newButtons[index + 1] = newButtons[index]
    newButtons[index] = temp

    // تحديث الـ order
    newButtons[index].order = index
    newButtons[index + 1].order = index + 1

    setHomeButtons(newButtons)
  }

  const reorderHomeButtons = (buttons: CustomButton[]) => {
    setHomeButtons(buttons)
  }

  return (
    <CustomButtonsContext.Provider
      value={{
        homeButtons,
        addHomeButton,
        removeHomeButton,
        moveHomeButtonUp,
        moveHomeButtonDown,
        reorderHomeButtons,
      }}
    >
      {children}
    </CustomButtonsContext.Provider>
  )
}

export function useCustomButtons() {
  const context = useContext(CustomButtonsContext)
  if (!context) {
    throw new Error("useCustomButtons must be used within CustomButtonsProvider")
  }
  return context
}
