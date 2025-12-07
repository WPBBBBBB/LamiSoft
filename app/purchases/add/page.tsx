"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { getActiveStores, type Store } from "@/lib/stores-operations"
import {
  getSuppliers,
  createPurchase,
  type Supplier,
  type PurchaseProductDetail,
} from "@/lib/purchase-operations"
import { getCurrentExchangeRate } from "@/lib/exchange-rate-operations"

interface ProductRow extends PurchaseProductDetail {
  tempId: string
}

export default function PurchaseAddPage() {
  const router = useRouter()

  // ============================================================
  // State Management
  // ============================================================

  // البيانات الأساسية
  const [numberofpurchase, setNumberOfPurchase] = useState("")
  const [typeofbuy, setTypeOfBuy] = useState<"إعادة" | "محلي" | "استيراد">("محلي")
  const [typeofpayment, setTypeOfPayment] = useState<"نقدي" | "آجل">("نقدي")
  const [currencyType, setCurrencyType] = useState<"دينار" | "دولار">("دينار")
  const [purchasestoreid, setPurchaseStoreId] = useState("")
  const [datetime, setDateTime] = useState("")
  const [details, setDetails] = useState("")

  // بيانات المجهز
  const [supplierid, setSupplierId] = useState("")
  const [nameofsupplier, setNameOfSupplier] = useState("")
  const [supplierBalanceIQD, setSupplierBalanceIQD] = useState(0)
  const [supplierBalanceUSD, setSupplierBalanceUSD] = useState(0)

  // المبلغ الواصل
  const [hasAmountReceived, setHasAmountReceived] = useState(false)
  const [amountCurrency, setAmountCurrency] = useState<"دينار" | "دولار">("دينار")
  const [amountReceivedIQD, setAmountReceivedIQD] = useState(0)
  const [amountReceivedUSD, setAmountReceivedUSD] = useState(0)

  // القوائم المنسدلة
  const [stores, setStores] = useState<Store[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // سعر الصرف
  const [exchangeRate, setExchangeRate] = useState(1500)

  // جدول المنتجات
  const [products, setProducts] = useState<ProductRow[]>([])
  
  // صف الإضافة الجديد
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

  // حالة الحفظ
  const [isSaving, setIsSaving] = useState(false)
  
  // عرض الملاحظات
  const [viewingNote, setViewingNote] = useState<string | null>(null)

  // ============================================================
  // Load Initial Data
  // ============================================================

  useEffect(() => {
    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadInitialData = async () => {
    try {
      // تحميل المخازن
      const storesData = await getActiveStores()
      setStores(storesData)

      // تحميل المجهزين
      const suppliersData = await getSuppliers()
      setSuppliers(suppliersData)

      // تحميل سعر الصرف
      const rate = await getCurrentExchangeRate()
      setExchangeRate(rate)

      // تعيين التاريخ الحالي
      const now = new Date()
      const formattedDate = now.toISOString().slice(0, 16)
      setDateTime(formattedDate)
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("فشل تحميل البيانات")
    }
  }

  // ============================================================
  // Supplier Selection
  // ============================================================

  const handleSupplierChange = async (supplierId: string) => {
    setSupplierId(supplierId)
    const supplier = suppliers.find((s) => s.id === supplierId)
    console.log('=== Supplier Selection Debug ===')
    console.log('Selected supplier ID:', supplierId)
    console.log('Found supplier in list:', supplier)
    console.log('Supplier balanceiqd:', supplier?.balanceiqd)
    console.log('Supplier balanceusd:', supplier?.balanceusd)
    
    if (supplier) {
      setNameOfSupplier(supplier.name)
      
      // جلب بيانات المجهز مباشرة من قاعدة البيانات للتأكد
      try {
        const { getSupplierById } = await import("@/lib/purchase-operations")
        const freshSupplier = await getSupplierById(supplierId)
        console.log('Fresh supplier from DB:', freshSupplier)
        
        if (freshSupplier) {
          console.log('Setting balances from fresh data:', freshSupplier.balanceiqd, freshSupplier.balanceusd)
          setSupplierBalanceIQD(freshSupplier.balanceiqd ?? 0)
          setSupplierBalanceUSD(freshSupplier.balanceusd ?? 0)
        } else {
          console.log('Setting balances from list:', supplier.balanceiqd, supplier.balanceusd)
          setSupplierBalanceIQD(supplier.balanceiqd ?? 0)
          setSupplierBalanceUSD(supplier.balanceusd ?? 0)
        }
      } catch (error) {
        console.error('Error fetching supplier balance:', error)
        setSupplierBalanceIQD(supplier.balanceiqd ?? 0)
        setSupplierBalanceUSD(supplier.balanceusd ?? 0)
      }
    }
    console.log('=== End Debug ===')
  }

  // ============================================================
  // Product Table Management
  // ============================================================

  const addItemFromNew = () => {
    // التحقق من أن الحقول الأساسية ليست فارغة
    if (!newItem.productcode1.trim() || !newItem.nameofproduct.trim()) {
      toast.error("الرجاء إدخال رمز المادة واسم المادة")
      return
    }

    if (newItem.quantity <= 0) {
      toast.error("الرجاء إدخال كمية صحيحة")
      return
    }

    // إضافة المادة للقائمة
    const newProduct: ProductRow = {
      ...newItem,
      tempId: `temp-${Date.now()}-${Math.random()}`,
    }
    setProducts([...products, newProduct])

    // إعادة تعيين newItem
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

    // تحويل تلقائي بين العملات (مع التقريب لرقمين عشريين)
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
      e.preventDefault() // منع السلوك الافتراضي
      
      // إضافة المادة للجدول فقط (بدون حفظ في قاعدة البيانات)
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

          // تحويل تلقائي بين العملات (مع التقريب لرقمين عشريين)
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

  // ============================================================
  // Calculations
  // ============================================================

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

  // ============================================================
  // Amount Received Handler
  // ============================================================

  const handleAmountReceivedChange = (value: number) => {
    if (amountCurrency === "دينار") {
      setAmountReceivedIQD(value)
      setAmountReceivedUSD(0)
    } else {
      setAmountReceivedUSD(value)
      setAmountReceivedIQD(0)
    }
  }

  // ============================================================
  // Save Purchase
  // ============================================================

  const handleSavePurchase = async () => {
    // التحقق من البيانات
    if (!numberofpurchase.trim()) {
      toast.error("الرجاء إدخال رقم القائمة")
      return
    }

    if (!purchasestoreid) {
      toast.error("الرجاء اختيار المخزن")
      return
    }

    if (!supplierid) {
      toast.error("الرجاء اختيار المجهز")
      return
    }

    const validProducts = products.filter(
      (p) => p.productcode1 && p.quantity > 0
    )

    if (validProducts.length === 0) {
      toast.error("الرجاء إضافة مادة واحدة على الأقل")
      return
    }

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
        currency: amountCurrency,
        amountreceivediqd: amountReceivedIQD,
        amountreceivedusd: amountReceivedUSD,
        totalpurchaseiqd: totalPurchaseIQD,
        totalpurchaseusd: totalPurchaseUSD,
      }

      const result = await createPurchase(
        purchaseMain,
        validProducts,
        purchasestoreid,
        typeofpayment,
        currencyType
      )

      if (result.success) {
        toast.success("تم حفظ قائمة الشراء بنجاح")
        
        // تصفير الجدول والنموذج للبدء بقائمة جديدة
        setProducts([])
        setNumberOfPurchase("")
        setDetails("")
        setHasAmountReceived(false)
        setAmountReceivedIQD(0)
        setAmountReceivedUSD(0)
        setDateTime("")
        
        // إعادة تعيين newItem
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
      } else {
        toast.error(result.error || "فشل حفظ قائمة الشراء")
      }
    } catch (error) {
      console.error("Error saving purchase:", error)
      toast.error("حدث خطأ أثناء حفظ القائمة")
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold" style={{ color: "var(--theme-text)" }}>
            إضافة قائمة شراء
          </h1>
        </div>
      </div>

      {/* Form Cards */}
      <Card className="p-6" style={{ backgroundColor: "var(--theme-surface)", color: "var(--theme-text)" }}>
        {/* الصف الأول */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {/* رقم القائمة */}
          <div className="space-y-2">
            <Label htmlFor="numberofpurchase">رقم القائمة</Label>
            <Input
              id="numberofpurchase"
              value={numberofpurchase}
              onChange={(e) => setNumberOfPurchase(e.target.value)}
              placeholder="رقم القائمة"
            />
          </div>

          {/* نوع الشراء */}
          <div className="space-y-2">
            <Label>نوع الشراء</Label>
            <Select value={typeofbuy} onValueChange={(v: "إعادة" | "محلي" | "استيراد") => setTypeOfBuy(v)}>
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

          {/* نوع الدفع */}
          <div className="space-y-2">
            <Label>نوع الدفع</Label>
            <Select
              value={typeofpayment}
              onValueChange={(v: "نقدي" | "آجل") => setTypeOfPayment(v)}
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

          {/* نوع العملة */}
          <div className="space-y-2">
            <Label>نوع العملة</Label>
            <Select
              value={currencyType}
              onValueChange={(v: "دينار" | "دولار") => setCurrencyType(v)}
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

          {/* المخزن */}
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

        {/* الصف الثاني */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
          {/* اسم المجهز */}
          <div className="space-y-2 md:col-span-3">
            <Label>اسم المجهز</Label>
            <Select value={supplierid} onValueChange={handleSupplierChange}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المجهز" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* رصيد المجهز السابق */}
          <div className="space-y-2 md:col-span-2">
            <Label className="font-semibold text-blue-600 dark:text-blue-400">رصيد سابق دينار</Label>
            <div className="flex items-center gap-2">
              <Input
                value={supplierBalanceIQD.toLocaleString()}
                readOnly
                className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 font-bold"
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="font-semibold text-green-600 dark:text-green-400">رصيد سابق دولار</Label>
            <div className="flex items-center gap-2">
              <Input
                value={supplierBalanceUSD.toLocaleString()}
                readOnly
                className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 font-bold"
              />
            </div>
          </div>

          {/* Checkbox مبلغ واصل - يظهر فقط عندما يكون نوع الدفع آجل */}
          {typeofpayment === "آجل" && (
            <div className="space-y-2 md:col-span-3">
              <div className="flex items-center space-x-2 space-x-reverse h-full">
                <Checkbox
                  id="hasAmountReceived"
                  checked={hasAmountReceived}
                  onCheckedChange={(checked) =>
                    setHasAmountReceived(checked as boolean)
                  }
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
                    placeholder="المبلغ"
                  />
                </div>
              )}
            </div>
          )}

          {/* سعر الصرف */}
          <div className="space-y-2 md:col-span-2">
            <Label>سعر الصرف</Label>
            <Input
              value={exchangeRate.toLocaleString()}
              readOnly
              className="bg-muted"
            />
          </div>
        </div>

        {/* الصف الثالث */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* التاريخ */}
          <div className="space-y-2">
            <Label htmlFor="datetime">التاريخ والوقت</Label>
            <div className="relative">
              <Input
                id="datetime"
                type="datetime-local"
                value={datetime}
                onChange={(e) => setDateTime(e.target.value)}
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* الملاحظات */}
          <div className="space-y-2">
            <Label htmlFor="details">الملاحظات</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="ملاحظات إضافية..."
              rows={2}
            />
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="p-6" style={{ backgroundColor: "var(--theme-surface)", color: "var(--theme-text)" }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ color: "var(--theme-text)" }}>
            تفاصيل المواد المشتراة
          </h2>
        </div>

        <div className="rounded-lg border overflow-x-auto w-full max-h-[calc(100vh-500px)] overflow-y-auto">
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
              {/* صف الإضافة الجديد */}
              <TableRow style={{ backgroundColor: "var(--theme-accent)", opacity: 0.9 }}>
                <TableCell className="text-center font-bold" style={{ color: "var(--theme-text)" }}>
                  جديد
                </TableCell>
                <TableCell className="text-center">
                  <Plus className="h-5 w-5 text-green-500 mx-auto" />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Input
                      value={newItem.productcode1}
                      onChange={(e) => updateNewItem("productcode1", e.target.value)}
                      onKeyPress={(e) => handleNewItemKeyPress(e, "productcode1")}
                      placeholder="رمز المادة"
                      className="bg-green-50 dark:bg-green-950/20 h-8 flex-1"
                      title={newItem.productcode1}
                    />
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

              {/* المواد المضافة */}
              {products.map((product, index) => (
                  <TableRow key={product.tempId} style={{ backgroundColor: "var(--theme-background)" }}>
                    <TableCell className="text-center" style={{ color: "var(--theme-text)" }}>
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(product.tempId)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
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

        {/* Summary Footer */}
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: "var(--theme-accent)", color: "var(--theme-text)" }}>
          {/* الصف الأول - معلومات أفقية */}
          <div className="flex flex-wrap items-center justify-between gap-6 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">عدد المواد:</span>
              <span className="font-bold text-lg">{totalProductsCount}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">إجمالي دينار:</span>
              <span className="font-bold text-lg text-green-600 dark:text-green-400">{totalPurchaseIQD.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">إجمالي دولار:</span>
              <span className="font-bold text-lg text-blue-600 dark:text-blue-400">{totalPurchaseUSD.toLocaleString()}</span>
            </div>
            
            {hasAmountReceived && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm">واصل دينار:</span>
                  <span className="font-bold text-lg">{amountReceivedIQD.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm">واصل دولار:</span>
                  <span className="font-bold text-lg">{amountReceivedUSD.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm">متبقي دينار:</span>
                  <span className="font-bold text-lg text-orange-600 dark:text-orange-400">{remainingAmountIQD.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm">متبقي دولار:</span>
                  <span className="font-bold text-lg text-orange-600 dark:text-orange-400">{remainingAmountUSD.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          <Button
            onClick={handleSavePurchase}
            disabled={isSaving}
            size="lg"
            className="w-full md:w-auto"
            style={{ backgroundColor: "var(--theme-primary)", color: "white" }}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 ml-2" />
                إضافة قائمة الشراء
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Dialog عرض الملاحظة */}
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
    </div>
  )
}
