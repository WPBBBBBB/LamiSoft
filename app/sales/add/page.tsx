"use client";
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createPortal } from "react-dom"
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
import { ArrowRight, Trash2, Loader2, Save, Eye, Plus, Printer } from "lucide-react"
import { toast } from "sonner"
import { getActiveStores, type Store } from "@/lib/stores-operations"
import {
  getAllCustomers,
  getInventoryByStore,
  createSale,
  updateSale,
  getSaleById,
  getSaleDetails,
  type Customer,
  type InventoryItem,
  type SaleProductRow,
  type SaleMain,
} from "@/lib/sales-operations"
import { createCustomer } from "@/lib/supabase-operations"
import { getCurrentExchangeRate } from "@/lib/exchange-rate-operations"
import { logAction } from "@/lib/system-log-operations"
import { useSettings } from "@/components/providers/settings-provider"
import { t } from "@/lib/translations"

export default function SaleAddPage() {
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const lang = currentLanguage.code
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")
  const viewMode = searchParams.get("view") === "true"

  const [isEditMode, setIsEditMode] = useState(false)
  const [isViewMode, setIsViewMode] = useState(false)
  const [loadingEditData, setLoadingEditData] = useState(false)

  const [numberofsale, setNumberOfSale] = useState("")
  const [pricetype, setPriceType] = useState<"جملة" | "مفرد">("مفرد")
  const [paytype, setPayType] = useState<"نقدي" | "آجل">("نقدي")
  const [currencyType, setCurrencyType] = useState<"دينار" | "دولار">("دينار")
  const [salestoreid, setSaleStoreId] = useState("")
  const [datetime, setDateTime] = useState("")
  const [details, setDetails] = useState("")
  const [barcode, setBarcode] = useState("");

  const [customerid, setCustomerId] = useState("");
  const [customername, setCustomerName] = useState("")
  const [customerBalanceIQD, setCustomerBalanceIQD] = useState(0)
  const [customerBalanceUSD, setCustomerBalanceUSD] = useState(0)
  const [searchCustomer, setSearchCustomer] = useState("")
  const [customerSelectOpen, setCustomerSelectOpen] = useState(false)
  const customerDropdownRef = useRef<HTMLDivElement>(null)

  const [hasAmountReceived, setHasAmountReceived] = useState(false)
  const [amountCurrency, setAmountCurrency] = useState<"دينار" | "دولار">("دينار")
  const [amountReceivedIQD, setAmountReceivedIQD] = useState(0)
  const [amountReceivedUSD, setAmountReceivedUSD] = useState(0)

  const [discountEnabled, setDiscountEnabled] = useState(false)
  const [discountCurrency, setDiscountCurrency] = useState<"دينار" | "دولار">("دينار")
  const [discountIQD, setDiscountIQD] = useState<number | "">(0)
  const [discountUSD, setDiscountUSD] = useState<number | "">(0)

  const [stores, setStores] = useState<Store[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])

  const [exchangeRate, setExchangeRate] = useState(1500)

  const [productSearchCode, setProductSearchCode] = useState("")
  const [productSearchName, setProductSearchName] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const codeInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [products, setProducts] = useState<SaleProductRow[]>([])

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

  const [isSaving, setIsSaving] = useState(false)
  const saveInFlightRef = useRef(false)

  const [viewingNote, setViewingNote] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)
    loadInitialData()
    
    if (editId) {
      setIsEditMode(true)
      setIsViewMode(viewMode)
      loadEditData(editId)
    } else {
      generateSaleNumber().then((saleNumber) => {
        setBarcode(saleNumber);
      })
      const now = new Date()
      setDateTime(now.toISOString().slice(0, 16))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, viewMode])

  useEffect(() => {
    if (salestoreid) {
      loadInventory(salestoreid)
    }
  }, [salestoreid]);

  useEffect(() => {
    if (!isEditMode && numberofsale) {
      setBarcode(numberofsale);
    }
  }, [numberofsale, isEditMode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        codeInputRef.current && !codeInputRef.current.contains(target) &&
        nameInputRef.current && !nameInputRef.current.contains(target) &&
        !target.closest('[data-suggestions]')
      ) {
        setShowSuggestions(false)
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(target)) {
        setCustomerSelectOpen(false)
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

      if (storesData.length > 0) {
        setSaleStoreId(storesData[0].id)
      }
      
      const newCustomerId = !editId ? searchParams.get("customerId") : null
      if (newCustomerId) {
        const refreshedCustomers = await getAllCustomers()
        setCustomers(refreshedCustomers)
        
        const newCustomer = refreshedCustomers.find(c => c.id === newCustomerId)
        if (newCustomer) {
          setCustomerId(newCustomer.id)
          setCustomerName(newCustomer.customer_name)
          setCustomerBalanceIQD(newCustomer.balanceiqd ?? 0)
          setCustomerBalanceUSD(newCustomer.balanceusd ?? 0)
          setSearchCustomer("")

          toast.success(t("saleCustomerSelected", lang).replace("{name}", newCustomer.customer_name))
        }
      }
    } catch {
      toast.error(t("failedLoadData", lang))
    }
  }

  const generateSaleNumber = async (): Promise<string> => {
    try {
      const { generateNextSaleNumber } = await import("@/lib/sales-operations")
      const newNumber = await generateNextSaleNumber()
      setNumberOfSale(newNumber)
      return newNumber
    } catch {
      toast.error(t("failedGenerateSaleNumber", lang))
      return ""
    }
  }

  const loadEditData = async (saleId: string) => {
    try {
      setLoadingEditData(true)
      
      const saleData = await getSaleById(saleId)
      if (!saleData) {
        toast.error(t("saleNotFound", lang))
        router.push("/reports")
        return
      }

      setNumberOfSale(saleData.numberofsale)
      setPriceType(saleData.pricetype)
      setPayType(saleData.paytype)
      setCurrencyType(saleData.currencytype)
      setSaleStoreId(saleData.salestoreid)
      setDateTime(new Date(saleData.datetime).toISOString().slice(0, 16))
      setDetails(saleData.details || "")
      setBarcode(saleData.barcode || "");
      
      setCustomerId(saleData.customerid);
      setCustomerName(saleData.customername)
      setSearchCustomer("")
      
      try {
        const { getCustomerById } = await import("@/lib/sales-operations")
        const customerData = await getCustomerById(saleData.customerid)
        if (customerData) {
          setCustomerName(customerData.customer_name)
          setCustomerBalanceIQD(customerData.balanceiqd ?? 0)
          setCustomerBalanceUSD(customerData.balanceusd ?? 0)
        }
      } catch {}
      
      setDiscountEnabled(saleData.discountenabled)
      setDiscountCurrency(saleData.discountcurrency || "دينار")
      setDiscountIQD(saleData.discountiqd)
      setDiscountUSD(saleData.discountusd)
      
      const hasAmount = saleData.amountreceivediqd > 0 || saleData.amountreceivedusd > 0
      setHasAmountReceived(hasAmount)
      setAmountReceivedIQD(saleData.amountreceivediqd)
      setAmountReceivedUSD(saleData.amountreceivedusd)
      
      const details = await getSaleDetails(saleId)
      const productsWithTempId = details.map((detail, index) => ({
        ...detail,
        tempId: `product-${index}`,
      }))
      setProducts(productsWithTempId)

      toast.success(t("saleDataLoaded", lang))
    } catch {
      toast.error(t("failedLoadSaleData", lang))
      router.push("/reports")
    } finally {
      setLoadingEditData(false)
    }
  }

  const loadInventory = async (storeId: string) => {
    try {
      const items = await getInventoryByStore(storeId)
      setInventory(items)
      if (items.length === 0) {
        toast.info(t("noInventoryInStore", lang))
      } else {
        toast.success(t("inventoryLoadedCount", lang).replace("{count}", String(items.length)))
      }
    } catch {
      toast.error(t("failedLoadInventory", lang))
    }
  }

  const handleCustomerChange = async (customerId: string) => {
    setCustomerId(customerId)
    const customer = customers.find((c) => c.id === customerId)

    if (customer) {
      setCustomerName(customer.customer_name)
      setCustomerBalanceIQD(customer.balanceiqd ?? 0)
      setCustomerBalanceUSD(customer.balanceusd ?? 0)
    }
  }

  const handleCreateNewCustomer = async (customerName: string) => {
    try {
      const newCustomer = await createCustomer({
        customer_name: customerName.trim(),
        type: 'زبون',
        balanceiqd: 0,
        balanceusd: 0,
      });
      
      const customerData: Customer = {
        id: newCustomer.id,
        customer_name: newCustomer.customer_name,
        type: newCustomer.type,
        balanceiqd: newCustomer.balanceiqd ?? 0,
        balanceusd: newCustomer.balanceusd ?? 0,
      };
      setCustomers([customerData, ...customers]);
      
      setCustomerId(newCustomer.id);
      setCustomerName(newCustomer.customer_name)
      setCustomerBalanceIQD(0)
      setCustomerBalanceUSD(0)
      setSearchCustomer("")
      setCustomerSelectOpen(false)
      
      toast.success(t("saleCustomerAdded", lang).replace("{name}", newCustomer.customer_name))
      
      return newCustomer
    } catch (error) {
      toast.error(t("saleCustomerAddFailed", lang))
      throw error
    }
  }

  const filteredInventory = inventory.filter((item) => {
    const searchCode = productSearchCode.toLowerCase().trim()
    const searchName = productSearchName.toLowerCase().trim()
    
    if (searchCode) {
      const matches = item.productcode.toLowerCase().includes(searchCode)
      return matches
    }
    
    if (searchName) {
      const matches = item.productname.toLowerCase().includes(searchName)
      return matches
    }
    
    return false
  })
  
  const updateSuggestionPosition = (inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (inputRef.current) {
      inputRef.current.getBoundingClientRect();
    }
  }

  const handleProductSearchCodeChange = (value: string) => {
    setProductSearchCode(value)
    setProductSearchName("")
    
    setTimeout(() => updateSuggestionPosition(codeInputRef), 10)
    
    if (value.trim()) {
      setShowSuggestions(true)
      } else {
      setShowSuggestions(false)
    }
  }

  const handleProductSearchNameChange = (value: string) => {
    setProductSearchName(value)
    setProductSearchCode("")
    
    setTimeout(() => updateSuggestionPosition(nameInputRef), 10)
    
    if (value.trim()) {
      setShowSuggestions(true)
      } else {
      setShowSuggestions(false)
    }
  }

  const selectProduct = (item: InventoryItem) => {
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
      toast.error(t("saleSelectProductRequired", lang))
      return
    }

    if (newItem.quantity <= 0) {
      toast.error(t("saleEnterValidQuantity", lang))
      return
    }

    const availableQuantity = inventory
      .filter((i) => i.productcode === newItem.productcode)
      .reduce((sum, i) => sum + Number(i.quantity || 0), 0)

    if (availableQuantity > 0 && newItem.quantity > availableQuantity) {
      toast.error(t("saleAvailableQuantityOnly", lang).replace("{qty}", String(availableQuantity)))
      return
    }

    const newProduct: SaleProductRow = {
      ...newItem,
      tempId: Date.now().toString(),
      totalpriceiqd: newItem.quantity * newItem.unitpriceiqd,
      totalpriceusd: newItem.quantity * newItem.unitpriceusd,
    }

    setProducts([...products, newProduct])
    toast.success(t("saleItemAdded", lang))

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

    if (field === "quantity" || field === "unitpriceiqd" || field === "unitpriceusd") {
      updated.totalpriceiqd = updated.quantity * updated.unitpriceiqd
      updated.totalpriceusd = updated.quantity * updated.unitpriceusd
    }

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

  const handleNewItemKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      
      if (newItem.productcode && newItem.quantity > 0) {
        addItemFromNew()
      }
    }
  }

  const updateProduct = (tempId: string, field: keyof SaleProductRow, value: string | number) => {
    setProducts(
      products.map((p) => {
        if (p.tempId === tempId) {
          const updated = { ...p, [field]: value }

          if (field === "quantity" || field === "unitpriceiqd" || field === "unitpriceusd") {
            updated.totalpriceiqd = updated.quantity * updated.unitpriceiqd
            updated.totalpriceusd = updated.quantity * updated.unitpriceusd
          }

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
    toast.success(t("itemDeleted", lang))
  }

  const totalProductsCount = products.filter((p) => p.productcode && p.quantity > 0).length

  const totalSaleIQD = products.reduce((sum, p) => sum + (p.totalpriceiqd || 0), 0)
  const totalSaleUSD = products.reduce((sum, p) => sum + (p.totalpriceusd || 0), 0)

  const discountIQDNumber = typeof discountIQD === "number" ? discountIQD : 0
  const discountUSDNumber = typeof discountUSD === "number" ? discountUSD : 0

  const afterDiscountIQD = totalSaleIQD - (discountEnabled ? discountIQDNumber : 0)
  const afterDiscountUSD = totalSaleUSD - (discountEnabled ? discountUSDNumber : 0)

  const finalTotalIQD = afterDiscountIQD - amountReceivedIQD
  const finalTotalUSD = afterDiscountUSD - amountReceivedUSD

  const handleAmountReceivedChange = (value: number) => {
    if (amountCurrency === "دينار") {
      setAmountReceivedIQD(value)
      setAmountReceivedUSD(0)
    } else {
      setAmountReceivedUSD(value)
      setAmountReceivedIQD(0)
    }
  }

  const handleDiscountChange = (rawValue: string) => {
    if (rawValue === "") {
      if (discountCurrency === "دينار") {
        setDiscountIQD("")
        setDiscountUSD(0)
      } else {
        setDiscountUSD("")
        setDiscountIQD(0)
      }
      return
    }

    const parsed = Number(rawValue)
    if (Number.isNaN(parsed)) return

    const clamped = Math.max(0, parsed)
    if (discountCurrency === "دينار") {
      setDiscountIQD(clamped)
      setDiscountUSD(0)
    } else {
      setDiscountUSD(clamped)
      setDiscountIQD(0)
    }
  }

  const handleSaveSale = async () => {
    if (saveInFlightRef.current || isSaving) return

    if (isViewMode) {
      toast.error(t("cannotSaveInViewMode", lang))
      return
    }

    if (!numberofsale.trim()) {
      toast.error(t("enterSaleNumberRequired", lang))
      return
    }

    if (!salestoreid) {
      toast.error(t("selectStoreRequired", lang))
      return
    }

    if (!customerid) {
      toast.error(t("selectCustomerRequired", lang))
      return
    }

    const validProducts = products.filter((p) => p.productcode && p.quantity > 0)

    if (validProducts.length === 0) {
      toast.error(t("addAtLeastOneItem", lang))
      return
    }

    saveInFlightRef.current = true
    setIsSaving(true)

    try {
      const saleMain: SaleMain = {
        numberofsale,
        barcode,
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
        discountiqd: discountIQDNumber,
        discountusd: discountUSDNumber,
        totalsaleiqd: totalSaleIQD,
        totalsaleusd: totalSaleUSD,
        amountreceivediqd: amountReceivedIQD,
        amountreceivedusd: amountReceivedUSD,
        finaltotaliqd: afterDiscountIQD,
        finaltotalusd: afterDiscountUSD,
      }

      const result = isEditMode && editId
        ? await updateSale(
            editId,
            saleMain,
            validProducts,
            salestoreid
          )
        : await createSale(
            saleMain,
            validProducts,
            salestoreid,
            paytype,
            currencyType
          )

      if (result.success) {
        const total = finalTotalIQD || finalTotalUSD
        const currency = finalTotalIQD ? 'IQD' : 'USD'
        const selectedCustomer = customers.find(c => c.id === customerid)
        const selectedStore = stores.find(s => s.id === salestoreid)
        
        if (isEditMode) {
          await logAction(
            "المبيعات",
            `تم تعديل قائمة بيع رقم ${numberofsale} للزبون: ${selectedCustomer?.customer_name || t("unknownUser", lang)}`,
            "تعديل",
            undefined,
            undefined,
            {
              numberoflist: numberofsale,
              customername: selectedCustomer?.customer_name,
              totalsales: total,
              currency: currency,
              paytype: paytype,
              items_count: validProducts.length
            }
          )
        } else {
          await logAction(
            "المبيعات",
            `تم إضافة قائمة بيع جديدة رقم ${numberofsale} للزبون: ${selectedCustomer?.customer_name || t("unknownUser", lang)} بمبلغ ${total.toLocaleString()} ${currency}`,
            "إضافة",
            undefined,
            undefined,
            {
              numberoflist: numberofsale,
              customername: selectedCustomer?.customer_name,
              totalsales: total,
              currency: currency,
              paytype: paytype,
              items_count: validProducts.length,
              storename: selectedStore?.storename
            }
          )
          
          for (const product of validProducts) {
            await logAction(
              "المبيعات",
              `تم بيع المنتج ${product.productname} بكمية ${product.quantity}`,
              "بيع منتج",
              undefined,
              undefined,
              {
                productcode: product.productcode,
                productname: product.productname,
                quantity: product.quantity,
                storename: selectedStore?.storename,
                from_sale: numberofsale
              }
            )
          }
        }

        toast.success(isEditMode ? t("saleUpdatedSuccess", lang) : t("saleSavedSuccess", lang))

        setProducts([])
        setDetails("")
        setHasAmountReceived(false)
        setAmountReceivedIQD(0)
        setAmountReceivedUSD(0)
        setDiscountEnabled(false)
        setDiscountIQD(0)
        setDiscountUSD(0)
        setDateTime(new Date().toISOString().slice(0, 16))
        
        generateSaleNumber()

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

        if (salestoreid) {
          loadInventory(salestoreid)
        }
      } else {
        toast.error(result.error || t("saleSaveFailed", lang))
      }
    } catch {
      toast.error(t("saleSaveError", lang))
    } finally {
      setIsSaving(false)
      saveInFlightRef.current = false
    }
  }
  
  const handlePrintInvoice = () => {
    if (!customerid || !customername) {
      toast.error(t("selectCustomerRequired", lang))
      return
    }

    if (products.length === 0) {
      toast.error(t("addAtLeastOneItem", lang))
      return
    }

    const selectedStore = stores.find(s => s.id === salestoreid)
    const storeName = selectedStore?.storename || t("mainStore", lang)

    const isExistingSale = Boolean(editId)
    const receivedIQD = hasAmountReceived ? amountReceivedIQD : 0
    const receivedUSD = hasAmountReceived ? amountReceivedUSD : 0

    const reportData = {
      type: "sale",
      storeName: storeName,
      customerName: customername,
      priceType: pricetype,
      payType: paytype,
      currencyType: currencyType,
      items: products.map(p => ({
        productname: p.productname,
        quantity: p.quantity,
        unitpriceiqd: p.unitpriceiqd,
        unitpriceusd: p.unitpriceusd,
        totalpriceiqd: p.totalpriceiqd,
        totalpriceusd: p.totalpriceusd,
      })),
      totalIQD: afterDiscountIQD,
      totalUSD: afterDiscountUSD,
      discountIQD: discountEnabled ? discountIQDNumber : 0,
      discountUSD: discountEnabled ? discountUSDNumber : 0,
      amountReceivedIQD: hasAmountReceived ? amountReceivedIQD : 0,
      amountReceivedUSD: hasAmountReceived ? amountReceivedUSD : 0,
      datetime: datetime || new Date().toISOString(),
      saleNumber: numberofsale,
      barcode: barcode || numberofsale,
      previousBalanceIQD: paytype === "آجل"
        ? isExistingSale
          ? (customerBalanceIQD ?? 0) - Math.max(0, afterDiscountIQD - receivedIQD)
          : (customerBalanceIQD ?? 0)
        : (customerBalanceIQD ?? 0),
      nextBalanceIQD:
        paytype === "آجل"
          ? isExistingSale
            ? (customerBalanceIQD ?? 0)
            : (customerBalanceIQD ?? 0) + Math.max(0, afterDiscountIQD - receivedIQD)
          : (customerBalanceIQD ?? 0),
      previousBalanceUSD:
        paytype === "آجل"
          ? isExistingSale
            ? (customerBalanceUSD ?? 0) - Math.max(0, afterDiscountUSD - receivedUSD)
            : (customerBalanceUSD ?? 0)
          : (customerBalanceUSD ?? 0),
      nextBalanceUSD:
        paytype === "آجل"
          ? isExistingSale
            ? (customerBalanceUSD ?? 0)
            : (customerBalanceUSD ?? 0) + Math.max(0, afterDiscountUSD - receivedUSD)
          : (customerBalanceUSD ?? 0),
    }

    const jsonString = JSON.stringify(reportData)
    const utf8Bytes = new TextEncoder().encode(jsonString)
    const base64Data = btoa(String.fromCharCode(...utf8Bytes))
    const encodedData = encodeURIComponent(base64Data)

    window.open(`/report?s=${encodedData}`, '_blank')
  }

  return (
    <>
      {isSaving && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          aria-busy="true"
          role="status"
        >
          <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">{t("savingSaleList", lang)}</span>
          </div>
        </div>
      )}
      <div className="container mx-auto p-6 space-y-6">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowRight className="h-5 w-5 theme-icon" />
            </Button>
            <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
              {isViewMode ? t("viewSale", lang) : isEditMode ? t("editSale", lang) : t("addSaleList", lang)}
            </h1>
          </div>
          {loadingEditData && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("loadingSaleData", lang)}</span>
            </div>
          )}
        </div>

        <Card className="p-6">

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">

            <div className="space-y-2">
              <Label htmlFor="numberofsale">{t("saleNumberAuto", lang)}</Label>
              <Input
                id="numberofsale"
                value={numberofsale}
                readOnly
                className="bg-muted font-semibold"
                placeholder="S-00001"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("priceType", lang)}</Label>
              <Select value={pricetype} onValueChange={(v: "جملة" | "مفرد") => setPriceType(v)} disabled={isViewMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="مفرد">{t("retail", lang)}</SelectItem>
                  <SelectItem value="جملة">{t("wholesale", lang)}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("paymentType", lang)}</Label>
              <Select value={paytype} onValueChange={(v: "نقدي" | "آجل") => setPayType(v)} disabled={isViewMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="نقدي">{t("cash", lang)}</SelectItem>
                  <SelectItem value="آجل">{t("credit", lang)}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("currency", lang)}</Label>
              <Select
                value={currencyType}
                onValueChange={(v: "دينار" | "دولار") => setCurrencyType(v)}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="دينار">{t("dinar", lang)}</SelectItem>
                  <SelectItem value="دولار">{t("dollar", lang)}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("exchangeRate", lang)}</Label>
              <div className="flex items-center h-10 px-3 rounded-md border bg-muted">
                <span className="font-semibold text-lg">{exchangeRate.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">

            <div className="space-y-2 md:col-span-3">
              <Label>{t("customerNameLabel", lang)}</Label>
              <div className="relative" ref={customerDropdownRef}>
                <Input
                  placeholder={t("searchForCustomer", lang)}
                  value={searchCustomer || customername || ""}
                  onChange={(e) => {
                    setSearchCustomer(e.target.value)
                    setCustomerSelectOpen(true)
                    if (!e.target.value) {
                      setCustomerId("")
                      setCustomerName("")
                      setCustomerBalanceIQD(0)
                      setCustomerBalanceUSD(0)
                    }
                  }}
                  onFocus={() => setCustomerSelectOpen(true)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && searchCustomer) {
                      const filteredCustomers = customers.filter((customer) =>
                        customer.customer_name.toLowerCase().includes(searchCustomer.toLowerCase())
                      )
                      
                      if (filteredCustomers.length === 0) {
                        e.preventDefault();
                        await handleCreateNewCustomer(searchCustomer)
                      } else if (filteredCustomers.length === 1) {
                        e.preventDefault();
                        handleCustomerChange(filteredCustomers[0].id)
                        setSearchCustomer("")
                        setCustomerSelectOpen(false)
                      }
                    }
                  }}
                  disabled={isViewMode}
                />
                {customerSelectOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-[300px] overflow-y-auto">
                    {(() => {
                      const filteredCustomers = customers.filter((customer) =>
                        customer.customer_name.toLowerCase().includes((searchCustomer || "").toLowerCase())
                      )
                      
                      if (filteredCustomers.length === 0) {
                        return (
                          <div className="px-3 py-3 text-center space-y-1">
                            <div className="text-sm text-muted-foreground">
                              {t("saleCustomerNotFound", lang)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t("salePressEnterToAddCustomer", lang).split("{key}")[0]}
                              <kbd className="px-1.5 py-0.5 text-xs font-semibold border rounded bg-muted">Enter</kbd>
                              {t("salePressEnterToAddCustomer", lang).split("{key}")[1]}
                            </div>
                          </div>
                        )
                      }
                      
                      return filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleCustomerChange(customer.id)
                            setCustomerSelectOpen(false)
                            setSearchCustomer("")
                          }}
                          className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        >
                          {customer.customer_name}
                        </div>
                      ))
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="font-semibold text-blue-600 dark:text-blue-400">
                {t("previousBalanceIQD", lang)}
              </Label>
              <div className="flex items-center h-10 px-3 rounded-md border bg-muted">
                <span className="font-semibold text-lg">
                  {customerBalanceIQD.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="font-semibold text-green-600 dark:text-green-400">
                {t("previousBalanceUSD", lang)}
              </Label>
              <div className="flex items-center h-10 px-3 rounded-md border bg-muted">
                <span className="font-semibold text-lg">
                  {customerBalanceUSD.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label>{t("store", lang)}</Label>
              <Select value={salestoreid} onValueChange={setSaleStoreId} disabled={isViewMode}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectStore", lang)} />
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
                    disabled={isViewMode}
                  />
                  <Label htmlFor="hasAmountReceived" className="cursor-pointer">
                    {t("amountReceived", lang)}
                  </Label>
                </div>
              </div>
            )}
          </div>

          {hasAmountReceived && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 rounded-lg bg-accent/50">
              <div className="space-y-2">
                <Label>{t("amountReceivedCurrency", lang)}</Label>
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
                    <SelectItem value="دينار">{t("dinar", lang)}</SelectItem>
                    <SelectItem value="دولار">{t("dollar", lang)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("amountReceived", lang)}</Label>
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label>{t("dateTime", lang)}</Label>
              <Input
                type="datetime-local"
                value={datetime}
                onChange={(e) => setDateTime(e.target.value)}
                readOnly={isViewMode}
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label>{t("notes", lang)}</Label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t("additionalNotes", lang)}
                rows={2}
                readOnly={isViewMode}
              />
            </div>
          </div>

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
                disabled={isViewMode}
              />
              <Label htmlFor="discountEnabled" className="cursor-pointer font-semibold">
                {t("enableDiscount", lang)}
              </Label>
            </div>

            {discountEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg bg-accent/50">
                <div className="space-y-2">
                  <Label>{t("discountCurrency", lang)}</Label>
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
                      <SelectItem value="دينار">{t("dinar", lang)}</SelectItem>
                      <SelectItem value="دولار">{t("dollar", lang)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("discountAmount", lang)}</Label>
                  <Input
                    type="number"
                    value={discountCurrency === "دينار" ? discountIQD : discountUSD}
                    min={0}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: "var(--theme-surface)", borderLeft: "4px solid var(--theme-primary)" }}>
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: "var(--theme-text)" }}>{t("itemsCount", lang)}:</span>
                <span className="font-bold text-lg" style={{ color: "var(--theme-text)" }}>{totalProductsCount}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "var(--theme-text)" }}>{t("totalIQD", lang)}:</span>
                <span className="font-bold text-lg text-green-600 dark:text-green-400">
                  {totalSaleIQD.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "var(--theme-text)" }}>{t("totalUSD", lang)}:</span>
                <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                  {totalSaleUSD.toLocaleString()}
                </span>
              </div>

              {discountEnabled && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: "var(--theme-text)" }}>{t("afterDiscountIQD", lang)}:</span>
                    <span className="font-bold text-lg text-purple-600 dark:text-purple-400">
                      {afterDiscountIQD.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: "var(--theme-text)" }}>{t("afterDiscountUSD", lang)}:</span>
                    <span className="font-bold text-lg text-purple-600 dark:text-purple-400">
                      {afterDiscountUSD.toLocaleString()}
                    </span>
                  </div>
                </>
              )}

              {hasAmountReceived && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: "var(--theme-text)" }}>{t("receivedIQD", lang)}:</span>
                    <span className="font-bold text-lg" style={{ color: "var(--theme-text)" }}>{amountReceivedIQD.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: "var(--theme-text)" }}>{t("receivedUSD", lang)}:</span>
                    <span className="font-bold text-lg" style={{ color: "var(--theme-text)" }}>{amountReceivedUSD.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: "var(--theme-text)" }}>{t("remainingIQD", lang)}:</span>
                    <span className="font-bold text-lg text-orange-600 dark:text-orange-400">
                      {finalTotalIQD.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: "var(--theme-text)" }}>{t("remainingUSD", lang)}:</span>
                    <span className="font-bold text-lg text-orange-600 dark:text-orange-400">
                      {finalTotalUSD.toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mt-6 space-y-2">
           
            
            
            <div className="rounded-lg border overflow-auto w-full" style={{ maxHeight: "1200px" }}>
            <Table>
              <TableHeader>
                <TableRow
                  style={{
                    background: "linear-gradient(to right, var(--theme-surface), var(--theme-accent))",
                  }}
                >
                  <TableHead className="text-center" style={{ color: "var(--theme-text)" }}>#</TableHead>
                  <TableHead className="text-center" style={{ color: "var(--theme-text)" }}>{t("delete", lang)}</TableHead>
                  <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>{t("productCode", lang)}</TableHead>
                  <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>{t("productName", lang)}</TableHead>
                  <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>{t("quantity", lang)}</TableHead>
                  <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>{t("saleRetailPriceIQD", lang)}</TableHead>
                  <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>{t("saleRetailPriceUSD", lang)}</TableHead>
                  <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>{t("totalIQD", lang)}</TableHead>
                  <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>{t("totalUSD", lang)}</TableHead>
                  <TableHead className="text-right" style={{ color: "var(--theme-text)" }}>{t("notes", lang)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>

                {!isViewMode && (
                <TableRow style={{ backgroundColor: "var(--theme-accent)", opacity: 0.9 }}>
                  <TableCell className="text-center font-bold" style={{ color: "var(--theme-text)" }}>
                    {t("new", lang)}
                  </TableCell>
                    <TableCell className="text-center">
                      <Plus className="h-5 w-5 theme-success mx-auto" />
                    </TableCell>
                    <TableCell>
                      <div style={{ minWidth: '120px', width: '120px', position: 'relative' }}>
                        <Input
                          ref={codeInputRef}
                          value={productSearchCode}
                          onChange={(e) => handleProductSearchCodeChange(e.target.value)}
                          onFocus={() => {
                            setShowSuggestions(true)
                            updateSuggestionPosition(codeInputRef)
                          }}
                          placeholder={t("productCode", lang)}
                          className="h-8 bg-green-50 dark:bg-green-950/20 text-foreground"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div style={{ minWidth: '150px', width: '150px', position: 'relative' }}>
                        <Input
                          ref={nameInputRef}
                          value={productSearchName}
                          onChange={(e) => handleProductSearchNameChange(e.target.value)}
                          onFocus={() => {
                            setShowSuggestions(true)
                            updateSuggestionPosition(nameInputRef)
                          }}
                          placeholder={t("productName", lang)}
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
                        onKeyPress={(e) => handleNewItemKeyPress(e)}
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
                        onKeyPress={(e) => handleNewItemKeyPress(e)}
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
                        onKeyPress={(e) => handleNewItemKeyPress(e)}
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
                        onKeyPress={(e) => handleNewItemKeyPress(e)}
                        placeholder={t("notes", lang)}
                        className="h-8 bg-green-50 dark:bg-green-950/20 text-foreground"
                      />
                    </TableCell>
                  </TableRow>
                )}

                {products.map((product, index) => (
                  <TableRow key={product.tempId} className="bg-background">
                    <TableCell className="text-center text-foreground">{index + 1}</TableCell>
                    <TableCell className="text-center">
                      {!isViewMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteProduct(product.tempId)}
                          className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4 theme-danger" />
                        </Button>
                      )}
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
                            <Eye className="h-4 w-4 theme-info" />
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
                            <Eye className="h-4 w-4 theme-info" />
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
                          placeholder={t("notes", lang)}
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
                            <Eye className="h-4 w-4 theme-info" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>

          {!isViewMode && (
            <div className="mt-6 flex gap-3 flex-wrap">
              <Button
                onClick={handleSaveSale}
                disabled={isSaving}
                size="lg"
                className="flex-1 md:flex-initial"
                style={{ backgroundColor: "var(--theme-primary)", color: "white" }}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 ml-2 animate-spin theme-icon" />
                    {t("saving", lang)}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 ml-2 theme-success" />
                    {isEditMode ? t("updateSaleList", lang) : t("addSaleList", lang)}
                  </>
                )}
              </Button>

              <Button
                onClick={handlePrintInvoice}
                disabled={isSaving || products.length === 0}
                size="lg"
                variant="outline"
                className="flex-1 md:flex-initial"
              >
                <Printer className="h-5 w-5 ml-2" />
                {t("printInvoice", lang)}
              </Button>
            </div>
          )}

          {isViewMode && (
            <div className="mt-6">
              <Button
                onClick={handlePrintInvoice}
                size="lg"
                className="w-full md:w-auto"
              >
                <Printer className="h-5 w-5 ml-2" />
                {t("printInvoice", lang)}
              </Button>
            </div>
          )}
        </Card>

        <Dialog open={viewingNote !== null} onOpenChange={(open) => !open && setViewingNote(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("details", lang)}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="whitespace-pre-wrap">{viewingNote}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setViewingNote(null)}>{t("close", lang)}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isMounted && showSuggestions && filteredInventory.length > 0 && createPortal(
        <div 
          data-suggestions="true"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999999,
            width: '90vw',
            maxWidth: '1000px',
            maxHeight: '80vh',
            overflowY: 'auto',
            backgroundColor: 'var(--theme-background)',
            border: '5px solid var(--theme-primary)',
            borderRadius: '16px',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)',
          }}
          onClick={(e) => e.stopPropagation()}
        >

          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))',
            color: 'var(--theme-background)',
            fontWeight: 'bold',
            fontSize: '20px',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{t("availableSuggestions", lang).replace("{count}", String(filteredInventory.length))}</span>
            <button
              onClick={() => setShowSuggestions(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'var(--theme-background)',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✕ {t("close", lang)}
            </button>
          </div>

          <div style={{ maxHeight: 'calc(80vh - 140px)', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ 
                  background: 'linear-gradient(to right, var(--theme-surface), var(--theme-accent))',
                  borderBottom: '2px solid var(--theme-primary)'
                }}>
                  <th style={{ 
                    padding: '14px 16px', 
                    textAlign: 'right', 
                    fontWeight: 'bold',
                    color: 'var(--theme-text)',
                    fontSize: '15px'
                  }}>{t("productCode", lang)}</th>
                  <th style={{ 
                    padding: '14px 16px', 
                    textAlign: 'right', 
                    fontWeight: 'bold',
                    color: 'var(--theme-text)',
                    fontSize: '15px'
                  }}>{t("productName", lang)}</th>
                  <th style={{ 
                    padding: '14px 16px', 
                    textAlign: 'center', 
                    fontWeight: 'bold',
                    color: 'var(--theme-text)',
                    fontSize: '15px'
                  }}>{t("priceIQDShort", lang)}</th>
                  <th style={{ 
                    padding: '14px 16px', 
                    textAlign: 'center', 
                    fontWeight: 'bold',
                    color: 'var(--theme-text)',
                    fontSize: '15px'
                  }}>{t("priceUSDShort", lang)}</th>
                  <th style={{ 
                    padding: '14px 16px', 
                    textAlign: 'center', 
                    fontWeight: 'bold',
                    color: 'var(--theme-text)',
                    fontSize: '15px'
                  }}>{t("availableQuantity", lang)}</th>
                </tr>
              </thead>
              <tbody>
              {filteredInventory.slice(0, 20).map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor: index % 2 === 0 ? 'var(--theme-background)' : 'var(--theme-surface)',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--theme-border)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-accent)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'var(--theme-background)' : 'var(--theme-surface)'
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    selectProduct(item)
                  }}
                >
                  <td style={{ 
                    padding: '12px 16px', 
                    fontWeight: 'bold', 
                    color: 'var(--theme-primary)',
                    fontSize: '14px'
                  }}>
                    {item.productcode}
                  </td>
                  <td style={{ 
                    padding: '12px 16px', 
                    color: 'var(--theme-text)',
                    fontSize: '14px'
                  }}>
                    {item.productname}
                  </td>
                  <td style={{ 
                    padding: '12px 16px', 
                    textAlign: 'center',
                    color: '#16a34a',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {item.sellpriceiqd?.toLocaleString() || 0}
                  </td>
                  <td style={{ 
                    padding: '12px 16px', 
                    textAlign: 'center',
                    color: '#2563eb',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {item.sellpriceusd?.toLocaleString() || 0}
                  </td>
                  <td style={{ 
                    padding: '12px 16px', 
                    textAlign: 'center',
                    color: '#ea580c',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {item.quantity || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div style={{ 
            padding: '12px 20px', 
            background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))',
            color: 'var(--theme-background)',
            borderTop: '2px solid var(--theme-primary)',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {t("suggestionsFooter", lang).replace("{count}", String(filteredInventory.length))}
          </div>
        </div>,
        document.body
      )}

      {isMounted && showSuggestions && filteredInventory.length > 0 && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999998,
          }}
          onClick={() => setShowSuggestions(false)}
        />,
        document.body
      )}
    </>
  );
}
