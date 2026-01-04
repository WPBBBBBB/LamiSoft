"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowRight,
  Plus,
  Trash2,
  Calendar,
  Loader2,
  Save,
  RefreshCw,
} from "lucide-react"
import { PermissionGuard } from "@/components/permission-guard"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { getActiveStores, type Store } from "@/lib/stores-operations"
import {
  getSuppliers,
  createPurchase,
  updatePurchase,
  getPurchaseById,
  getPurchaseDetails,
  checkProductsPriceConflicts,
  type Supplier,
  type PurchaseProductDetail,
} from "@/lib/purchase-operations"
import { logAction } from "@/lib/system-log-operations"
import { getCurrentExchangeRate } from "@/lib/exchange-rate-operations"

interface ProductRow extends PurchaseProductDetail {
  tempId: string
}

function toEnglishDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
}

function normalizeDateTimeInput(raw: string): string {
  const normalized = toEnglishDigits(raw)
    .trim()
    .replace(/\s+/g, " ")
    .replace(" ", "T")
    .replace(/[^0-9T:\-]/g, "")

  // Keep as YYYY-MM-DDTHH:mm (16 chars). If user types seconds or more, trim.
  return normalized.length > 16 ? normalized.slice(0, 16) : normalized
}

export default function PurchaseAddPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")
  const viewMode = searchParams.get("view") === "true"

  const [isEditMode, setIsEditMode] = useState(false)
  const [isViewMode, setIsViewMode] = useState(false)
  const [loadingEditData, setLoadingEditData] = useState(false)

  const [numberofpurchase, setNumberOfPurchase] = useState("")
  const [typeofbuy, setTypeOfBuy] = useState<"إعادة" | "محلي" | "استيراد">("محلي")
  const [typeofpayment, setTypeOfPayment] = useState<"نقدي" | "آجل">("نقدي")
  const [currencyType, setCurrencyType] = useState<"دينار" | "دولار">("دينار")
  const [purchasestoreid, setPurchaseStoreId] = useState("")
  const [datetime, setDateTime] = useState("")
  const [details, setDetails] = useState("")

  const [supplierid, setSupplierId] = useState("")
  const [nameofsupplier, setNameOfSupplier] = useState("")
  const [supplierBalanceIQD, setSupplierBalanceIQD] = useState(0)
  const [supplierBalanceUSD, setSupplierBalanceUSD] = useState(0)
  const [searchSupplier, setSearchSupplier] = useState("")
  const [selectOpen, setSelectOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [hasAmountReceived, setHasAmountReceived] = useState(false)
  const [amountCurrency, setAmountCurrency] = useState<"دينار" | "دولار">("دينار")
  const [amountReceivedIQD, setAmountReceivedIQD] = useState(0)
  const [amountReceivedUSD, setAmountReceivedUSD] = useState(0)

  const [stores, setStores] = useState<Store[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [exchangeRate, setExchangeRate] = useState(1500)

  const [products, setProducts] = useState<ProductRow[]>([])
  
  const [newItem, setNewItem] = useState<ProductRow>({
    tempId: "new-item",
    productcode1: "",
    nameofproduct: "",
    quantity: 0,
    unit: "قطعة",
    purchasesinglepriceiqd: 0,
    purchasesinglepriceusd: 0,
    sellsinglepriceiqd: 0,
    sellsinglepriceusd: 0,
    details: "",
  })

  const [isSaving, setIsSaving] = useState(false)
  const saveInFlightRef = useRef(false)
  const [generatingNumber, setGeneratingNumber] = useState(false)
  const [generatingProductCode, setGeneratingProductCode] = useState(false)
  
  const [viewingNote, setViewingNote] = useState<string | null>(null)
  
  // تعارضات أسعار المواد
  const [priceConflicts, setPriceConflicts] = useState<Array<{
    product: PurchaseProductDetail
    existingPriceIQD: number
    existingPriceUSD: number
    newPriceIQD: number
    newPriceUSD: number
  }>>([])
  const [showPriceConflictDialog, setShowPriceConflictDialog] = useState(false)
  const [priceUpdateDecisions, setPriceUpdateDecisions] = useState<Map<string, boolean>>(new Map())

  useEffect(() => {
    loadInitialData()
    
    if (editId) {
      setIsEditMode(true)
      setIsViewMode(viewMode)
      loadEditData(editId)
    } else {
      const now = new Date()
      const formattedDate = now.toISOString().slice(0, 16)
      setDateTime(formattedDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, viewMode])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSelectOpen(false)
      }
    }
    if (selectOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [selectOpen])

  useEffect(() => {
    const newSupplierId = searchParams.get('newSupplierId')
    if (newSupplierId && suppliers.length > 0) {
      const reloadSuppliersAndSelect = async () => {
        try {
          const suppliersData = await getSuppliers()
          setSuppliers(suppliersData)
          
          const newSupplier = suppliersData.find(s => s.id === newSupplierId)
          if (newSupplier) {
            setSupplierId(newSupplierId)
            setNameOfSupplier(newSupplier.name)
            setSupplierBalanceIQD(newSupplier.balanceiqd || 0)
            setSupplierBalanceUSD(newSupplier.balanceusd || 0)
            toast.success(`تم اختيار المجهز: ${newSupplier.name}`)
          }
          
          const newUrl = window.location.pathname + (editId ? `?edit=${editId}` : '')
          window.history.replaceState({}, '', newUrl)
        } catch (error) {
          }
      }
      reloadSuppliersAndSelect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, suppliers.length])

  const loadInitialData = async () => {
    try {
      const storesData = await getActiveStores()
      setStores(storesData)

      const suppliersData = await getSuppliers()
      setSuppliers(suppliersData)

      const rate = await getCurrentExchangeRate()
      setExchangeRate(rate)
    } catch (error) {
      toast.error("فشل تحميل البيانات")
    }
  }

  const generateUniqueProductCode = async () => {
    setGeneratingProductCode(true)
    try {
      let attempts = 0
      const maxAttempts = 100
      
      while (attempts < maxAttempts) {
        const randomNum = Math.floor(Math.random() * 999999) + 1
        const productCode = `M-${String(randomNum).padStart(6, '0')}`
        
        const { data, error } = await supabase
          .from('tb_inventory')
          .select('productcode')
          .eq('productcode', productCode)
          .maybeSingle()
        
        if (error && error.code !== 'PGRST116') {
          throw error
        }
        
        if (!data) {
          updateNewItem("productcode1", productCode)
          toast.success(`تم إنشاء رمز مادة: ${productCode}`)
          break
        }
        
        attempts++
      }
      
      if (attempts >= maxAttempts) {
        toast.error('فشل إنشاء رمز فريد بعد عدة محاولات')
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء رمز المادة')
    } finally {
      setGeneratingProductCode(false)
    }
  }

  const generateUniquePurchaseNumber = async () => {
    setGeneratingNumber(true)
    try {
      let attempts = 0
      const maxAttempts = 100
      
      while (attempts < maxAttempts) {
        const randomNum = Math.floor(Math.random() * 999999) + 1
        const purchaseNumber = `P-${String(randomNum).padStart(6, '0')}`
        
        const { data, error } = await supabase
          .from('tb_purchasemain')
          .select('numberofpurchase')
          .eq('numberofpurchase', purchaseNumber)
          .maybeSingle()
        
        if (error && error.code !== 'PGRST116') {
          throw error
        }
        
        if (!data) {
          setNumberOfPurchase(purchaseNumber)
          toast.success(`تم إنشاء رقم قائمة: ${purchaseNumber}`)
          break
        }
        
        attempts++
      }
      
      if (attempts >= maxAttempts) {
        toast.error('فشل إنشاء رقم فريد بعد عدة محاولات')
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء رقم القائمة')
    } finally {
      setGeneratingNumber(false)
    }
  }

  const loadEditData = async (purchaseId: string) => {
    try {
      setLoadingEditData(true)
      
      const purchaseData = await getPurchaseById(purchaseId)
      if (!purchaseData) {
        toast.error("لم يتم العثور على القائمة")
        router.push("/reports")
        return
      }

      setNumberOfPurchase(purchaseData.numberofpurchase)
      setTypeOfBuy(purchaseData.typeofbuy)
      setTypeOfPayment(purchaseData.typeofpayment)
      setCurrencyType(purchaseData.currency || "دينار")
      setPurchaseStoreId(purchaseData.purchasestoreid)
      setDateTime(new Date(purchaseData.datetime).toISOString().slice(0, 16))
      setDetails(purchaseData.details || "")
      
      setSupplierId(purchaseData.supplierid)
      setNameOfSupplier(purchaseData.nameofsupplier)
      
      const hasAmount = purchaseData.amountreceivediqd > 0 || purchaseData.amountreceivedusd > 0
      setHasAmountReceived(hasAmount)
      setAmountReceivedIQD(purchaseData.amountreceivediqd)
      setAmountReceivedUSD(purchaseData.amountreceivedusd)
      
      const details = await getPurchaseDetails(purchaseId)
      const productsWithTempId = details.map((detail, index) => ({
        ...detail,
        tempId: `product-${index}`,
      }))
      setProducts(productsWithTempId)
      
      toast.success("تم تحميل بيانات القائمة")
    } catch (error) {
      toast.error("فشل تحميل بيانات القائمة")
      router.push("/reports")
    } finally {
      setLoadingEditData(false)
    }
  }

  const handleSupplierChange = async (supplierId: string) => {
    setSupplierId(supplierId)
    const supplier = suppliers.find((s) => s.id === supplierId)
    if (supplier) {
      setNameOfSupplier(supplier.name)
      
      try {
        const { getSupplierById } = await import("@/lib/purchase-operations")
        const freshSupplier = await getSupplierById(supplierId)
        if (freshSupplier) {
          setSupplierBalanceIQD(freshSupplier.balanceiqd ?? 0)
          setSupplierBalanceUSD(freshSupplier.balanceusd ?? 0)
        } else {
          setSupplierBalanceIQD(supplier.balanceiqd ?? 0)
          setSupplierBalanceUSD(supplier.balanceusd ?? 0)
        }
      } catch (error) {
        setSupplierBalanceIQD(supplier.balanceiqd ?? 0)
        setSupplierBalanceUSD(supplier.balanceusd ?? 0)
      }
    }
    }

  const addItemFromNew = () => {
    if (!newItem.productcode1.trim() || !newItem.nameofproduct.trim()) {
      toast.error("الرجاء إدخال رمز المادة واسم المادة")
      return
    }

    if (newItem.quantity <= 0) {
      toast.error("الرجاء إدخال كمية صحيحة")
      return
    }

    const newProduct: ProductRow = {
      ...newItem,
      tempId: `temp-${Date.now()}-${Math.random()}`,
    }
    setProducts([...products, newProduct])

    setNewItem({
      tempId: "new-item",
      productcode1: "",
      nameofproduct: "",
      quantity: 0,
        unit: "قطعة",
      purchasesinglepriceiqd: 0,
      purchasesinglepriceusd: 0,
      sellsinglepriceiqd: 0,
      sellsinglepriceusd: 0,
      details: "",
    })

    toast.success("تم إضافة المادة")
  }

  const removeRow = (tempId: string) => {
    setProducts(products.filter((p) => p.tempId !== tempId))
  }

  const updateNewItem = (field: keyof ProductRow, value: string | number) => {
    const updated = { ...newItem, [field]: value }

    if (field === "purchasesinglepriceiqd" && exchangeRate > 0) {
      updated.purchasesinglepriceusd = Math.round((Number(value) / exchangeRate) * 100) / 100
    }
    if (field === "purchasesinglepriceusd" && exchangeRate > 0) {
      updated.purchasesinglepriceiqd = Math.round((Number(value) * exchangeRate) * 100) / 100
    }
    if (field === "sellsinglepriceiqd" && exchangeRate > 0) {
      updated.sellsinglepriceusd = Math.round((Number(value) / exchangeRate) * 100) / 100
    }
    if (field === "sellsinglepriceusd" && exchangeRate > 0) {
      updated.sellsinglepriceiqd = Math.round((Number(value) * exchangeRate) * 100) / 100
    }

    setNewItem(updated)
  }

  const handleNewItemKeyPress = (e: React.KeyboardEvent, field: keyof ProductRow) => {
    if (e.key === "Enter") {
      e.preventDefault()
      
      if (field === "sellsinglepriceusd" || field === "sellsinglepriceiqd" || field === "details") {
        addItemFromNew()
      }
    }
  }

  const updateProduct = (tempId: string, field: keyof ProductRow, value: string | number) => {
    setProducts(
      products.map((p) => {
        if (p.tempId === tempId) {
          const updated = { ...p, [field]: value }

          if (field === "purchasesinglepriceiqd" && exchangeRate > 0) {
            updated.purchasesinglepriceusd = Math.round((Number(value) / exchangeRate) * 100) / 100
          }
          if (field === "purchasesinglepriceusd" && exchangeRate > 0) {
            updated.purchasesinglepriceiqd = Math.round((Number(value) * exchangeRate) * 100) / 100
          }
          if (field === "sellsinglepriceiqd" && exchangeRate > 0) {
            updated.sellsinglepriceusd = Math.round((Number(value) / exchangeRate) * 100) / 100
          }
          if (field === "sellsinglepriceusd" && exchangeRate > 0) {
            updated.sellsinglepriceiqd = Math.round((Number(value) * exchangeRate) * 100) / 100
          }

          return updated
        }
        return p
      })
    )
  }

  const totalProductsCount = products.filter(
    (p) => p.productcode1 && p.quantity > 0
  ).length

  const totalPurchaseIQD = products.reduce(
    (sum, p) => sum + (p.quantity * p.purchasesinglepriceiqd || 0),
    0
  )

  const totalPurchaseUSD = products.reduce(
    (sum, p) => sum + (p.quantity * p.purchasesinglepriceusd || 0),
    0
  )

  const remainingAmountIQD = totalPurchaseIQD - amountReceivedIQD
  const remainingAmountUSD = totalPurchaseUSD - amountReceivedUSD

  const handleAmountReceivedChange = (value: number) => {
    if (amountCurrency === "دينار") {
      setAmountReceivedIQD(value)
      setAmountReceivedUSD(0)
    } else {
      setAmountReceivedUSD(value)
      setAmountReceivedIQD(0)
    }
  }

  const handleSavePurchase = async () => {
    if (saveInFlightRef.current || isSaving) return
    saveInFlightRef.current = true

    if (!numberofpurchase.trim()) {
      toast.error("الرجاء إدخال رقم القائمة")
      saveInFlightRef.current = false
      return
    }

    if (!purchasestoreid) {
      toast.error("الرجاء اختيار المخزن")
      saveInFlightRef.current = false
      return
    }

    if (!supplierid) {
      toast.error("الرجاء اختيار المجهز")
      saveInFlightRef.current = false
      return
    }

    const validProducts = products.filter(
      (p) => p.productcode1 && p.quantity > 0
    )

    if (validProducts.length === 0) {
      toast.error("الرجاء إضافة مادة واحدة على الأقل")
      saveInFlightRef.current = false
      return
    }

    // التحقق من تعارض الأسعار قبل الحفظ
    if (!isEditMode) {
      const conflictsCheck = await checkProductsPriceConflicts(purchasestoreid, validProducts)
      
      if (conflictsCheck.success && conflictsCheck.conflicts.length > 0) {
        // عرض حوار تعارض الأسعار
        setPriceConflicts(conflictsCheck.conflicts)
        setShowPriceConflictDialog(true)
        saveInFlightRef.current = false
        return
      }
    }

    await savePurchaseData(validProducts)
  }

  const savePurchaseData = async (validProducts: ProductRow[], priceDecisions?: Map<string, boolean>) => {
    if (saveInFlightRef.current || isSaving) return

    saveInFlightRef.current = true
    setIsSaving(true)

    try {
      const purchaseMain = {
        numberofpurchase,
        typeofbuy,
        typeofpayment,
        currencytype: currencyType,
        purchasestoreid,
        supplierid,
        nameofsupplier,
        datetime,
        details,
        currency: currencyType,
        amountreceivediqd: amountReceivedIQD,
        amountreceivedusd: amountReceivedUSD,
        totalpurchaseiqd: totalPurchaseIQD,
        totalpurchaseusd: totalPurchaseUSD,
      }

      let result
      if (isEditMode && editId) {
        // استخدام دالة التعديل
        result = await updatePurchase(
          editId,
          purchaseMain,
          validProducts,
          purchasestoreid
        )
      } else {
        // استخدام دالة الإضافة مع قرارات تحديث الأسعار
        result = await createPurchase(
          purchaseMain,
          validProducts,
          purchasestoreid,
          typeofpayment,
          currencyType,
          priceDecisions
        )
      }

      if (result.success) {
        const total = totalPurchaseIQD || totalPurchaseUSD
        const currency = totalPurchaseIQD ? 'IQD' : 'USD'
        const selectedSupplier = suppliers.find(s => s.id === supplierid)
        
        if (isEditMode) {
          await logAction(
            "تعديل",
            `تم تعديل قائمة شراء رقم ${numberofpurchase} للمجهز: ${selectedSupplier?.name || 'غير معروف'}`,
            "المشتريات",
            undefined,
            undefined,
            {
              numberofpurchase: numberofpurchase,
              nameofsupplier: selectedSupplier?.name,
              totalpurchase: total,
              currency: currency,
              typeofpayment: typeofpayment,
              items_count: validProducts.length
            }
          )
          toast.success("تم تعديل قائمة الشراء بنجاح")
          router.push("/reports")
        } else {
          await logAction(
            "إضافة",
            `تمت عملية إضافة قائمة شراء رقم ${numberofpurchase} للمجهز: ${selectedSupplier?.name || 'غير معروف'} بمبلغ ${total.toLocaleString('en-US')} ${currency}`,
            "المشتريات",
            undefined,
            undefined,
            {
              numberofpurchase: numberofpurchase,
              nameofsupplier: selectedSupplier?.name,
              totalpurchase: total,
              currency: currency,
              typeofpayment: typeofpayment,
              items_count: validProducts.length,
              storename: stores.find(s => s.id === purchasestoreid)?.storename
            }
          )
          
          for (const product of validProducts) {
            await logAction(
              "إضافة للمخزن",
              `تمت إضافة مادة ${product.nameofproduct} بكمية ${product.quantity} ${product.unit} إلى المخزن`,
              "المخزون",
              undefined,
              undefined,
              {
                productcode: product.productcode1,
                productname: product.nameofproduct,
                quantity: product.quantity,
                unit: product.unit,
                storename: stores.find(s => s.id === purchasestoreid)?.storename,
                from_purchase: numberofpurchase
              }
            )
          }
          
          toast.success("تم حفظ قائمة الشراء بنجاح")
          
          // إعادة تعيين النموذج
          setProducts([])
          setNumberOfPurchase("")
          setDetails("")
          setHasAmountReceived(false)
          setAmountReceivedIQD(0)
          setAmountReceivedUSD(0)
          setDateTime("")
          
          setNewItem({
            tempId: "new-item",
            productcode1: "",
            nameofproduct: "",
            quantity: 0,
            unit: "قطعة",
            purchasesinglepriceiqd: 0,
            purchasesinglepriceusd: 0,
            sellsinglepriceiqd: 0,
            sellsinglepriceusd: 0,
            details: "",
          })
        }
      } else {
        toast.error(result.error || "فشل حفظ قائمة الشراء")
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء حفظ القائمة")
    } finally {
      setIsSaving(false)
      saveInFlightRef.current = false
    }
  }

  const handlePriceConflictDecision = (productCode: string, updatePrice: boolean) => {
    const newDecisions = new Map(priceUpdateDecisions)
    newDecisions.set(productCode, updatePrice)
    setPriceUpdateDecisions(newDecisions)
  }

  const handleApplyAllPriceDecisions = async (decision: 'update-all' | 'quantity-only' | 'cancel') => {
    if (decision === 'cancel') {
      setShowPriceConflictDialog(false)
      setPriceConflicts([])
      setPriceUpdateDecisions(new Map())
      return
    }

    const decisions = new Map<string, boolean>()
    const updatePrices = decision === 'update-all'
    
    for (const conflict of priceConflicts) {
      decisions.set(conflict.product.productcode1, updatePrices)
    }

    setShowPriceConflictDialog(false)
    
    const validProducts = products.filter(
      (p) => p.productcode1 && p.quantity > 0
    )
    
    await savePurchaseData(validProducts, decisions)
    
    setPriceConflicts([])
    setPriceUpdateDecisions(new Map())
  }

  return (
    <PermissionGuard requiredPermission="add_purchase">
    {isSaving && (
      <div
        className="fixed inset-0 z-9999 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        aria-busy="true"
        role="status"
      >
        <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">جاري حفظ القائمة...</span>
        </div>
      </div>
    )}
    <div className="container mx-auto p-6 space-y-6">
      {}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowRight className="h-5 w-5 theme-icon" />
          </Button>
          <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
            {isViewMode ? "كشف قائمة شراء" : isEditMode ? "تعديل قائمة شراء" : "إضافة قائمة شراء"}
          </h1>
        </div>
        {loadingEditData && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>جاري تحميل البيانات...</span>
          </div>
        )}
      </div>

      {}
      <Card className="p-6" style={{ backgroundColor: "var(--theme-surface)", color: "var(--theme-text)" }}>
        {}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {}
          <div className="space-y-2">
            <Label htmlFor="numberofpurchase">رقم القائمة</Label>
            <div className="relative">
              <Input
                id="numberofpurchase"
                value={numberofpurchase}
                onChange={(e) => setNumberOfPurchase(e.target.value)}
                placeholder="رقم القائمة"
                readOnly={isViewMode}
                className="pr-10"
              />
              {!isViewMode && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={generateUniquePurchaseNumber}
                  disabled={generatingNumber}
                  title="إنشاء رقم عشوائي"
                >
                  <RefreshCw className={cn("h-4 w-4", generatingNumber && "animate-spin")} />
                </Button>
              )}
            </div>
          </div>

          {}
          <div className="space-y-2">
            <Label>نوع الشراء</Label>
            <Select value={typeofbuy} onValueChange={(v: "إعادة" | "محلي" | "استيراد") => setTypeOfBuy(v)} disabled={isViewMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="إعادة">إعادة</SelectItem>
                <SelectItem value="محلي">محلي</SelectItem>
                <SelectItem value="استيراد">استيراد</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {}
          <div className="space-y-2">
            <Label>نوع الدفع</Label>
            <Select
              value={typeofpayment}
              onValueChange={(v: "نقدي" | "آجل") => setTypeOfPayment(v)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="نقدي">نقدي</SelectItem>
                <SelectItem value="آجل">آجل</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {}
          <div className="space-y-2">
            <Label>نوع العملة</Label>
            <Select
              value={currencyType}
              onValueChange={(v: "دينار" | "دولار") => setCurrencyType(v)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="دينار">دينار</SelectItem>
                <SelectItem value="دولار">دولار</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>المخزن</Label>
            <Select value={purchasestoreid} onValueChange={setPurchaseStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المخزن" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.storename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
          {}
          <div className="space-y-2 md:col-span-3">
            <Label>اسم المجهز</Label>
            <div className="relative" ref={dropdownRef}>
                <Input
                  placeholder="ابحث عن مجهز..."
                  value={searchSupplier || (supplierid ? suppliers.find(s => s.id === supplierid)?.name : "")}
                  onChange={(e) => {
                    setSearchSupplier(e.target.value)
                    setSelectOpen(true)
                    if (!e.target.value) {
                      setSupplierId("")
                      setNameOfSupplier("")
                      setSupplierBalanceIQD(0)
                      setSupplierBalanceUSD(0)
                    }
                  }}
                  onFocus={() => setSelectOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchSupplier) {
                      const filteredSuppliers = suppliers.filter((supplier) =>
                        supplier.name.toLowerCase().includes(searchSupplier.toLowerCase())
                      )
                      if (filteredSuppliers.length === 0) {
                        const currentPath = window.location.pathname + window.location.search
                        router.push(`/customers/add?type=مجهز&returnTo=${encodeURIComponent(currentPath)}&name=${encodeURIComponent(searchSupplier)}`)
                      }
                    }
                  }}
                  disabled={isViewMode}
                />
                {selectOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-[300px] overflow-y-auto">
                    {(() => {
                      const filteredSuppliers = suppliers.filter((supplier) =>
                        supplier.name.toLowerCase().includes(searchSupplier.toLowerCase())
                      )
                      
                      if (filteredSuppliers.length === 0) {
                        return (
                          <div className="px-3 py-3 text-center space-y-1">
                            <div className="text-sm text-muted-foreground">
                              لا يوجد اسم مطابق
                            </div>
                            <div className="text-xs text-muted-foreground">
                              اضغط <kbd className="px-1.5 py-0.5 text-xs font-semibold border rounded bg-muted">Enter</kbd> لإضافة مجهز جديد
                            </div>
                          </div>
                        )
                      }
                      
                      return filteredSuppliers.map((supplier) => (
                        <div
                          key={supplier.id}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleSupplierChange(supplier.id)
                            setSelectOpen(false)
                            setSearchSupplier("")
                          }}
                          className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        >
                          {supplier.name}
                        </div>
                      ))
                    })()}
                  </div>
                )}
            </div>
          </div>

          {}
          <div className="space-y-2 md:col-span-2">
            <Label className="font-semibold text-blue-600 dark:text-blue-400">رصيد سابق دينار</Label>
            <div className="flex items-center gap-2">
              <Input
                value={supplierBalanceIQD.toLocaleString('en-US')}
                readOnly
                className="ltr-numbers bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 font-bold"
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="font-semibold text-green-600 dark:text-green-400">رصيد سابق دولار</Label>
            <div className="flex items-center gap-2">
              <Input
                value={supplierBalanceUSD.toLocaleString('en-US')}
                readOnly
                className="ltr-numbers bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 font-bold"
              />
            </div>
          </div>

          {}
          {typeofpayment === "آجل" && (
            <div className="space-y-2 md:col-span-3">
              <div className="flex items-center space-x-2 space-x-reverse h-full">
                <Checkbox
                  id="hasAmountReceived"
                  checked={hasAmountReceived}
                  onCheckedChange={(checked) =>
                    setHasAmountReceived(checked as boolean)
                  }
                  disabled={isViewMode}
                />
                <Label htmlFor="hasAmountReceived" className="cursor-pointer">
                  مبلغ واصل
                </Label>
              </div>

              {hasAmountReceived && (
                <div className="flex gap-2">
                  <Select
                    value={amountCurrency}
                    onValueChange={(v: "دينار" | "دولار") => setAmountCurrency(v)}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="دينار">دينار</SelectItem>
                      <SelectItem value="دولار">دولار</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={
                      amountCurrency === "دينار"
                        ? amountReceivedIQD || ""
                        : amountReceivedUSD || ""
                    }
                    onChange={(e) =>
                      handleAmountReceivedChange(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          )}

          {}
          <div className="space-y-2 md:col-span-2">
            <Label>سعر الصرف</Label>
            <Input
              value={exchangeRate.toLocaleString('en-US')}
              readOnly
              className="ltr-numbers bg-muted"
            />
          </div>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {}
          <div className="space-y-2">
            <Label htmlFor="datetime">التاريخ والوقت</Label>
            <div className="relative">
              <Input
                id="datetime"
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM-DD HH:MM"
                value={datetime ? datetime.replace("T", " ") : ""}
                onChange={(e) => setDateTime(normalizeDateTimeInput(e.target.value))}
                readOnly={isViewMode}
                dir="ltr"
                className={cn(
                  "ltr-numbers text-center pl-10 pr-10",
                  isViewMode && "bg-muted"
                )}
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none theme-icon" />
            </div>
          </div>

          {}
          <div className="space-y-2">
            <Label htmlFor="details">الملاحظات</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="ملاحظات إضافية..."
              rows={2}
              readOnly={isViewMode}
            />
          </div>
        </div>
      </Card>

      {}
      <Card className="p-6" style={{ backgroundColor: "var(--theme-surface)", color: "var(--theme-text)" }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ color: "var(--theme-text)" }}>
            تفاصيل المواد المشتراة
          </h2>
        </div>

        <div className="rounded-lg border overflow-x-auto w-full max-h-[1200px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow
                style={{
                  background: "linear-gradient(to right, var(--theme-surface), var(--theme-accent))",
                }}
              >
                <TableHead className="text-center" style={{ color: "var(--theme-text)" }}>#</TableHead>
                <TableHead className="text-center" style={{ color: "var(--theme-text)" }}>حذف</TableHead>
                <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>رمز المادة</TableHead>
                <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>اسم المادة</TableHead>
                <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>العدد</TableHead>
                <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>الوحدة</TableHead>
                <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>س.شراء دينار</TableHead>
                <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>س.شراء دولار</TableHead>
                <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>س.بيع دينار</TableHead>
                <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>س.بيع دولار</TableHead>
                <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>ملاحظة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {}
              {!isViewMode && (
              <TableRow style={{ backgroundColor: "var(--theme-accent)", opacity: 0.9 }}>
                <TableCell className="text-center font-bold" style={{ color: "var(--theme-text)" }}>
                  جديد
                </TableCell>
                <TableCell className="text-center">
                  <Plus className="h-5 w-5 theme-success mx-auto" />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <div className="relative flex-1">
                      <Input
                        value={newItem.productcode1}
                        onChange={(e) => updateNewItem("productcode1", e.target.value)}
                        onKeyPress={(e) => handleNewItemKeyPress(e, "productcode1")}
                        placeholder="رمز المادة"
                        className="bg-green-50 dark:bg-green-950/20 h-8 pl-7"
                        title={newItem.productcode1}
                      />
                      {!isViewMode && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-6"
                          onClick={generateUniqueProductCode}
                          disabled={generatingProductCode}
                          title="إنشاء رمز عشوائي"
                        >
                          <RefreshCw className={cn("h-3 w-3", generatingProductCode && "animate-spin")} />
                        </Button>
                      )}
                    </div>
                    {newItem.productcode1 && newItem.productcode1.length > 10 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewingNote(newItem.productcode1)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Input
                      value={newItem.nameofproduct}
                      onChange={(e) => updateNewItem("nameofproduct", e.target.value)}
                      onKeyPress={(e) => handleNewItemKeyPress(e, "nameofproduct")}
                      placeholder="اسم المادة"
                      className="bg-green-50 dark:bg-green-950/20 h-8 flex-1"
                      title={newItem.nameofproduct}
                    />
                    {newItem.nameofproduct && newItem.nameofproduct.length > 15 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewingNote(newItem.nameofproduct)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newItem.quantity || ""}
                    onChange={(e) => updateNewItem("quantity", parseFloat(e.target.value) || 0)}
                    onKeyPress={(e) => handleNewItemKeyPress(e, "quantity")}
                    placeholder="0"
                    className="bg-green-50 dark:bg-green-950/20 h-8"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={newItem.unit}
                    onValueChange={(v: "كارتون" | "قطعة" | "لتر" | "كغم") =>
                      updateNewItem("unit", v)
                    }
                  >
                    <SelectTrigger className="bg-green-50 dark:bg-green-950/20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="كارتون">كارتون</SelectItem>
                      <SelectItem value="قطعة">قطعة</SelectItem>
                      <SelectItem value="لتر">لتر</SelectItem>
                      <SelectItem value="كغم">كغم</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newItem.purchasesinglepriceiqd || ""}
                    onChange={(e) => updateNewItem("purchasesinglepriceiqd", parseFloat(e.target.value) || 0)}
                    onKeyPress={(e) => handleNewItemKeyPress(e, "purchasesinglepriceiqd")}
                    placeholder="0"
                    className="bg-green-50 dark:bg-green-950/20 h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newItem.purchasesinglepriceusd || ""}
                    onChange={(e) => updateNewItem("purchasesinglepriceusd", parseFloat(e.target.value) || 0)}
                    onKeyPress={(e) => handleNewItemKeyPress(e, "purchasesinglepriceusd")}
                    placeholder="0"
                    className="bg-green-50 dark:bg-green-950/20 h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newItem.sellsinglepriceiqd || ""}
                    onChange={(e) => updateNewItem("sellsinglepriceiqd", parseFloat(e.target.value) || 0)}
                    onKeyPress={(e) => handleNewItemKeyPress(e, "sellsinglepriceiqd")}
                    placeholder="0"
                    className="bg-green-50 dark:bg-green-950/20 h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newItem.sellsinglepriceusd || ""}
                    onChange={(e) => updateNewItem("sellsinglepriceusd", parseFloat(e.target.value) || 0)}
                    onKeyPress={(e) => handleNewItemKeyPress(e, "sellsinglepriceusd")}
                    placeholder="0"
                    className="bg-green-50 dark:bg-green-950/20 h-8"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Input
                      value={newItem.details || ""}
                      onChange={(e) => updateNewItem("details", e.target.value)}
                      onKeyPress={(e) => handleNewItemKeyPress(e, "details")}
                      placeholder="ملاحظة..."
                      className="bg-green-50 dark:bg-green-950/20 h-8 flex-1"
                      title={newItem.details}
                    />
                    {newItem.details && newItem.details.length > 15 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewingNote(newItem.details || "")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              )}

              {}
              {products.map((product, index) => (
                  <TableRow key={product.tempId} style={{ backgroundColor: "var(--theme-background)" }}>
                    <TableCell className="text-center" style={{ color: "var(--theme-text)" }}>
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-center">
                      {!isViewMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(product.tempId)}
                        >
                          <Trash2 className="h-4 w-4 theme-danger" />
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Input
                          value={product.productcode1}
                          onChange={(e) =>
                            updateProduct(product.tempId, "productcode1", e.target.value)
                          }
                          placeholder="رمز المادة"
                          className="bg-amber-50 dark:bg-amber-950/20 h-8 flex-1"
                          title={product.productcode1}
                        />
                        {product.productcode1 && product.productcode1.length > 10 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewingNote(product.productcode1)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Input
                          value={product.nameofproduct}
                          onChange={(e) =>
                            updateProduct(product.tempId, "nameofproduct", e.target.value)
                          }
                          placeholder="اسم المادة"
                          className="h-8 flex-1"
                          title={product.nameofproduct}
                        />
                        {product.nameofproduct && product.nameofproduct.length > 15 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewingNote(product.nameofproduct)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={product.quantity || ""}
                        onChange={(e) =>
                          updateProduct(
                            product.tempId,
                            "quantity",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={product.unit}
                        onValueChange={(v: "كارتون" | "قطعة" | "لتر" | "كغم") =>
                          updateProduct(product.tempId, "unit", v)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="كارتون">كارتون</SelectItem>
                          <SelectItem value="قطعة">قطعة</SelectItem>
                          <SelectItem value="لتر">لتر</SelectItem>
                          <SelectItem value="كغم">كغم</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={product.purchasesinglepriceiqd || ""}
                        onChange={(e) =>
                          updateProduct(
                            product.tempId,
                            "purchasesinglepriceiqd",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={product.purchasesinglepriceusd || ""}
                        onChange={(e) =>
                          updateProduct(
                            product.tempId,
                            "purchasesinglepriceusd",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={product.sellsinglepriceiqd || ""}
                        onChange={(e) =>
                          updateProduct(
                            product.tempId,
                            "sellsinglepriceiqd",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={product.sellsinglepriceusd || ""}
                        onChange={(e) =>
                          updateProduct(
                            product.tempId,
                            "sellsinglepriceusd",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Input
                          value={product.details}
                          onChange={(e) =>
                            updateProduct(product.tempId, "details", e.target.value)
                          }
                          placeholder="ملاحظة"
                          className="flex-1 h-8"
                          title={product.details}
                        />
                        {product.details && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setViewingNote(product.details || "")}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {}
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: "var(--theme-accent)", color: "var(--theme-text)" }}>
          {}
          <div className="flex flex-wrap items-center justify-between gap-6 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">عدد المواد:</span>
              <span className="ltr-numbers font-bold text-lg">{totalProductsCount}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">إجمالي دينار:</span>
              <span className="ltr-numbers font-bold text-lg text-green-600 dark:text-green-400">{totalPurchaseIQD.toLocaleString('en-US')}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">إجمالي دولار:</span>
              <span className="ltr-numbers font-bold text-lg text-blue-600 dark:text-blue-400">{totalPurchaseUSD.toLocaleString('en-US')}</span>
            </div>
            
            {hasAmountReceived && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm">واصل دينار:</span>
                  <span className="ltr-numbers font-bold text-lg">{amountReceivedIQD.toLocaleString('en-US')}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm">واصل دولار:</span>
                  <span className="ltr-numbers font-bold text-lg">{amountReceivedUSD.toLocaleString('en-US')}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm">متبقي دينار:</span>
                  <span className="ltr-numbers font-bold text-lg text-orange-600 dark:text-orange-400">{remainingAmountIQD.toLocaleString('en-US')}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm">متبقي دولار:</span>
                  <span className="ltr-numbers font-bold text-lg text-orange-600 dark:text-orange-400">{remainingAmountUSD.toLocaleString('en-US')}</span>
                </div>
              </>
            )}
          </div>

          {!isViewMode && (
            <Button
              onClick={handleSavePurchase}
              disabled={isSaving}
              size="lg"
              className="w-full md:w-auto"
              style={{ backgroundColor: "var(--theme-primary)", color: "white" }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 ml-2 animate-spin theme-icon" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 ml-2 theme-success" />
                  إضافة قائمة الشراء
                </>
              )}
            </Button>
          )}
        </div>
      </Card>

      {}
      <Dialog open={viewingNote !== null} onOpenChange={(open) => !open && setViewingNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>الملاحظة</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="whitespace-pre-wrap">{viewingNote}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewingNote(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Price Conflicts */}
      <Dialog open={showPriceConflictDialog} onOpenChange={setShowPriceConflictDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-orange-600">
              ⚠️ تحذير: اختلاف في الأسعار
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              بعض المنتجات موجودة بالفعل في المخزن بأسعار مختلفة. اختر كيف تريد التعامل مع جميع المنتجات:
            </p>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>السعر الحالي</TableHead>
                  <TableHead>السعر الجديد</TableHead>
                  <TableHead>الفرق</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceConflicts.map((conflict) => (
                  <TableRow key={conflict.product.productcode1}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{conflict.product.nameofproduct}</div>
                        <div className="text-sm text-muted-foreground">
                          كود: {conflict.product.productcode1}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {conflict.existingPriceIQD > 0 && (
                          <div className="ltr-numbers text-sm">
                            {conflict.existingPriceIQD.toLocaleString('en-US')} ?.?
                          </div>
                        )}
                        {conflict.existingPriceUSD > 0 && (
                          <div className="ltr-numbers text-sm text-green-600">
                            ${conflict.existingPriceUSD.toLocaleString('en-US')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {conflict.newPriceIQD > 0 && (
                          <div className="ltr-numbers text-sm font-semibold text-blue-600">
                            {conflict.newPriceIQD.toLocaleString('en-US')} ?.?
                          </div>
                        )}
                        {conflict.newPriceUSD > 0 && (
                          <div className="ltr-numbers text-sm font-semibold text-green-600">
                            ${conflict.newPriceUSD.toLocaleString('en-US')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {conflict.newPriceIQD !== conflict.existingPriceIQD && (
                          <div className={cn(
                            "ltr-numbers text-sm font-medium",
                            conflict.newPriceIQD > conflict.existingPriceIQD
                              ? "text-red-600"
                              : "text-green-600"
                          )}>
                            {conflict.newPriceIQD > conflict.existingPriceIQD ? "+" : ""}
                            {(conflict.newPriceIQD - conflict.existingPriceIQD).toLocaleString('en-US')} ?.?
                          </div>
                        )}
                        {conflict.newPriceUSD !== conflict.existingPriceUSD && (
                          <div className={cn(
                            "ltr-numbers text-sm font-medium",
                            conflict.newPriceUSD > conflict.existingPriceUSD
                              ? "text-red-600"
                              : "text-green-600"
                          )}>
                            {conflict.newPriceUSD > conflict.existingPriceUSD ? "+" : ""}
                            ${(conflict.newPriceUSD - conflict.existingPriceUSD).toLocaleString('en-US')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => handleApplyAllPriceDecisions('cancel')}
            >
              إلغاء
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleApplyAllPriceDecisions('quantity-only')}
            >
              تحديث الكمية فقط
            </Button>
            <Button
              onClick={() => handleApplyAllPriceDecisions('update-all')}
              className="bg-green-600 hover:bg-green-700"
            >
              تحديث الكمية والسعر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGuard>
  )
}
