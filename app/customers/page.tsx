"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Edit,
  Trash2,
  Printer,
  FileText,
  Search,
  X,
  RefreshCw,
  Eye,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { PermissionGuard } from "@/components/permission-guard"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { getCustomersWithBalances, deleteCustomer, deleteCustomers, type Customer, getCustomer } from "@/lib/supabase-operations"
import { logAction } from "@/lib/system-log-operations"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { useDebounce } from "@/lib/hooks"

interface CustomerWithBalance extends Customer {
  balance_iqd: number
  balance_usd: number
}

export default function CustomersPage() {
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const [customers, setCustomers] = useState<CustomerWithBalance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState("")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null)
  const itemsPerPage = 20

  useEffect(() => {
    loadCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadCustomers() {
    try {
      setIsLoading(true)
      const data = await getCustomersWithBalances()
      setCustomers(data)
    } catch (error) {
      console.error(error)
      toast.error(t('errorOccurred', currentLanguage.code))
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCustomers = customers.filter((customer) =>
    customer.customer_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    customer.phone_number?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    customer.address?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex)

  const handleSelectAll = () => {
    if (selectedCustomers.length === currentCustomers.length) {
      setSelectedCustomers([])
    } else {
      setSelectedCustomers(currentCustomers.map((c) => c.id))
    }
  }

  const handleSelectCustomer = (id: string) => {
    if (selectedCustomers.includes(id)) {
      setSelectedCustomers(selectedCustomers.filter((cId) => cId !== id))
    } else {
      setSelectedCustomers([...selectedCustomers, id])
    }
  }

  const handleRefresh = () => {
    loadCustomers()
    toast.success(t('dataRefreshed', currentLanguage.code))
  }

  const handleClearSearch = () => {
    setSearchQuery("")
  }

  const handleViewNotes = (notes: string) => {
    setSelectedNotes(notes)
    setNotesModalOpen(true)
  }

  const handleDeleteClick = (id: string) => {
    setCustomerToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!customerToDelete) return

    try {
      const customer = await getCustomer(customerToDelete)
      
      await deleteCustomer(customerToDelete)
      
      try {
        await logAction(
          "حذف",
          `تمت عملية حذف للزبون: ${customer?.customer_name || 'غير معروف'}`,
          "customers",
          undefined,
          {
            customer_name: customer?.customer_name || '',
            type: customer?.type || '',
            phone_number: customer?.phone_number || '',
          },
          undefined
        )
      } catch (logError) {
        console.error("Error logging action:", logError)
      }
      
      toast.success(t('customerDeletedSuccess', currentLanguage.code))
      setDeleteConfirmOpen(false)
      setCustomerToDelete(null)
      loadCustomers()
    } catch (error: unknown) {
      console.error(error)
      const errorMessage = (error as { message?: string })?.message || t('errorDeletingData', currentLanguage.code)
      
      // رسالة مخصصة للأخطاء
      if (errorMessage.includes('قائمة بيع آجلة') || errorMessage.includes('دفعة مالية')) {
        toast.error(errorMessage, { duration: 8000 })
      } else {
        toast.error(t('errorDeletingData', currentLanguage.code))
      }
      
      setDeleteConfirmOpen(false)
      setCustomerToDelete(null)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedCustomers.length === 0) {
      toast.error(t('selectCustomersToDelete', currentLanguage.code))
      return
    }

    try {
      const customersToDelete = customers.filter(c => selectedCustomers.includes(c.id))
      const customerNames = customersToDelete.map(c => c.customer_name).join(', ')
      
      await deleteCustomers(selectedCustomers)
      
      try {
        await logAction(
          "حذف متعدد",
          `تمت عملية حذف لـ ${selectedCustomers.length} زبون: (${customerNames})`,
          "customers",
          undefined,
          { count: selectedCustomers.length, names: customerNames },
          undefined
        )
      } catch (logError) {
        console.error("Error logging action:", logError)
      }
      
      toast.success(`${selectedCustomers.length} ${t('customersDeletedSuccess', currentLanguage.code).replace('{count}', '')}`.trim())
      setSelectedCustomers([])
      loadCustomers()
    } catch (error: unknown) {
      console.error(error)
      const errorMessage = (error as { message?: string })?.message || t('errorDeletingData', currentLanguage.code)
      
      // رسالة مخصصة للأخطاء
      if (errorMessage.includes('تم حذف') || errorMessage.includes('لا يمكن حذف')) {
        toast.error(errorMessage, { duration: 8000 })
      } else {
        toast.error(t('errorDeletingData', currentLanguage.code))
      }
      
      setSelectedCustomers([])
      loadCustomers()
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <Card className="p-6">
            <p className="text-center text-muted-foreground">{t('loading', currentLanguage.code)}</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard requiredPermission="view_people">
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            title="رجوع"
            className="shrink-0"
          >
            <ArrowRight className="h-5 w-5 theme-icon" />
          </Button>
          <div className="flex-1 text-right">
            <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
              {t('customerManagement', currentLanguage.code)}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('manageCustomersList', currentLanguage.code)}
            </p>
          </div>
        </div>

        <Card className="p-6">
          <div className="flex flex-wrap gap-3 mb-6">
            <Link href="/customers/add">
              <Button className="gap-2">
                <Plus className="h-4 w-4 theme-success" />
                {t('add', currentLanguage.code)}
              </Button>
            </Link>
            <Button
              variant="outline"
              className="gap-2"
              disabled={selectedCustomers.length !== 1}
              onClick={() => {
                if (selectedCustomers.length === 1) {
                  router.push("/customers/edit/" + selectedCustomers[0])
                }
              }}
            >
              <Edit className="h-4 w-4 theme-info" />
              {t('edit', currentLanguage.code)}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={selectedCustomers.length === 0}
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-4 w-4 theme-danger" />
              {t('delete', currentLanguage.code)}
            </Button>
            <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              {t('print', currentLanguage.code)}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={selectedCustomers.length !== 1}
            >
              <FileText className="h-4 w-4" />
              {t('customerAccountStatement', currentLanguage.code)}
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            <Button variant="secondary" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('file', currentLanguage.code)}
            </Button>
            <div className="flex-1 flex gap-2" style={{ minWidth: "300px" }}>
              <div className="relative flex-1">
                <Search className="absolute right-3 top-[50%] -translate-y-[50%] h-4 w-4 theme-icon" />
                <Input
                  type="text"
                  placeholder={t('searchForCustomer', currentLanguage.code)}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleClearSearch}
                title={t('clearSearch', currentLanguage.code)}
              >
                <X className="h-4 w-4 theme-danger" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <Button variant="outline" className="gap-2" onClick={handleSelectAll}>
              <CheckSquare className="h-4 w-4" />
              {selectedCustomers.length === currentCustomers.length ? t('clearSelection', currentLanguage.code) : t('selectAll', currentLanguage.code)}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 theme-info" />
              {t('refreshPage', currentLanguage.code)}
            </Button>
          </div>

          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <div className="min-w-[800px]">
              <Table>
              <TableHeader>
                <TableRow style={{ background: 'linear-gradient(to right, var(--theme-surface), var(--theme-accent))', color: 'var(--theme-text)' }}>
                  <TableHead className="text-center" style={{ width: "100px", color: 'var(--theme-text)' }}>#</TableHead>
                  <TableHead className="text-right pr-4" style={{ color: 'var(--theme-text)' }}>{t('customerName', currentLanguage.code)}</TableHead>
                  <TableHead className="text-left" style={{ color: 'var(--theme-text)' }}>{t('phoneNumber', currentLanguage.code)}</TableHead>
                  <TableHead className="text-right pr-4" style={{ color: 'var(--theme-text)' }}>{t('address', currentLanguage.code)}</TableHead>
                  <TableHead className="text-left" style={{ color: 'var(--theme-text)' }}>{t('balanceIQD', currentLanguage.code)}</TableHead>
                  <TableHead className="text-left" style={{ color: 'var(--theme-text)' }}>{t('balanceUSD', currentLanguage.code)}</TableHead>
                  <TableHead className="text-right pr-4" style={{ color: 'var(--theme-text)' }}>{t('notes', currentLanguage.code)}</TableHead>
                  <TableHead className="text-center" style={{ color: 'var(--theme-text)' }}>{t('operations', currentLanguage.code)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('noCustomers', currentLanguage.code)}
                    </TableCell>
                  </TableRow>
                ) : (
                  currentCustomers.map((customer, index) => (
                    <TableRow 
                      key={customer.id}
                      className="transition-colors"
                      style={{
                        backgroundColor: selectedCustomers.includes(customer.id) ? 'var(--theme-surface)' : 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-surface)'}
                      onMouseLeave={(e) => {
                        if (!selectedCustomers.includes(customer.id)) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-3">
                          <span className="font-mono text-sm text-muted-foreground" style={{ minWidth: "24px" }}>
                            {startIndex + index + 1}
                          </span>
                          <Checkbox
                            checked={selectedCustomers.includes(customer.id)}
                            onCheckedChange={() => handleSelectCustomer(customer.id)}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{customer.customer_name}</TableCell>
                      <TableCell className="text-left font-mono">
                        {customer.phone_number || "-"}
                      </TableCell>
                      <TableCell>{customer.address || "-"}</TableCell>
                      <TableCell className="text-left font-mono">
                        <Badge
                          variant={customer.balance_iqd >= 0 ? "secondary" : "destructive"}
                          className="gap-1"
                        >
                          {formatCurrency(customer.balance_iqd)}
                          <span className="text-xs">IQD</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left font-mono">
                        <Badge
                          variant={customer.balance_usd >= 0 ? "outline" : "destructive"}
                          className="gap-1"
                        >
                          {formatCurrency(customer.balance_usd)}
                          <span className="text-xs">USD</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 truncate"
                            style={{ maxWidth: "200px" }}
                            title={customer.notes || ""}
                          >
                            {customer.notes || "-"}
                          </div>
                          {customer.notes && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => handleViewNotes(customer.notes || "")}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={"/customers/edit/" + customer.id}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteClick(customer.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold" style={{ color: "var(--theme-text)" }}>
                إجمالي الزبائن:
              </span>{" "}
              <Badge variant="secondary" className="mr-2">
                {filteredCustomers.length}
              </Badge>
              {selectedCustomers.length > 0 && (
                <span className="mr-2">
                  (محدد: {selectedCustomers.length})
                </span>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      )
                    })
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="icon"
                          onClick={() => setCurrentPage(page)}
                          className="w-10"
                        >
                          {page}
                        </Button>
                      </div>
                    ))}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>الملاحظات الكاملة</DialogTitle>
            </DialogHeader>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{selectedNotes}</p>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد الحذف</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              هل أنت متأكد من حذف هذا الزبون؟ هذه العملية لا يمكن التراجع عنها.
            </p>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                إلغاء
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                حذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </PermissionGuard>
  )
}
