"use client"

import { useState, useEffect, useRef } from "react"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ArrowRight, Trash2, Loader2, Save, Eye } from "lucide-react"
import { toast } from "sonner"
import { getActiveStores, type Store } from "@/lib/stores-operations"
import {
  getAllCustomers,
  getInventoryByStore,
  createSale,
  type Customer,
  type InventoryItem,
  type SaleProductRow,
  type SaleMain,
} from "@/lib/sales-operations"
import { getCurrentExchangeRate } from "@/lib/exchange-rate-operations"

export default function SaleAddPage() {
  const router = useRouter()

  // ============================================================
  // State Management
  // ============================================================

  // البيانات الأساسية
  const [numberofsale, setNumberOfSale] = useState("")
  const [pricetype, setPriceType] = useState<"جملة" | "مفرد">("مفرد")
  const [paytype, setPayType] = useState<"نقدي" | "آجل">("نقدي")
  const [currencyType, setCurrencyType] = useState<"دينار" | "دولار">("دينار")
  const [salestoreid, setSaleStoreId] = useState("")
  const [datetime, setDateTime] = useState("")
  const [details, setDetails] = useState("")

  // بيانات الزبون
  const [customerid, setCustomerId] = useState("")
  const [customername, setCustomerName] = useState("")
  const [customerBalanceIQD, setCustomerBalanceIQD] = useState(0)
  const [customerBalanceUSD, setCustomerBalanceUSD] = useState(0)

  // المبلغ الواصل
  const [hasAmountReceived, setHasAmountReceived] = useState(false)
  const [amountCurrency, setAmountCurrency] = useState<"دينار" | "دولار">("دينار")
  const [amountReceivedIQD, setAmountReceivedIQD] = useState(0)
  const [amountReceivedUSD, setAmountReceivedUSD] = useState(0)

  // الخصم
  const [discountEnabled, setDiscountEnabled] = useState(false)
  const [discountCurrency, setDiscountCurrency] = useState<"دينار" | "دولار">("دينار")
  const [discountIQD, setDiscountIQD] = useState(0)
  const [discountUSD, setDiscountUSD] = useState(0)

  // القوائم المنسدلة
  const [stores, setStores] = useState<Store[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])

  // سعر الصرف
  const [exchangeRate, setExchangeRate] = useState(1500)

  // البحث في المنتجات
  const [productSearchCode, setProductSearchCode] = useState("")
  const [productSearchName, setProductSearchName] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 })
  const codeInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // جدول المنتجات
  const [products, setProducts] = useState<SaleProductRow[]>([])

  // صف الإضافة الجديد
  const [newItem, setNewItem] = useState<SaleProductRow>({
    tempId: "new-item",
    productcode: "",
    productname: "",
    storeid: "",
    quantity: 0,
    unitpriceiqd: 0,
    unitpriceusd: 0,
    totalpriceiqd: 0,
    totalpriceusd: 0,
    notes: "",
  })

  // حالة الحفظ
  const [isSaving, setIsSaving] = useState(false)

  // معاينة الملاحظات
  const [viewingNote, setViewingNote] = useState<string | null>(null)

  // ============================================================
  // Load Initial Data
  // ============================================================

  useEffect(() => {
    loadInitialData()
    generateSaleNumber()
    // تعيين التاريخ الحالي
    const now = new Date()
    setDateTime(now.toISOString().slice(0, 16))
  }, [])

  useEffect(() => {
    if (salestoreid) {
      loadInventory(salestoreid)
    }
  }, [salestoreid])

  // إغلاق الاقتراحات عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // تحقق إذا كان النقر خارج الـ input والاقتراحات
      if (
        codeInputRef.current && !codeInputRef.current.contains(target) &&
        nameInputRef.current && !nameInputRef.current.contains(target) &&
        !target.closest('[data-suggestions]')
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadInitialData = async () => {
    try {
      const [storesData, customersData, rate] = await Promise.all([
        getActiveStores(),
        getAllCustomers(),
        getCurrentExchangeRate(),
      ])

      setStores(storesData)
      setCustomers(customersData)
      setExchangeRate(rate)

      // تعيين المخزن الأول افتراضياً
      if (storesData.length > 0) {
        setSaleStoreId(storesData[0].id)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("فشل تحميل البيانات")
    }
  }

  const generateSaleNumber = async () => {
    try {
      const { generateNextSaleNumber } = await import("@/lib/sales-operations")
      const newNumber = await generateNextSaleNumber()
      setNumberOfSale(newNumber)
    } catch (error) {
      console.error("Error generating sale number:", error)
      toast.error("فشل توليد رقم القائمة")
    }
  }

  const loadInventory = async (storeId: string) => {
    try {
      const items = await getInventoryByStore(storeId)
      console.log("Loaded inventory items:", items.length, items)
      setInventory(items)
      if (items.length === 0) {
        toast.info("لا توجد مواد متوفرة في هذا المخزن")
      }
    } catch (error) {
      console.error("Error loading inventory:", error)
      toast.error("فشل تحميل المواد")
    }
  }

  // ============================================================
  // Customer Selection
  // ============================================================

  const handleCustomerChange = async (customerId: string) => {
    setCustomerId(customerId)
    const customer = customers.find((c) => c.id === customerId)

    if (customer) {
      setCustomerName(customer.customer_name)
      setCustomerBalanceIQD(customer.balanceiqd ?? 0)
      setCustomerBalanceUSD(customer.balanceusd ?? 0)
    }
  }

  // ============================================================
  // Product Management
  // ============================================================

  // تصفية المنتجات حسب البحث
  const filteredInventory = inventory.filter((item) => {
    const searchCode = productSearchCode.toLowerCase().trim()
    const searchName = productSearchName.toLowerCase().trim()
    
    // إذا كان البحث بالرمز
    if (searchCode) {
      return item.productcode.toLowerCase().includes(searchCode)
    }
    
    // إذا كان البحث بالاسم
    if (searchName) {
      return item.productname.toLowerCase().includes(searchName)
    }
    
    return false
  })

  const updateSuggestionPosition = (inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      const newPosition = {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      }
      console.log("Updating position:", newPosition, "from rect:", rect)
      setSuggestionPosition(newPosition)
    }
  }

  const handleProductSearchCodeChange = (value: string) => {
    console.log("Search code changed:", value, "Inventory count:", inventory.length)
    setProductSearchCode(value)
    setProductSearchName("") // مسح حقل الاسم
    if (value.trim()) {
      setShowSuggestions(true)
      updateSuggestionPosition(codeInputRef)
    } else {
      setShowSuggestions(false)
    }
  }

  const handleProductSearchNameChange = (value: string) => {
    console.log("Search name changed:", value, "Inventory count:", inventory.length)
    setProductSearchName(value)
    setProductSearchCode("") // مسح حقل الرمز
    if (value.trim()) {
      setShowSuggestions(true)
      updateSuggestionPosition(nameInputRef)
    } else {
      setShowSuggestions(false)
    }
  }

  const selectProduct = (item: InventoryItem) => {
    console.log("Product selected:", item)
    setProductSearchCode(item.productcode)
    setProductSearchName(item.productname)
    setShowSuggestions(false)
    
    setNewItem({
      ...newItem,
      productcode: item.productcode,
      productname: item.productname,
      storeid: salestoreid,
      unitpriceiqd: item.sellpriceiqd,
      unitpriceusd: item.sellpriceusd,
    })
  }

  const addItemFromNew = () => {
    if (!newItem.productcode.trim() || !newItem.productname.trim()) {
      toast.error("الرجاء اختيار المادة")
      return
    }

    if (newItem.quantity <= 0) {
      toast.error("الرجاء إدخال كمية صحيحة")
      return
    }

    // التحقق من توفر الكمية في المخزن
    const inventoryItem = inventory.find((i) => i.productcode === newItem.productcode)
    if (inventoryItem && newItem.quantity > inventoryItem.quantity) {
      toast.error(`الكمية المتوفرة: ${inventoryItem.quantity} فقط`)
      return
    }

    const newProduct: SaleProductRow = {
      ...newItem,
      tempId: Date.now().toString(),
      totalpriceiqd: newItem.quantity * newItem.unitpriceiqd,
      totalpriceusd: newItem.quantity * newItem.unitpriceusd,
    }

    setProducts([...products, newProduct])
    toast.success("تمت إضافة المادة")

    // إعادة تعيين newItem والبحث
    setProductSearchCode("")
    setProductSearchName("")
    setShowSuggestions(false)
    
    setNewItem({
      tempId: "new-item",
      productcode: "",
      productname: "",
      storeid: salestoreid,
      quantity: 0,
      unitpriceiqd: 0,
      unitpriceusd: 0,
      totalpriceiqd: 0,
      totalpriceusd: 0,
      notes: "",
    })
  }

  const updateNewItem = (field: keyof SaleProductRow, value: string | number) => {
    const updated = { ...newItem, [field]: value }

    // حساب الإجمالي عند تغيير الكمية أو السعر
    if (field === "quantity" || field === "unitpriceiqd" || field === "unitpriceusd") {
      updated.totalpriceiqd = updated.quantity * updated.unitpriceiqd
      updated.totalpriceusd = updated.quantity * updated.unitpriceusd
    }

    // تحويل تلقائي بين العملات (مع التقريب لرقمين عشريين)
    if (field === "unitpriceiqd" && exchangeRate > 0) {
      updated.unitpriceusd = Math.round((Number(value) / exchangeRate) * 100) / 100
      updated.totalpriceusd = updated.quantity * updated.unitpriceusd
    }
    if (field === "unitpriceusd" && exchangeRate > 0) {
      updated.unitpriceiqd = Math.round((Number(value) * exchangeRate) * 100) / 100
      updated.totalpriceiqd = updated.quantity * updated.unitpriceiqd
    }

    setNewItem(updated)
  }

  const handleNewItemKeyPress = (e: React.KeyboardEvent, field: keyof SaleProductRow) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (field === "unitpriceusd" || field === "unitpriceiqd" || field === "notes") {
        addItemFromNew()
      }
    }
  }

  const updateProduct = (tempId: string, field: keyof SaleProductRow, value: string | number) => {
    setProducts(
      products.map((p) => {
        if (p.tempId === tempId) {
          const updated = { ...p, [field]: value }

          // حساب الإجمالي
          if (field === "quantity" || field === "unitpriceiqd" || field === "unitpriceusd") {
            updated.totalpriceiqd = updated.quantity * updated.unitpriceiqd
            updated.totalpriceusd = updated.quantity * updated.unitpriceusd
          }

          // تحويل تلقائي بين العملات (مع التقريب لرقمين عشريين)
          if (field === "unitpriceiqd" && exchangeRate > 0) {
            updated.unitpriceusd = Math.round((Number(value) / exchangeRate) * 100) / 100
            updated.totalpriceusd = updated.quantity * updated.unitpriceusd
          }
          if (field === "unitpriceusd" && exchangeRate > 0) {
            updated.unitpriceiqd = Math.round((Number(value) * exchangeRate) * 100) / 100
            updated.totalpriceiqd = updated.quantity * updated.unitpriceiqd
          }

          return updated
        }
        return p
      })
    )
  }

  const deleteProduct = (tempId: string) => {
    setProducts(products.filter((p) => p.tempId !== tempId))
    toast.success("تم حذف المادة")
  }

  // ============================================================
  // Calculations
  // ============================================================

  const totalProductsCount = products.filter((p) => p.productcode && p.quantity > 0).length

  const totalSaleIQD = products.reduce((sum, p) => sum + (p.totalpriceiqd || 0), 0)
  const totalSaleUSD = products.reduce((sum, p) => sum + (p.totalpriceusd || 0), 0)

  // المبلغ بعد الخصم
  const afterDiscountIQD = totalSaleIQD - (discountEnabled ? discountIQD : 0)
  const afterDiscountUSD = totalSaleUSD - (discountEnabled ? discountUSD : 0)

  // المبلغ النهائي (بعد الخصم وبعد خصم المبلغ الواصل)
  const finalTotalIQD = afterDiscountIQD - amountReceivedIQD
  const finalTotalUSD = afterDiscountUSD - amountReceivedUSD

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
  // Discount Handler
  // ============================================================

  const handleDiscountChange = (value: number) => {
    if (discountCurrency === "دينار") {
      setDiscountIQD(value)
      setDiscountUSD(0)
    } else {
      setDiscountUSD(value)
      setDiscountIQD(0)
    }
  }

  // ============================================================
  // Save Sale
  // ============================================================

  const handleSaveSale = async () => {
    // التحقق من البيانات
    if (!numberofsale.trim()) {
      toast.error("الرجاء إدخال رقم القائمة")
      return
    }

    if (!salestoreid) {
      toast.error("الرجاء اختيار المخزن")
      return
    }

    if (!customerid) {
      toast.error("الرجاء اختيار الزبون")
      return
    }

    const validProducts = products.filter((p) => p.productcode && p.quantity > 0)

    if (validProducts.length === 0) {
      toast.error("الرجاء إضافة مادة واحدة على الأقل")
      return
    }

    setIsSaving(true)

    try {
      const saleMain: SaleMain = {
        numberofsale,
        salestoreid,
        customerid,
        customername,
        pricetype,
        paytype,
        currencytype: currencyType,
        details,
        datetime,
        discountenabled: discountEnabled,
        discountcurrency: discountEnabled ? discountCurrency : undefined,
        discountiqd: discountIQD,
        discountusd: discountUSD,
        totalsaleiqd: totalSaleIQD,
        totalsaleusd: totalSaleUSD,
        amountreceivediqd: amountReceivedIQD,
        amountreceivedusd: amountReceivedUSD,
        finaltotaliqd: afterDiscountIQD,
        finaltotalusd: afterDiscountUSD,
      }

      const result = await createSale(
        saleMain,
        validProducts,
        salestoreid,
        paytype,
        currencyType
      )

      if (result.success) {
        toast.success("تم حفظ قائمة البيع بنجاح")

        // تصفير الجدول والنموذج للبدء بقائمة جديدة
        setProducts([])
        setDetails("")
        setHasAmountReceived(false)
        setAmountReceivedIQD(0)
        setAmountReceivedUSD(0)
        setDiscountEnabled(false)
        setDiscountIQD(0)
        setDiscountUSD(0)
        setDateTime(new Date().toISOString().slice(0, 16))
        
        // توليد رقم قائمة جديد
        generateSaleNumber()

        // إعادة تعيين newItem وحقول البحث
        setProductSearchCode("")
        setProductSearchName("")
        setShowSuggestions(false)
        
        setNewItem({
          tempId: "new-item",
          productcode: "",
          productname: "",
          storeid: salestoreid,
          quantity: 0,
          unitpriceiqd: 0,
          unitpriceusd: 0,
          totalpriceiqd: 0,
          totalpriceusd: 0,
          notes: "",
        })

        // إعادة تحميل المخزون
        if (salestoreid) {
          loadInventory(salestoreid)
        }
      } else {
        toast.error(result.error || "فشل حفظ قائمة البيع")
      }
    } catch (error) {
      console.error("Error saving sale:", error)
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
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            إضافة قائمة بيع
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <Card className="p-6">
        {/* الصف الأول */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {/* رقم القائمة */}
          <div className="space-y-2">
            <Label htmlFor="numberofsale">رقم القائمة (تلقائي)</Label>
            <Input
              id="numberofsale"
              value={numberofsale}
              readOnly
              className="bg-muted font-semibold"
              placeholder="S-00001"
            />
          </div>

          {/* نوع التسعير */}
          <div className="space-y-2">
            <Label>نوع التسعير</Label>
            <Select value={pricetype} onValueChange={(v: "جملة" | "مفرد") => setPriceType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="مفرد">مفرد</SelectItem>
                <SelectItem value="جملة">جملة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* نوع الدفع */}
          <div className="space-y-2">
            <Label>نوع الدفع</Label>
            <Select value={paytype} onValueChange={(v: "نقدي" | "آجل") => setPayType(v)}>
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

          {/* سعر الصرف */}
          <div className="space-y-2">
            <Label>سعر الصرف الحالي</Label>
            <div className="flex items-center h-10 px-3 rounded-md border bg-muted">
              <span className="font-semibold text-lg">{exchangeRate.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* الصف الثاني - الزبون والمخزن */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
          {/* اسم الزبون */}
          <div className="space-y-2 md:col-span-3">
            <Label>اسم الزبون</Label>
            <Select value={customerid} onValueChange={handleCustomerChange}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الزبون" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.customer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* رصيد الزبون السابق دينار */}
          <div className="space-y-2 md:col-span-2">
            <Label className="font-semibold text-blue-600 dark:text-blue-400">
              رصيد سابق دينار
            </Label>
            <div className="flex items-center h-10 px-3 rounded-md border bg-muted">
              <span className="font-semibold text-lg">
                {customerBalanceIQD.toLocaleString()}
              </span>
            </div>
          </div>

          {/* رصيد الزبون السابق دولار */}
          <div className="space-y-2 md:col-span-2">
            <Label className="font-semibold text-green-600 dark:text-green-400">
              رصيد سابق دولار
            </Label>
            <div className="flex items-center h-10 px-3 rounded-md border bg-muted">
              <span className="font-semibold text-lg">
                {customerBalanceUSD.toLocaleString()}
              </span>
            </div>
          </div>

          {/* المخزن */}
          <div className="space-y-2 md:col-span-3">
            <Label>المخزن</Label>
            <Select value={salestoreid} onValueChange={setSaleStoreId}>
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

          {/* Checkbox مبلغ واصل - يظهر فقط عند الآجل */}
          {paytype === "آجل" && (
            <div className="space-y-2 flex items-end">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasAmountReceived"
                  checked={hasAmountReceived}
                  onCheckedChange={(checked) => {
                    setHasAmountReceived(!!checked)
                    if (!checked) {
                      setAmountReceivedIQD(0)
                      setAmountReceivedUSD(0)
                    }
                  }}
                />
                <Label htmlFor="hasAmountReceived" className="cursor-pointer">
                  مبلغ واصل
                </Label>
              </div>
            </div>
          )}
        </div>

        {/* صف المبلغ الواصل */}
        {hasAmountReceived && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 rounded-lg bg-accent/50">
            <div className="space-y-2">
              <Label>عملة المبلغ الواصل</Label>
              <Select
                value={amountCurrency}
                onValueChange={(v: "دينار" | "دولار") => {
                  setAmountCurrency(v)
                  setAmountReceivedIQD(0)
                  setAmountReceivedUSD(0)
                }}
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
              <Label>المبلغ الواصل</Label>
              <Input
                type="number"
                value={
                  amountCurrency === "دينار" ? amountReceivedIQD : amountReceivedUSD
                }
                onChange={(e) => handleAmountReceivedChange(parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
        )}

        {/* الصف الثالث - التاريخ والملاحظات */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <Label>تاريخ العملية</Label>
            <Input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-3">
            <Label>ملاحظات</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="ملاحظات إضافية"
              rows={2}
            />
          </div>
        </div>

        {/* الخصم */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Checkbox
              id="discountEnabled"
              checked={discountEnabled}
              onCheckedChange={(checked) => {
                setDiscountEnabled(!!checked)
                if (!checked) {
                  setDiscountIQD(0)
                  setDiscountUSD(0)
                }
              }}
            />
            <Label htmlFor="discountEnabled" className="cursor-pointer font-semibold">
              تفعيل الخصم
            </Label>
          </div>

          {discountEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg bg-accent/50">
              <div className="space-y-2">
                <Label>عملة الخصم</Label>
                <Select
                  value={discountCurrency}
                  onValueChange={(v: "دينار" | "دولار") => {
                    setDiscountCurrency(v)
                    setDiscountIQD(0)
                    setDiscountUSD(0)
                  }}
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
                <Label>مبلغ الخصم</Label>
                <Input
                  type="number"
                  value={discountCurrency === "دينار" ? discountIQD : discountUSD}
                  onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
          )}
        </div>

        {/* جدول المواد */}
        <div className="mt-6 overflow-x-auto">
          <Table className="w-full rounded-lg overflow-hidden border border-border">
            <TableHeader className="bg-primary text-primary-foreground">
              <TableRow>
                <TableHead className="text-center w-16 text-primary-foreground">#</TableHead>
                <TableHead className="text-center w-16 text-primary-foreground">حذف</TableHead>
                <TableHead className="text-center min-w-[200px] text-primary-foreground">رمز المادة</TableHead>
                <TableHead className="text-center min-w-[250px] text-primary-foreground">اسم المادة</TableHead>
                <TableHead className="text-center w-24 text-primary-foreground">الكمية</TableHead>
                <TableHead className="text-center w-28 text-primary-foreground">س. مفرد دينار</TableHead>
                <TableHead className="text-center w-28 text-primary-foreground">س. مفرد دولار</TableHead>
                <TableHead className="text-center w-32 text-primary-foreground">إجمالي دينار</TableHead>
                <TableHead className="text-center w-32 text-primary-foreground">إجمالي دولار</TableHead>
                <TableHead className="text-center min-w-[150px] text-primary-foreground">ملاحظة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {/* صف الإضافة الجديد */}
            <TableRow className="bg-accent/10">
              <TableCell className="text-center">
                <span className="font-bold" style={{ color: "var(--theme-primary)" }}>جديد</span>
              </TableCell>
                <TableCell></TableCell>
                <TableCell>
                  <div style={{ minWidth: '200px' }}>
                    <Input
                      ref={codeInputRef}
                      value={productSearchCode}
                      onChange={(e) => handleProductSearchCodeChange(e.target.value)}
                      onFocus={() => {
                        setShowSuggestions(true)
                        updateSuggestionPosition(codeInputRef)
                      }}
                      placeholder="رمز المادة"
                      className="h-8 bg-green-50 dark:bg-green-950/20 text-foreground"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div style={{ minWidth: '250px' }}>
                    <Input
                      ref={nameInputRef}
                      value={productSearchName}
                      onChange={(e) => handleProductSearchNameChange(e.target.value)}
                      onFocus={() => {
                        setShowSuggestions(true)
                        updateSuggestionPosition(nameInputRef)
                      }}
                      placeholder="اسم المادة"
                      className="h-8 bg-green-50 dark:bg-green-950/20 text-foreground"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newItem.quantity || ""}
                    onChange={(e) =>
                      updateNewItem("quantity", parseFloat(e.target.value) || 0)
                    }
                    onKeyPress={(e) => handleNewItemKeyPress(e, "quantity")}
                    placeholder="0"
                    className="h-8 bg-green-50 dark:bg-green-950/20 text-foreground"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newItem.unitpriceiqd || ""}
                    onChange={(e) =>
                      updateNewItem("unitpriceiqd", parseFloat(e.target.value) || 0)
                    }
                    onKeyPress={(e) => handleNewItemKeyPress(e, "unitpriceiqd")}
                    placeholder="0"
                    className="h-8 bg-green-50 dark:bg-green-950/20 text-foreground"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newItem.unitpriceusd || ""}
                    onChange={(e) =>
                      updateNewItem("unitpriceusd", parseFloat(e.target.value) || 0)
                    }
                    onKeyPress={(e) => handleNewItemKeyPress(e, "unitpriceusd")}
                    placeholder="0"
                    className="h-8 bg-green-50 dark:bg-green-950/20 text-foreground"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newItem.totalpriceiqd.toFixed(2)}
                    readOnly
                    className="h-8 bg-muted text-foreground"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newItem.totalpriceusd.toFixed(2)}
                    readOnly
                    className="h-8 bg-muted text-foreground"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newItem.notes}
                    onChange={(e) => updateNewItem("notes", e.target.value)}
                    onKeyPress={(e) => handleNewItemKeyPress(e, "notes")}
                    placeholder="ملاحظة"
                    className="h-8 bg-green-50 dark:bg-green-950/20 text-foreground"
                  />
                </TableCell>
              </TableRow>

              {/* المواد المضافة */}
              {products.map((product, index) => (
                <TableRow key={product.tempId} className="bg-background">
                  <TableCell className="text-center text-foreground">{index + 1}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteProduct(product.tempId)}
                      className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Input
                        value={product.productcode}
                        readOnly
                        className="flex-1 h-8 bg-muted text-center text-foreground"
                        title={product.productcode}
                      />
                      {product.productcode.length > 10 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewingNote(product.productcode)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Input
                        value={product.productname}
                        readOnly
                        className="flex-1 h-8 bg-muted text-foreground"
                        title={product.productname}
                      />
                      {product.productname.length > 15 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewingNote(product.productname)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={product.quantity}
                      onChange={(e) =>
                        updateProduct(
                          product.tempId,
                          "quantity",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0"
                      className="h-8 text-foreground"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={product.unitpriceiqd}
                      onChange={(e) =>
                        updateProduct(
                          product.tempId,
                          "unitpriceiqd",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0"
                      className="h-8 text-foreground"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={product.unitpriceusd}
                      onChange={(e) =>
                        updateProduct(
                          product.tempId,
                          "unitpriceusd",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0"
                      className="h-8 text-foreground"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={product.totalpriceiqd.toFixed(2)}
                      readOnly
                      className="h-8 bg-muted text-foreground"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={product.totalpriceusd.toFixed(2)}
                      readOnly
                      className="h-8 bg-muted text-foreground"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Input
                        value={product.notes}
                        onChange={(e) =>
                          updateProduct(product.tempId, "notes", e.target.value)
                        }
                        placeholder="ملاحظة"
                        className="flex-1 h-8 text-foreground"
                        title={product.notes}
                      />
                      {product.notes && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewingNote(product.notes || "")}
                        >
                          <Eye className="h-4 w-4" />
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
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">عدد المواد:</span>
              <span className="font-bold text-lg">{totalProductsCount}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm">إجمالي دينار:</span>
              <span className="font-bold text-lg text-green-600 dark:text-green-400">
                {totalSaleIQD.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm">إجمالي دولار:</span>
              <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                {totalSaleUSD.toLocaleString()}
              </span>
            </div>

            {discountEnabled && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm">بعد الخصم دينار:</span>
                  <span className="font-bold text-lg text-purple-600 dark:text-purple-400">
                    {afterDiscountIQD.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm">بعد الخصم دولار:</span>
                  <span className="font-bold text-lg text-purple-600 dark:text-purple-400">
                    {afterDiscountUSD.toLocaleString()}
                  </span>
                </div>
              </>
            )}

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
                  <span className="text-sm">المتبقي دينار:</span>
                  <span className="font-bold text-lg text-orange-600 dark:text-orange-400">
                    {finalTotalIQD.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm">المتبقي دولار:</span>
                  <span className="font-bold text-lg text-orange-600 dark:text-orange-400">
                    {finalTotalUSD.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          <Button
            onClick={handleSaveSale}
            disabled={isSaving}
            size="lg"
            className="w-full md:w-auto mt-4"
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
                إضافة قائمة البيع
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Dialog عرض الملاحظة */}
      <Dialog open={viewingNote !== null} onOpenChange={(open) => !open && setViewingNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>التفاصيل</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="whitespace-pre-wrap">{viewingNote}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewingNote(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* قائمة الاقتراحات - Portal خارج الجدول */}
      {showSuggestions && filteredInventory.length > 0 && (
        <div 
          data-suggestions="true"
          style={{
            position: 'fixed',
            top: `${suggestionPosition.top}px`,
            left: `${suggestionPosition.left}px`,
            zIndex: 9999,
            width: '500px',
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: 'white',
            border: '2px solid #333',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          }}
          className="dark:bg-gray-800"
        >
          <div style={{ padding: '8px', backgroundColor: '#f0f0f0', borderBottom: '1px solid #ddd' }} className="dark:bg-gray-700">
            <strong>عدد النتائج: {filteredInventory.length}</strong>
          </div>
          {filteredInventory.slice(0, 20).map((item) => (
            <div
              key={item.productcode}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee',
              }}
              className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
              onClick={() => selectProduct(item)}
            >
              <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px', color: '#0066cc' }}>
                {item.productcode}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '6px' }} className="dark:text-gray-300">
                {item.productname}
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                <span style={{ color: '#16a34a' }}>
                  دينار: {item.sellpriceiqd?.toLocaleString() || 0}
                </span>
                <span style={{ color: '#2563eb' }}>
                  دولار: {item.sellpriceusd?.toLocaleString() || 0}
                </span>
                <span style={{ color: '#ea580c' }}>
                  متوفر: {item.quantity || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
