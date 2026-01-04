"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PaymentModal } from "@/components/modals/payment-modal"
import {
  Plus,
  Edit,
  Trash2,
  Printer,
  FileText,
  Search,
  X,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Eye,
  ShoppingCart,
  TrendingUp,
  Users,
  Warehouse,
  PackageOpen,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"
import {
  getAllSales,
  deleteSale,
  deleteMultipleSales,
  type SaleMain,
} from "@/lib/sales-operations"
import {
  getAllPurchases,
  deletePurchase,
  deleteMultiplePurchases,
  type PurchaseMain,
} from "@/lib/purchase-operations"
import {
  getAllPayments,
  deletePayment,
  deleteMultiplePayments,
  type Payment,
} from "@/lib/payments-operations"
import {
  getAllStoreTransfers,
  deleteStoreTransfer,
  deleteMultipleStoreTransfers,
  type StoreTransfer,
} from "@/lib/stores-operations"
import { logAction } from "@/lib/system-log-operations"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { useAuth } from "@/contexts/auth-context"
import { useDebounce, useLocalStorage } from "@/lib/hooks"
import { getCustomersWithBalances } from "@/lib/supabase-operations"

const CUSTOMERS_REPORT_STORAGE_PREFIX = "customersReportPayload:"
const CUSTOMERS_REPORT_LATEST_TOKEN_KEY = "customersReportLatestToken"

export default function ReportsPage() {
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const { currentUser } = useAuth()

  const [sales, setSales] = useState<SaleMain[]>([])
  const [filteredSales, setFilteredSales] = useState<SaleMain[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const [selectedSales, setSelectedSales] = useState<string[]>([])

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 30

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedDetails, setSelectedDetails] = useState<string>("")  

  const [purchases, setPurchases] = useState<PurchaseMain[]>([])
  const [filteredPurchases, setFilteredPurchases] = useState<PurchaseMain[]>([])
  const [purchasesLoading, setPurchasesLoading] = useState(true)
  const [purchasesSearchTerm, setPurchasesSearchTerm] = useState("")
  const debouncedPurchasesSearch = useDebounce(purchasesSearchTerm, 300)
  const [selectedPurchases, setSelectedPurchases] = useState<string[]>([])
  const [purchasesCurrentPage, setPurchasesCurrentPage] = useState(1)
  const [showPurchasesDeleteDialog, setShowPurchasesDeleteDialog] = useState(false)
  const [purchasesDeleteLoading, setPurchasesDeleteLoading] = useState(false)

  const [payments, setPayments] = useState<Payment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [paymentsSearchTerm, setPaymentsSearchTerm] = useState("")
  const debouncedPaymentsSearch = useDebounce(paymentsSearchTerm, 300)
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [paymentsCurrentPage, setPaymentsCurrentPage] = useState(1)
  const [showPaymentsDeleteDialog, setShowPaymentsDeleteDialog] = useState(false)
  const [paymentsDeleteLoading, setPaymentsDeleteLoading] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [showPaymentDetailsDialog, setShowPaymentDetailsDialog] = useState(false)
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<Payment | null>(null)

  const [transfers, setTransfers] = useState<StoreTransfer[]>([])
  const [filteredTransfers, setFilteredTransfers] = useState<StoreTransfer[]>([])
  const [transfersLoading, setTransfersLoading] = useState(true)
  const [transfersSearchTerm, setTransfersSearchTerm] = useState("")
  const debouncedTransfersSearch = useDebounce(transfersSearchTerm, 300)
  const [selectedTransfers, setSelectedTransfers] = useState<string[]>([])
  const [transfersCurrentPage, setTransfersCurrentPage] = useState(1)
  const [showTransfersDeleteDialog, setShowTransfersDeleteDialog] = useState(false)
  const [transfersDeleteLoading, setTransfersDeleteLoading] = useState(false)
  const [showTransferDetailsDialog, setShowTransferDetailsDialog] = useState(false)
  const [selectedTransferDetails, setSelectedTransferDetails] = useState<StoreTransfer | null>(null)

  const [activeTab, setActiveTab] = useLocalStorage<string>('reportsActiveTab', 'sales')

  useEffect(() => {
    loadSales()
    loadPurchases()
    loadPayments()
    loadTransfers()
  }, [])

  useEffect(() => {
    if (debouncedSearchTerm.trim() === "") {
      setFilteredSales(sales)
    } else {
      const filtered = sales.filter(
        (sale) =>
          sale.numberofsale.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          sale.customername.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          sale.paytype.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          (sale.details && sale.details.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      )
      setFilteredSales(filtered)
    }
    setCurrentPage(1)
  }, [debouncedSearchTerm, sales])

  useEffect(() => {
    if (debouncedPurchasesSearch.trim() === "") {
      setFilteredPurchases(purchases)
    } else {
      const filtered = purchases.filter(
        (purchase) =>
          purchase.numberofpurchase.toLowerCase().includes(debouncedPurchasesSearch.toLowerCase()) ||
          purchase.nameofsupplier.toLowerCase().includes(debouncedPurchasesSearch.toLowerCase()) ||
          purchase.typeofbuy.toLowerCase().includes(debouncedPurchasesSearch.toLowerCase()) ||
          purchase.typeofpayment.toLowerCase().includes(debouncedPurchasesSearch.toLowerCase()) ||
          (purchase.details && purchase.details.toLowerCase().includes(debouncedPurchasesSearch.toLowerCase()))
      )
      setFilteredPurchases(filtered)
    }
    setPurchasesCurrentPage(1)
  }, [debouncedPurchasesSearch, purchases])

  useEffect(() => {
    if (debouncedPaymentsSearch.trim() === "") {
      setFilteredPayments(payments)
    } else {
      const filtered = payments.filter(
        (payment) =>
          payment.invoice_number?.toLowerCase().includes(debouncedPaymentsSearch.toLowerCase()) ||
          payment.customer_name?.toLowerCase().includes(debouncedPaymentsSearch.toLowerCase()) ||
          payment.transaction_type.toLowerCase().includes(debouncedPaymentsSearch.toLowerCase()) ||
          (payment.notes && payment.notes.toLowerCase().includes(debouncedPaymentsSearch.toLowerCase()))
      )
      setFilteredPayments(filtered)
    }
    setPaymentsCurrentPage(1)
  }, [debouncedPaymentsSearch, payments])

  useEffect(() => {
    if (debouncedTransfersSearch.trim() === "") {
      setFilteredTransfers(transfers)
    } else {
      const filtered = transfers.filter(
        (transfer) =>
          transfer.productcode.toLowerCase().includes(debouncedTransfersSearch.toLowerCase()) ||
          transfer.productname.toLowerCase().includes(debouncedTransfersSearch.toLowerCase()) ||
          transfer.fromstorename.toLowerCase().includes(debouncedTransfersSearch.toLowerCase()) ||
          transfer.tostorename.toLowerCase().includes(debouncedTransfersSearch.toLowerCase()) ||
          (transfer.note && transfer.note.toLowerCase().includes(debouncedTransfersSearch.toLowerCase()))
      )
      setFilteredTransfers(filtered)
    }
    setTransfersCurrentPage(1)
  }, [debouncedTransfersSearch, transfers])

  const loadSales = async () => {
    try {
      setLoading(true)
      const data = await getAllSales()
      setSales(data)
      setFilteredSales(data)
    } catch {
      toast.error("??? ????? ????????")
    } finally {
      setLoading(false)
    }
  }

  const loadPayments = async () => {
    try {
      setPaymentsLoading(true)
      const result = await getAllPayments()
      if (result.success && result.data) {
        setPayments(result.data)
        setFilteredPayments(result.data)
      } else {
        toast.error(result.error || "??? ????? ????? ???????")
      }
    } catch {
      toast.error("??? ????? ????? ???????")
    } finally {
      setPaymentsLoading(false)
    }
  }

  const loadTransfers = async () => {
    try {
      setTransfersLoading(true)
      const data = await getAllStoreTransfers()
      setTransfers(data)
      setFilteredTransfers(data)
    } catch {
      toast.error("??? ????? ?????? ?????")
    } finally {
      setTransfersLoading(false)
    }
  }

  const loadPurchases = async () => {
    try {
      setPurchasesLoading(true)
      const data = await getAllPurchases()
      setPurchases(data)
      setFilteredPurchases(data)
    } catch {
      toast.error("??? ????? ?????????")
    } finally {
      setPurchasesLoading(false)
    }
  }

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentSales = filteredSales.slice(startIndex, endIndex)

  const toggleSelectAll = () => {
    if (selectedSales.length === currentSales.length) {
      setSelectedSales([])
    } else {
      setSelectedSales(currentSales.map((sale) => sale.id!))
    }
  }

  const toggleSelectSale = (saleId: string) => {
    if (selectedSales.includes(saleId)) {
      setSelectedSales(selectedSales.filter((id) => id !== saleId))
    } else {
      setSelectedSales([...selectedSales, saleId])
    }
  }

  const handleDelete = async () => {
    if (selectedSales.length === 0) {
      toast.error("?????? ????? ????? ????? ??? ?????")
      return
    }

    setDeleteLoading(true)
    try {
      const salesToDelete = sales.filter(s => s.id && selectedSales.includes(s.id))
      
      let result
      if (selectedSales.length === 1) {
        result = await deleteSale(selectedSales[0])
      } else {
        result = await deleteMultipleSales(selectedSales)
      }

      if (result.success) {
        // ????? ???????? ?? ??? ??????
        for (const sale of salesToDelete) {
          const total = sale.totalsaleiqd || sale.totalsaleusd
          const currency = sale.totalsaleiqd ? 'IQD' : 'USD'
          
          await logAction(
            "???",
            `?? ??? ????? ??? ??? ${sale.numberofsale} ??????: ${sale.customername} ????? ${total.toLocaleString()} ${currency}`,
            "????????",
            undefined,
            {
              id: sale.id,
              numberofsale: sale.numberofsale,
              customername: sale.customername,
              totalsaleiqd: sale.totalsaleiqd,
              totalsaleusd: sale.totalsaleusd,
              datetime: sale.datetime,
              paytype: sale.paytype
            },
            undefined
          )
        }
        
        // ????? ????? ?????
        if (selectedSales.length === 1 && 'restoredAmount' in result && result.restoredAmount) {
          const { iqd, usd } = result.restoredAmount
          let message = `? ?? ??? ????? ????? ??? ${'saleNumber' in result ? result.saleNumber : ''} ?????`
          
          if (iqd > 0 || usd > 0) {
            message += `\n?? ?? ??????? ?????? ?? ???? ??????: ${'customerName' in result ? result.customerName : ''}`
            if (iqd > 0) message += `\n   - ${iqd.toLocaleString()} ?????`
            if (usd > 0) message += `\n   - ${usd.toLocaleString()} ?????`
          }
          
          message += `\n?? ?? ????? ??????? ???????`
          
          toast.success(message, { duration: 6000 })
        } else if (selectedSales.length > 1 && 'totalRestored' in result && result.totalRestored) {
          const { iqd, usd } = result.totalRestored
          let message = `? ?? ??? ${'deletedCount' in result ? result.deletedCount : selectedSales.length} ????? ?????`
          
          if (iqd > 0 || usd > 0) {
            message += `\n?? ?????? ??????? ?????????:`
            if (iqd > 0) message += `\n   - ${iqd.toLocaleString()} ?????`
            if (usd > 0) message += `\n   - ${usd.toLocaleString()} ?????`
          }
          
          message += `\n?? ?? ????? ???? ??????? ???????`
          
          toast.success(message, { duration: 6000 })
        } else {
          toast.success(`?? ??? ${selectedSales.length} ????? ?????`)
        }
        
        setSelectedSales([])
        setShowDeleteDialog(false)
        await loadSales()
      } else {
        toast.error(result.error || "??? ?????")
      }
    } catch {
      toast.error("??? ??? ????? ?????")
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleEdit = () => {
    if (selectedSales.length === 0) {
      toast.error("?????? ????? ????? ?????")
      return
    }
    if (selectedSales.length > 1) {
      toast.error("?????? ????? ????? ????? ??? ???????")
      return
    }

    router.push(`/sales/add?edit=${selectedSales[0]}`)
  }

  const handleView = () => {
    if (selectedSales.length === 0) {
      toast.error("?????? ????? ????? ?????")
      return
    }
    if (selectedSales.length > 1) {
      toast.error("?????? ????? ????? ????? ??? ?????")
      return
    }

    router.push(`/sales/add?edit=${selectedSales[0]}&view=true`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  const purchasesTotalPages = Math.ceil(filteredPurchases.length / itemsPerPage)
  const purchasesStartIndex = (purchasesCurrentPage - 1) * itemsPerPage
  const purchasesEndIndex = purchasesStartIndex + itemsPerPage
  const currentPurchases = filteredPurchases.slice(purchasesStartIndex, purchasesEndIndex)

  const toggleSelectAllPurchases = () => {
    if (selectedPurchases.length === currentPurchases.length) {
      setSelectedPurchases([])
    } else {
      setSelectedPurchases(currentPurchases.map((purchase) => purchase.id!))
    }
  }

  const toggleSelectPurchase = (purchaseId: string) => {
    if (selectedPurchases.includes(purchaseId)) {
      setSelectedPurchases(selectedPurchases.filter((id) => id !== purchaseId))
    } else {
      setSelectedPurchases([...selectedPurchases, purchaseId])
    }
  }

  const handleDeletePurchases = async () => {
    if (selectedPurchases.length === 0) {
      toast.error("?????? ????? ????? ????? ??? ?????")
      return
    }

    setPurchasesDeleteLoading(true)
    try {
      const purchasesToDelete = purchases.filter(p => p.id && selectedPurchases.includes(p.id))
      
      let result
      if (selectedPurchases.length === 1) {
        result = await deletePurchase(selectedPurchases[0])
      } else {
        result = await deleteMultiplePurchases(selectedPurchases)
      }

      if (result.success) {
        // ????? ???????? ?? ??? ??????
        for (const purchase of purchasesToDelete) {
          const total = purchase.totalpurchaseiqd || purchase.totalpurchaseusd
          const currency = purchase.totalpurchaseiqd ? 'IQD' : 'USD'
          
          await logAction(
            "???",
            `?? ??? ????? ???? ??? ${purchase.numberofpurchase} ??????: ${purchase.nameofsupplier} ????? ${total.toLocaleString()} ${currency}`,
            "?????????",
            undefined,
            {
              id: purchase.id,
              numberofpurchase: purchase.numberofpurchase,
              nameofsupplier: purchase.nameofsupplier,
              totalpurchaseiqd: purchase.totalpurchaseiqd,
              totalpurchaseusd: purchase.totalpurchaseusd,
              datetime: purchase.datetime,
              typeofpayment: purchase.typeofpayment
            },
            undefined
          )
        }
        
        // ????? ????? ?????
        if (selectedPurchases.length === 1 && 'restoredAmount' in result && result.restoredAmount) {
          const { iqd, usd } = result.restoredAmount
          let message = `? ?? ??? ????? ?????? ??? ${'purchaseNumber' in result ? result.purchaseNumber : ''} ?????`
          
          if (iqd > 0 || usd > 0) {
            message += `\n?? ?? ????? ????? ?? ???? ??????: ${'supplierName' in result ? result.supplierName : ''}`
            if (iqd > 0) message += `\n   - ${iqd.toLocaleString()} ?????`
            if (usd > 0) message += `\n   - ${usd.toLocaleString()} ?????`
          }
          
          message += `\n?? ?? ??? ??????? ?? ???????`
          
          toast.success(message, { duration: 6000 })
        } else if (selectedPurchases.length > 1 && 'totalRestored' in result && result.totalRestored) {
          const { iqd, usd } = result.totalRestored
          let message = `? ?? ??? ${'deletedCount' in result ? result.deletedCount : selectedPurchases.length} ????? ?????`
          
          if (iqd > 0 || usd > 0) {
            message += `\n?? ?????? ?????? ???????:`
            if (iqd > 0) message += `\n   - ${iqd.toLocaleString()} ?????`
            if (usd > 0) message += `\n   - ${usd.toLocaleString()} ?????`
          }
          
          message += `\n?? ?? ??? ???? ??????? ?? ???????`
          
          toast.success(message, { duration: 6000 })
        } else {
          toast.success(`?? ??? ${selectedPurchases.length} ????? ?????`)
        }
        
        setSelectedPurchases([])
        setShowPurchasesDeleteDialog(false)
        await loadPurchases()
      } else {
        toast.error(result.error || "??? ?????")
      }
    } catch {
      toast.error("??? ??? ????? ?????")
    } finally {
      setPurchasesDeleteLoading(false)
    }
  }

  const handleEditPurchase = () => {
    if (selectedPurchases.length === 0) {
      toast.error("?????? ????? ????? ?????")
      return
    }
    if (selectedPurchases.length > 1) {
      toast.error("?????? ????? ????? ????? ??? ???????")
      return
    }

    router.push(`/purchases/add?edit=${selectedPurchases[0]}`)
  }

  const handleViewPurchase = () => {
    if (selectedPurchases.length === 0) {
      toast.error("?????? ????? ????? ?????")
      return
    }
    if (selectedPurchases.length > 1) {
      toast.error("?????? ????? ????? ????? ??? ?????")
      return
    }

    router.push(`/purchases/add?edit=${selectedPurchases[0]}&view=true`)
  }

  const paymentsTotalPages = Math.ceil(filteredPayments.length / itemsPerPage)
  const paymentsStartIndex = (paymentsCurrentPage - 1) * itemsPerPage
  const paymentsEndIndex = paymentsStartIndex + itemsPerPage
  const currentPayments = filteredPayments.slice(paymentsStartIndex, paymentsEndIndex)

  const toggleSelectAllPayments = () => {
    if (selectedPayments.length === currentPayments.length) {
      setSelectedPayments([])
    } else {
      setSelectedPayments(currentPayments.map((payment) => payment.id!))
    }
  }

  const toggleSelectPayment = (paymentId: string) => {
    if (selectedPayments.includes(paymentId)) {
      setSelectedPayments(selectedPayments.filter((id) => id !== paymentId))
    } else {
      setSelectedPayments([...selectedPayments, paymentId])
    }
  }

  const handleDeletePayments = async () => {
    if (selectedPayments.length === 0) {
      toast.error("?????? ????? ???? ????? ??? ?????")
      return
    }

    setPaymentsDeleteLoading(true)
    try {
      const paymentsToDelete = payments.filter(p => p.id && selectedPayments.includes(p.id))
      
      let result
      if (selectedPayments.length === 1) {
        result = await deletePayment(selectedPayments[0])
      } else {
        result = await deleteMultiplePayments(selectedPayments)
      }

      if (result.success) {
        for (const payment of paymentsToDelete) {
          const amount = payment.amount_iqd || payment.amount_usd
          const customerName = payment.customer_name || payment.supplier_name || '??? ????'
          
          await logAction(
            "???",
            `?? ??? ???? ${payment.transaction_type} ????? ${amount.toLocaleString()} ${payment.currency_type} ??????: ${customerName}`,
            "???????",
            undefined,
            {
              id: payment.id,
              customer_name: customerName,
              customer_id: payment.customer_id,
              amount_iqd: payment.amount_iqd,
              amount_usd: payment.amount_usd,
              currency_type: payment.currency_type,
              transaction_type: payment.transaction_type,
              pay_date: payment.pay_date,
              notes: payment.notes
            },
            undefined
          )
        }
        
        toast.success(`?? ??? ${selectedPayments.length} ???? ?????`)
        setSelectedPayments([])
        setShowPaymentsDeleteDialog(false)
        await loadPayments()
      } else {
        toast.error(result.error || "??? ??? ???????")
      }
    } catch {
      toast.error("??? ??? ????? ?????")
    } finally {
      setPaymentsDeleteLoading(false)
    }
  }

  const handleViewPayment = async () => {
    if (selectedPayments.length === 0) {
      toast.error("?????? ????? ???? ????????")
      return
    }
    if (selectedPayments.length > 1) {
      toast.error("?????? ????? ???? ????? ???")
      return
    }
    
    const payment = payments.find(p => p.id === selectedPayments[0])
    if (payment) {
      setSelectedPaymentDetails(payment)
      setShowPaymentDetailsDialog(true)
    }
  }

  const transfersTotalPages = Math.ceil(filteredTransfers.length / itemsPerPage)
  const transfersStartIndex = (transfersCurrentPage - 1) * itemsPerPage
  const transfersEndIndex = transfersStartIndex + itemsPerPage
  const currentTransfers = filteredTransfers.slice(transfersStartIndex, transfersEndIndex)

  const toggleSelectAllTransfers = () => {
    if (selectedTransfers.length === currentTransfers.length) {
      setSelectedTransfers([])
    } else {
      setSelectedTransfers(currentTransfers.map((transfer) => transfer.id))
    }
  }

  const toggleSelectTransfer = (transferId: string) => {
    if (selectedTransfers.includes(transferId)) {
      setSelectedTransfers(selectedTransfers.filter((id) => id !== transferId))
    } else {
      setSelectedTransfers([...selectedTransfers, transferId])
    }
  }

  const handleDeleteTransfers = async () => {
    if (selectedTransfers.length === 0) {
      toast.error("?????? ????? ????? ??? ????? ??? ?????")
      return
    }

    setTransfersDeleteLoading(true)
    try {
      const transfersToDelete = transfers.filter(t => selectedTransfers.includes(t.id))
      
      let result
      if (selectedTransfers.length === 1) {
        result = await deleteStoreTransfer(selectedTransfers[0])
      } else {
        result = await deleteMultipleStoreTransfers(selectedTransfers)
      }

      if (result.success) {
        for (const transfer of transfersToDelete) {
          await logAction(
            "???",
            `?? ??? ????? ??? ????? ??????: ${transfer.productname} ?? ${transfer.fromstorename} ??? ${transfer.tostorename}`,
            "????? ???????",
            undefined,
            {
              productname: transfer.productname,
              productcode: transfer.productcode,
              quantity: transfer.quantity,
              fromstorename: transfer.fromstorename,
              tostorename: transfer.tostorename,
              transferdate: transfer.transferdate
            },
            undefined
          )
        }
        
        toast.success(`?? ??? ${selectedTransfers.length} ????? ??? ?????`)
        setSelectedTransfers([])
        setShowTransfersDeleteDialog(false)
        await loadTransfers()
      } else {
        toast.error(result.error || "??? ??? ?????? ?????")
      }
    } catch {
      toast.error("??? ??? ????? ?????")
    } finally {
      setTransfersDeleteLoading(false)
    }
  }

  const handleViewTransfer = () => {
    if (selectedTransfers.length === 0) {
      toast.error("?????? ????? ????? ??? ????????")
      return
    }
    if (selectedTransfers.length > 1) {
      toast.error("?????? ????? ????? ??? ????? ???")
      return
    }
    
    const transfer = transfers.find(t => t.id === selectedTransfers[0])
    if (transfer) {
      setSelectedTransferDetails(transfer)
      setShowTransferDetailsDialog(true)
    }
  }

  const handleExportCustomersReport = async () => {
    try {
      toast.loading("???? ????? ?????? ???????...")
      
      // ??? ?????? ???????
      const customersData = await getCustomersWithBalances()
      
      if (!customersData || customersData.length === 0) {
        toast.dismiss()
        toast.error("?? ???? ?????? ???????")
        return
      }

      const generatedAt = new Date()
      const generatedBy = currentUser?.full_name || currentUser?.username || "??? ?????"

      const payload = {
        generatedAtISO: generatedAt.toISOString(),
        generatedBy,
        customers: customersData,
      }

      const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const storageKey = `${CUSTOMERS_REPORT_STORAGE_PREFIX}${token}`
      localStorage.setItem(storageKey, JSON.stringify(payload))
      localStorage.setItem(CUSTOMERS_REPORT_LATEST_TOKEN_KEY, token)

      toast.dismiss()
      toast.success("?? ??? ????? ???????")

      const url = `/reports/customers-report?token=${encodeURIComponent(token)}`
      const win = window.open(url, "_blank", "noopener,noreferrer")
      if (!win) {
        toast.info("??????? ???? ??? ???????. ???? ???? popups ?? ???? ??? ?????.")
      }
      
      // ????? ???????
      await logAction(
        "?????",
        `????? ????? ??????? - ??? ???????: ${customersData.length}`,
        "????????",
        undefined,
        { customersCount: customersData.length }
      )
    } catch {
      toast.dismiss()
      toast.error("??? ??? ????? ????? ???????")
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--theme-primary)" }}>
          {t('reportsAndStatements', currentLanguage.code)}
        </h1>
        <p className="text-muted-foreground">
          {t('manageSalesList', currentLanguage.code)}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={currentLanguage.direction}>
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 gap-1">
          <TabsTrigger value="sales">{t('sales', currentLanguage.code)}</TabsTrigger>
          <TabsTrigger value="purchases">{t('purchases', currentLanguage.code)}</TabsTrigger>
          <TabsTrigger value="cash">{t('cashBox', currentLanguage.code)}</TabsTrigger>
          {/* عرض قائمة النقل المخزني للمدير ولموظف العادي الذي لديه الصلاحية */}
          {(currentUser?.permission_type === 'مدير' || 
            (currentUser?.permission_type === 'موظف' && currentUser?.permissions?.view_store_transfer)) && (
            <TabsTrigger value="transfer">{t('storeTransfer', currentLanguage.code)}</TabsTrigger>
          )}
          {/* ??? ????? ???????? ??? ?????? ?? ??????? ???? ???? ?????? */}
          {(currentUser?.permission_type === 'مدير' || 
            (currentUser?.permission_type === 'محاسب' && currentUser?.permissions?.view_reports)) && (
            <TabsTrigger value="reports">{t('reports', currentLanguage.code)}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="sales" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle style={{ color: "var(--theme-primary)" }}>{t('salesManagement', currentLanguage.code)}</CardTitle>
              <CardDescription>{t('manageSalesList', currentLanguage.code)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => router.push("/sales/add")}
                  className="gap-2"
                  style={{
                    backgroundColor: "var(--theme-primary)",
                    color: "white",
                  }}
                >
                  <Plus className="h-4 w-4" />
                  {t('add', currentLanguage.code)}
                </Button>
                <Button
                  onClick={handleEdit}
                  variant="outline"
                  className="gap-2"
                  disabled={selectedSales.length !== 1}
                  style={{
                    borderColor: "var(--theme-primary)",
                    color: "var(--theme-primary)",
                  }}
                >
                  <Edit className="h-4 w-4" />
                  {t('edit', currentLanguage.code)}
                </Button>
                <Button
                  onClick={() => {
                    if (selectedSales.length === 0) {
                      toast.error("?????? ????? ????? ????? ??? ?????")
                      return
                    }
                    setShowDeleteDialog(true)
                  }}
                  variant="outline"
                  className="gap-2"
                  disabled={selectedSales.length === 0}
                  style={{
                    borderColor: "#ef4444",
                    color: "#ef4444",
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('delete', currentLanguage.code)}
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  {t('print', currentLanguage.code)}
                </Button>
                <Button
                  onClick={handleView}
                  variant="outline"
                  className="gap-2"
                  disabled={selectedSales.length !== 1}
                >
                  <FileText className="h-4 w-4" />
                  ???
                </Button>
              </div>

              {}
              <div className="flex flex-wrap gap-2 items-center">
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  ?????
                </Button>
                <div className="flex-1 min-w-[300px] relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="??? ??? ??? ???????? ??? ??????? ??? ?????..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSearchTerm("")}
                  title="?????"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={loadSales}
                  title="?????"
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {}
              <div className="border rounded-lg overflow-auto" style={{ maxHeight: "1200px", width: "100%" }}>
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--theme-primary)" }} />
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px] text-center">
                            <Checkbox
                              checked={
                                currentSales.length > 0 && selectedSales.length === currentSales.length
                              }
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead className="w-20 text-center">#</TableHead>
                          <TableHead>??? ???????</TableHead>
                          <TableHead>??? ??????</TableHead>
                          <TableHead>??? ?????</TableHead>
                          <TableHead>???????</TableHead>
                          <TableHead>????? ???????</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentSales.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                              ?? ???? ????? ??????
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentSales.map((sale, index) => (
                            <TableRow key={sale.id}>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={selectedSales.includes(sale.id!)}
                                  onCheckedChange={() => toggleSelectSale(sale.id!)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                {startIndex + index + 1}
                              </TableCell>
                              <TableCell className="font-medium">{sale.numberofsale}</TableCell>
                              <TableCell>{sale.customername}</TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    sale.paytype === "نقدي"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-orange-100 text-orange-800"
                                  }`}
                                >
                                  {sale.paytype}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="max-w-[200px] truncate">
                                    {sale.details || "-"}
                                  </span>
                                  {sale.details && sale.details.length > 50 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setSelectedDetails(sale.details || '')
                                        setShowDetailsDialog(true)
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {formatDate(sale.datetime)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    {}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t">
                        <div className="text-sm text-muted-foreground">
                          ??? {startIndex + 1} - {Math.min(endIndex, filteredSales.length)} ??{" "}
                          {filteredSales.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <span className="text-sm">
                            ???? {currentPage} ?? {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {}
              {selectedSales.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  ?? ????? {selectedSales.length} ?????
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>????? ?????????</CardTitle>
              <CardDescription>??? ?????? ???? ????? ?????????</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {}
              <div className="flex flex-wrap gap-2">
                {/* ??? ????? ??????? ???????? ?????? ??? ?????? ?? ?????? ???? ???? ?????? */}
                {(currentUser?.permission_type === 'مدير' || 
                  (currentUser?.permission_type === 'موظف' && currentUser?.permissions?.add_purchase)) && (
                  <>
                    <Button
                      onClick={() => router.push("/purchases/add")}
                      className="gap-2"
                      style={{
                        backgroundColor: "var(--theme-primary)",
                        color: "white",
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      ?????
                    </Button>
                    <Button
                      onClick={handleEditPurchase}
                      variant="outline"
                      className="gap-2"
                      disabled={selectedPurchases.length !== 1}
                    >
                      <Edit className="h-4 w-4" />
                      ?????
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedPurchases.length === 0) {
                          toast.error("?????? ????? ????? ????? ??? ?????")
                          return
                        }
                        setShowPurchasesDeleteDialog(true)
                      }}
                      variant="outline"
                      className="gap-2"
                      disabled={selectedPurchases.length === 0}
                    >
                      <Trash2 className="h-4 w-4" />
                      ???
                    </Button>
                  </>
                )}
                <Button variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" />
                  ?????
                </Button>
                <Button
                  onClick={handleViewPurchase}
                  variant="outline"
                  className="gap-2"
                  disabled={selectedPurchases.length !== 1}
                >
                  <FileText className="h-4 w-4" />
                  ???
                </Button>
              </div>

              {}
              <div className="flex flex-wrap gap-2 items-center">
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  ?????
                </Button>
                <div className="flex-1 min-w-[300px] relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="??? ??? ??? ???????? ??? ??????? ??? ??????..."
                    value={purchasesSearchTerm}
                    onChange={(e) => setPurchasesSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPurchasesSearchTerm("")}
                  title="?????"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={loadPurchases}
                  title="?????"
                  disabled={purchasesLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${purchasesLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {}
              <div className="border rounded-lg overflow-auto w-full" style={{ maxHeight: "1200px" }}>
                {purchasesLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--theme-primary)" }} />
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {/* ??? ???? ???????? ??? ?????? ???????? ?? ?????? ???? ???? ?????? */}
                          {(currentUser?.permission_type === 'مدير' ||
                            (currentUser?.permission_type === 'موظف' && currentUser?.permissions?.add_purchase)) && (
                            <TableHead className="w-[60px] text-center">
                              <Checkbox
                                checked={
                                  currentPurchases.length > 0 && selectedPurchases.length === currentPurchases.length
                                }
                                onCheckedChange={toggleSelectAllPurchases}
                              />
                            </TableHead>
                          )}
                          <TableHead className="w-20 text-center">#</TableHead>
                          <TableHead>??? ???????</TableHead>
                          <TableHead>??? ??????</TableHead>
                          <TableHead>??? ??????</TableHead>
                          <TableHead>??? ?????</TableHead>
                          <TableHead>????????</TableHead>
                          <TableHead>????? ??????</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentPurchases.length === 0 ? (
                          <TableRow>
                            <TableCell 
                              colSpan={
                                (currentUser?.permission_type === 'مدير' || 
                                 (currentUser?.permission_type === 'موظف' && currentUser?.permissions?.add_purchase)) 
                                ? 8 : 7
                              } 
                              className="text-center py-10 text-muted-foreground"
                            >
                              ?? ???? ????? ???????
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentPurchases.map((purchase, index) => (
                            <TableRow key={purchase.id}>
                              {/* ??? ???? ???????? ??? ?????? ???????? ?? ?????? ???? ???? ?????? */}
                              {(currentUser?.permission_type === 'مدير' ||
                                (currentUser?.permission_type === 'موظف' && currentUser?.permissions?.add_purchase)) && (
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={selectedPurchases.includes(purchase.id!)}
                                    onCheckedChange={() => toggleSelectPurchase(purchase.id!)}
                                  />
                                </TableCell>
                              )}
                              <TableCell className="text-center">
                                {purchasesStartIndex + index + 1}
                              </TableCell>
                              <TableCell className="font-medium">{purchase.numberofpurchase}</TableCell>
                              <TableCell>{purchase.nameofsupplier}</TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    purchase.typeofbuy === "محلي"
                                      ? "bg-blue-100 text-blue-800"
                                      : purchase.typeofbuy === "استيراد"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {purchase.typeofbuy}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    purchase.typeofpayment === "نقدي"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-orange-100 text-orange-800"
                                  }`}
                                >
                                  {purchase.typeofpayment}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="max-w-[200px] truncate">
                                    {purchase.details || "-"}
                                  </span>
                                  {purchase.details && purchase.details.length > 50 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setSelectedDetails(purchase.details || '')
                                        setShowDetailsDialog(true)
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {formatDate(purchase.datetime)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    {}
                    {purchasesTotalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t">
                        <div className="text-sm text-muted-foreground">
                          ??? {purchasesStartIndex + 1} - {Math.min(purchasesEndIndex, filteredPurchases.length)} ??{" "}
                          {filteredPurchases.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPurchasesCurrentPage(purchasesCurrentPage - 1)}
                            disabled={purchasesCurrentPage === 1}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <span className="text-sm">
                            ???? {purchasesCurrentPage} ?? {purchasesTotalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPurchasesCurrentPage(purchasesCurrentPage + 1)}
                            disabled={purchasesCurrentPage === purchasesTotalPages}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {}
              {selectedPurchases.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  ?? ????? {selectedPurchases.length} ?????
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>????? ???????</CardTitle>
              <CardDescription>??? ?????? ????? ???????</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setPaymentModalOpen(true)}
                  className="gap-2"
                  style={{
                    backgroundColor: "var(--theme-primary)",
                    color: "white",
                  }}
                >
                  <Plus className="h-4 w-4" />
                  ?????
                </Button>
                <Button
                  onClick={() => setShowPaymentsDeleteDialog(true)}
                  variant="destructive"
                  className="gap-2"
                  disabled={selectedPayments.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                  ??? ({selectedPayments.length})
                </Button>
                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  ?????
                </Button>
                <Button
                  onClick={handleViewPayment}
                  variant="outline"
                  className="gap-2"
                  disabled={selectedPayments.length !== 1}
                >
                  <FileText className="h-4 w-4" />
                  ???
                </Button>
              </div>

              {}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="????? ?? ????? ???????..."
                  value={paymentsSearchTerm}
                  onChange={(e) => setPaymentsSearchTerm(e.target.value)}
                  className="pr-10"
                />
                {paymentsSearchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-1 top-1/2 transform -translate-y-1/2 h-7"
                    onClick={() => setPaymentsSearchTerm("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {}
              <div className="border rounded-lg" style={{ maxHeight: "1200px", overflow: "auto" }}>
                {paymentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="text-center w-12">
                            <Checkbox
                              checked={
                                selectedPayments.length === currentPayments.length &&
                                currentPayments.length > 0
                              }
                              onCheckedChange={toggleSelectAllPayments}
                            />
                          </TableHead>
                          <TableHead className="text-center">#</TableHead>
                          <TableHead>??? ????????</TableHead>
                          <TableHead>??? ??????</TableHead>
                          <TableHead>??? ??????</TableHead>
                          <TableHead>?????? ?????</TableHead>
                          <TableHead>?????? ?????</TableHead>
                          <TableHead>????????</TableHead>
                          <TableHead>????? ??????</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              ?? ???? ?????
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentPayments.map((payment, index) => (
                            <TableRow key={payment.id}>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={selectedPayments.includes(payment.id!)}
                                  onCheckedChange={() => toggleSelectPayment(payment.id!)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                {paymentsStartIndex + index + 1}
                              </TableCell>
                              <TableCell className="font-medium">{payment.invoice_number}</TableCell>
                              <TableCell>{payment.customer_name}</TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    payment.transaction_type === "???"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {payment.transaction_type}
                                </span>
                              </TableCell>
                              <TableCell className="font-medium text-green-700">
                                {payment.amount_iqd.toLocaleString()} ?.?
                              </TableCell>
                              <TableCell className="font-medium text-blue-700">
                                ${payment.amount_usd.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="max-w-[200px] truncate">
                                    {payment.notes || "-"}
                                  </span>
                                  {payment.notes && payment.notes.length > 50 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setSelectedDetails(payment.notes || "")
                                        setShowDetailsDialog(true)
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {formatDate(payment.pay_date)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    {}
                    {paymentsTotalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t">
                        <div className="text-sm text-muted-foreground">
                          ??? {paymentsStartIndex + 1} - {Math.min(paymentsEndIndex, filteredPayments.length)} ??{" "}
                          {filteredPayments.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPaymentsCurrentPage(paymentsCurrentPage - 1)}
                            disabled={paymentsCurrentPage === 1}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <span className="text-sm">
                            ???? {paymentsCurrentPage} ?? {paymentsTotalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPaymentsCurrentPage(paymentsCurrentPage + 1)}
                            disabled={paymentsCurrentPage === paymentsTotalPages}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {}
              {selectedPayments.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  ?? ????? {selectedPayments.length} ????
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>????? ????? ???????</CardTitle>
              <CardDescription>??? ?????? ?????? ????? ??? ???????</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {}
              <div className="flex flex-wrap gap-2">
                {/* ??? ????? ??????? ?????? ??? ?????? ?? ?????? ???? ???? ?????? */}
                {(currentUser?.permission_type === 'مدير' || 
                  (currentUser?.permission_type === 'موظف' && currentUser?.permissions?.view_store_transfer)) && (
                  <>
                    <Button
                      onClick={() => router.push("/store-transfer")}
                      className="gap-2"
                      style={{
                        backgroundColor: "var(--theme-primary)",
                        color: "white",
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      ?????
                    </Button>
                    <Button
                      onClick={() => setShowTransfersDeleteDialog(true)}
                      variant="destructive"
                      className="gap-2"
                      disabled={selectedTransfers.length === 0}
                    >
                      <Trash2 className="h-4 w-4" />
                      ??? ({selectedTransfers.length})
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  ?????
                </Button>
                <Button
                  onClick={handleViewTransfer}
                  variant="outline"
                  className="gap-2"
                  disabled={selectedTransfers.length !== 1}
                >
                  <FileText className="h-4 w-4" />
                  ???
                </Button>
              </div>

              {}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="????? ?? ?????? ?????..."
                  value={transfersSearchTerm}
                  onChange={(e) => setTransfersSearchTerm(e.target.value)}
                  className="pr-10"
                />
                {transfersSearchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-1 top-1/2 transform -translate-y-1/2 h-7"
                    onClick={() => setTransfersSearchTerm("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {}
              <div className="border rounded-lg" style={{ maxHeight: "1200px", overflow: "auto" }}>
                {transfersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="text-center w-12">
                            <Checkbox
                              checked={
                                selectedTransfers.length === currentTransfers.length &&
                                currentTransfers.length > 0
                              }
                              onCheckedChange={toggleSelectAllTransfers}
                            />
                          </TableHead>
                          <TableHead className="text-center">#</TableHead>
                          <TableHead>??? ??????</TableHead>
                          <TableHead>??? ??????</TableHead>
                          <TableHead>?????? ????????</TableHead>
                          <TableHead>?? ??????</TableHead>
                          <TableHead>??? ??????</TableHead>
                          <TableHead>???????</TableHead>
                          <TableHead>????? ?????</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransfers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              ?? ???? ?????? ???
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentTransfers.map((transfer, index) => (
                            <TableRow key={transfer.id}>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={selectedTransfers.includes(transfer.id)}
                                  onCheckedChange={() => toggleSelectTransfer(transfer.id)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                {transfersStartIndex + index + 1}
                              </TableCell>
                              <TableCell className="font-medium">{transfer.productcode}</TableCell>
                              <TableCell>{transfer.productname}</TableCell>
                              <TableCell className="font-medium text-blue-700">
                                {transfer.quantity.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
                                  {transfer.fromstorename}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                                  {transfer.tostorename}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="max-w-[200px] truncate">
                                    {transfer.note || "-"}
                                  </span>
                                  {transfer.note && transfer.note.length > 50 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setSelectedDetails(transfer.note || "")
                                        setShowDetailsDialog(true)
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {formatDate(transfer.transferdate)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    {}
                    {transfersTotalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t">
                        <div className="text-sm text-muted-foreground">
                          ??? {transfersStartIndex + 1} - {Math.min(transfersEndIndex, filteredTransfers.length)} ??{" "}
                          {filteredTransfers.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTransfersCurrentPage(transfersCurrentPage - 1)}
                            disabled={transfersCurrentPage === 1}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <span className="text-sm">
                            ???? {transfersCurrentPage} ?? {transfersTotalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTransfersCurrentPage(transfersCurrentPage + 1)}
                            disabled={transfersCurrentPage === transfersTotalPages}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {}
              {selectedTransfers.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  ?? ????? {selectedTransfers.length} ????? ???
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle style={{ color: "var(--theme-primary)" }}>
                {t('reports', currentLanguage.code)}
              </CardTitle>
              <CardDescription>
                ????? ?????? ?????? ????? ????? ????? ??????
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* ?? ????? ???????? */}
                <Button
                  variant="outline"
                  className="h-28 flex flex-row-reverse items-center justify-between px-6 hover:shadow-lg transition-all group relative overflow-hidden"
                  style={{
                    borderColor: "var(--theme-primary)",
                    borderWidth: "2px",
                  }}
                >
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity"
                    style={{
                      backgroundColor: "var(--theme-primary)",
                    }}
                  />
                  <div className="relative flex items-center justify-center">
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-xl transition-all"
                      style={{
                        backgroundColor: "var(--theme-primary)",
                      }}
                    >
                      <TrendingUp 
                        className="w-8 h-8 text-white" 
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                  <div className="text-right relative flex-1">
                    <h3 className="font-bold text-lg" style={{ color: "var(--theme-primary)" }}>
                      {t('sales', currentLanguage.code)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      ????? ???? ????????
                    </p>
                  </div>
                </Button>

                {/* ?? ????? ????????? */}
                <Button
                  variant="outline"
                  className="h-28 flex flex-row-reverse items-center justify-between px-6 hover:shadow-lg transition-all group relative overflow-hidden"
                  style={{
                    borderColor: "var(--theme-primary)",
                    borderWidth: "2px",
                  }}
                >
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity"
                    style={{
                      backgroundColor: "var(--theme-primary)",
                    }}
                  />
                  <div className="relative flex items-center justify-center">
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-xl transition-all"
                      style={{
                        backgroundColor: "var(--theme-primary)",
                      }}
                    >
                      <ShoppingCart 
                        className="w-8 h-8 text-white" 
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                  <div className="text-right relative flex-1">
                    <h3 className="font-bold text-lg" style={{ color: "var(--theme-primary)" }}>
                      {t('purchases', currentLanguage.code)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      ????? ???? ?????????
                    </p>
                  </div>
                </Button>

                {/* ?? ????? ????? ??????? */}
                <Button
                  variant="outline"
                  className="h-28 flex flex-row-reverse items-center justify-between px-6 hover:shadow-lg transition-all group relative overflow-hidden"
                  style={{
                    borderColor: "var(--theme-primary)",
                    borderWidth: "2px",
                  }}
                >
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity"
                    style={{
                      backgroundColor: "var(--theme-primary)",
                    }}
                  />
                  <div className="relative flex items-center justify-center">
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-xl transition-all"
                      style={{
                        backgroundColor: "var(--theme-primary)",
                      }}
                    >
                      <PackageOpen 
                        className="w-8 h-8 text-white" 
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                  <div className="text-right relative flex-1">
                    <h3 className="font-bold text-lg" style={{ color: "var(--theme-primary)" }}>
                      {t('storeTransfer', currentLanguage.code)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      ????? ???? ????? ???????
                    </p>
                  </div>
                </Button>

                {/* ?? ????? ??????? */}
                <Button
                  onClick={handleExportCustomersReport}
                  variant="outline"
                  className="h-28 flex flex-row-reverse items-center justify-between px-6 hover:shadow-lg transition-all group relative overflow-hidden"
                  style={{
                    borderColor: "var(--theme-primary)",
                    borderWidth: "2px",
                  }}
                >
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity"
                    style={{
                      backgroundColor: "var(--theme-primary)",
                    }}
                  />
                  <div className="relative flex items-center justify-center">
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-xl transition-all"
                      style={{
                        backgroundColor: "var(--theme-primary)",
                      }}
                    >
                      <Users 
                        className="w-8 h-8 text-white" 
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                  <div className="text-right relative flex-1">
                    <h3 className="font-bold text-lg" style={{ color: "var(--theme-primary)" }}>
                      {t('customers', currentLanguage.code)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      ????? ???? ???????
                    </p>
                  </div>
                </Button>

                {/* ?? ????? ??????? */}
                <Button
                  variant="outline"
                  className="h-28 flex flex-row-reverse items-center justify-between px-6 hover:shadow-lg transition-all group relative overflow-hidden"
                  style={{
                    borderColor: "var(--theme-primary)",
                    borderWidth: "2px",
                  }}
                >
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity"
                    style={{
                      backgroundColor: "var(--theme-primary)",
                    }}
                  />
                  <div className="relative flex items-center justify-center">
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-xl transition-all"
                      style={{
                        backgroundColor: "var(--theme-primary)",
                      }}
                    >
                      <Warehouse 
                        className="w-8 h-8 text-white" 
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                  <div className="text-right relative flex-1">
                    <h3 className="font-bold text-lg" style={{ color: "var(--theme-primary)" }}>
                      {t('stores', currentLanguage.code)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      ????? ???? ???????
                    </p>
                  </div>
                </Button>

                {/* ?? ????? ???????? */}
                <Button
                  variant="outline"
                  className="h-28 flex flex-row-reverse items-center justify-between px-6 hover:shadow-lg transition-all group relative overflow-hidden"
                  style={{
                    borderColor: "var(--theme-primary)",
                    borderWidth: "2px",
                  }}
                >
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity"
                    style={{
                      backgroundColor: "var(--theme-primary)",
                    }}
                  />
                  <div className="relative flex items-center justify-center">
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-xl transition-all"
                      style={{
                        backgroundColor: "var(--theme-primary)",
                      }}
                    >
                      <Wallet 
                        className="w-8 h-8 text-white" 
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                  <div className="text-right relative flex-1">
                    <h3 className="font-bold text-lg" style={{ color: "var(--theme-primary)" }}>
                      {t('cashBox', currentLanguage.code)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      ????? ???? ????????
                    </p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>????? ?????</DialogTitle>
            <DialogDescription>
              ?? ??? ????? ?? ??? {selectedSales.length} ?????? ???? ??? ???? ???????? ???????? ???.
              ??? ??????? ?? ???? ??????? ???.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleteLoading}>
              ?????
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
              className="gap-2"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  ???? ?????...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  ???
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={showPurchasesDeleteDialog} onOpenChange={setShowPurchasesDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>????? ?????</DialogTitle>
            <DialogDescription>
              ?? ??? ????? ?? ??? {selectedPurchases.length} ?????? ???? ??? ???? ???????? ???????? ???.
              ??? ??????? ?? ???? ??????? ???.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchasesDeleteDialog(false)} disabled={purchasesDeleteLoading}>
              ?????
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePurchases}
              disabled={purchasesDeleteLoading}
              className="gap-2"
            >
              {purchasesDeleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  ???? ?????...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  ???
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={showPaymentsDeleteDialog} onOpenChange={setShowPaymentsDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>????? ?????</DialogTitle>
            <DialogDescription>
              ?? ??? ????? ?? ??? {selectedPayments.length} ?????
              ??? ??????? ?? ???? ??????? ???.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentsDeleteDialog(false)} disabled={paymentsDeleteLoading}>
              ?????
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePayments}
              disabled={paymentsDeleteLoading}
              className="gap-2"
            >
              {paymentsDeleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  ???? ?????...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  ???
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>?????? ?????</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap wrap-break-word">
              {selectedDetails}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDetailsDialog(false)}>
              ?????
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        onSuccess={() => {
          loadPayments()
          setPaymentModalOpen(false)
        }}
      />

      {}
      <Dialog open={showPaymentDetailsDialog} onOpenChange={setShowPaymentDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>?????? ???? ???????</DialogTitle>
          </DialogHeader>
          {selectedPaymentDetails && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">??? ????????</p>
                  <p className="font-medium">{selectedPaymentDetails.invoice_number}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">??? ??????</p>
                  <p className="font-medium">{selectedPaymentDetails.customer_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">??? ??????</p>
                  <p className="font-medium">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        selectedPaymentDetails.transaction_type === "???"
                          ? "bg-green-100 text-green-800"
                          : selectedPaymentDetails.transaction_type === "???"
                          ? "bg-red-100 text-red-800"
                          : selectedPaymentDetails.transaction_type === "?????"
                          ? "bg-blue-100 text-blue-800"
                          : selectedPaymentDetails.transaction_type === "???"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {selectedPaymentDetails.transaction_type}
                    </span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">??? ??????</p>
                  <p className="font-medium">{selectedPaymentDetails.currency_type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">?????? ?????</p>
                  <p className="font-medium text-green-700">
                    {selectedPaymentDetails.amount_iqd.toLocaleString()} ?.?
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">?????? ?????</p>
                  <p className="font-medium text-blue-700">
                    ${selectedPaymentDetails.amount_usd.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-sm text-muted-foreground">????? ??????</p>
                  <p className="font-medium">{formatDate(selectedPaymentDetails.pay_date)}</p>
                </div>
                {selectedPaymentDetails.notes && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">????????</p>
                    <div className="p-3 bg-muted rounded-lg whitespace-pre-wrap wrap-break-word">
                      {selectedPaymentDetails.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowPaymentDetailsDialog(false)}>
              ?????
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={showTransfersDeleteDialog} onOpenChange={setShowTransfersDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>????? ?????</DialogTitle>
            <DialogDescription>
              ?? ??? ????? ?? ??? {selectedTransfers.length} ????? ????
              ??? ??????? ?? ???? ??????? ???.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransfersDeleteDialog(false)} disabled={transfersDeleteLoading}>
              ?????
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTransfers}
              disabled={transfersDeleteLoading}
              className="gap-2"
            >
              {transfersDeleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  ???? ?????...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  ???
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={showTransferDetailsDialog} onOpenChange={setShowTransferDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>?????? ????? ?????</DialogTitle>
          </DialogHeader>
          {selectedTransferDetails && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">??? ??????</p>
                  <p className="font-medium">{selectedTransferDetails.productcode}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">??? ??????</p>
                  <p className="font-medium">{selectedTransferDetails.productname}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">?????? ????????</p>
                  <p className="font-medium text-blue-700">
                    {selectedTransferDetails.quantity.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">????? ?????</p>
                  <p className="font-medium">{formatDate(selectedTransferDetails.transferdate)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">?? ??????</p>
                  <p>
                    <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
                      {selectedTransferDetails.fromstorename}
                    </span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">??? ??????</p>
                  <p>
                    <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                      {selectedTransferDetails.tostorename}
                    </span>
                  </p>
                </div>
                {selectedTransferDetails.createdby && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">??????</p>
                    <p className="font-medium">{selectedTransferDetails.createdby}</p>
                  </div>
                )}
                {selectedTransferDetails.note && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">???????</p>
                    <div className="p-3 bg-muted rounded-lg whitespace-pre-wrap wrap-break-word">
                      {selectedTransferDetails.note}
                    </div>
                  </div>
                )}
                {selectedTransferDetails.description && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">?????</p>
                    <div className="p-3 bg-muted rounded-lg whitespace-pre-wrap wrap-break-word">
                      {selectedTransferDetails.description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowTransferDetailsDialog(false)}>
              ?????
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
