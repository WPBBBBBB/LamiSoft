"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { toast } from "sonner"
import { generateInventoryPDF } from "@/lib/print-inventory"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, Plus, X, FileText, Printer } from "lucide-react"
import {
  getStores,
  getInventoryByStore,
  generateNextCountId,
  createInventoryCount,
  applyInventoryCount,
  type Store,
  type InventoryItem,
  type InventoryCountDetail,
} from "@/lib/inventory-count-operations"
import { cn } from "@/lib/utils"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"

interface DetailRow extends InventoryCountDetail {
  tempId: string
  searchText: string
}

// عدد الصفوف الدنيا المحمية من الحذف
const MINIMUM_ROWS = 6

// دالة مساعدة لإنشاء صف فارغ
const createEmptyRow = (countId: string = ''): DetailRow => ({
  tempId: `temp-${Date.now()}-${Math.random()}`,
  count_id: countId,
  item_id: '',
  item_name: '',
  searchText: '',
  system_qty: 0,
  actual_qty: 0,
  diff_qty: 0,
  cost: 0,
  diff_value: 0,
  item_status: 'عادي',
  notes: '',
})

export default function InventoryCountPage() {
  const { user: currentUser } = useAuth()
  const { currentLanguage } = useSettings()
  const lang = currentLanguage.code
  
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [countId, setCountId] = useState<string>("")
  const [date, setDate] = useState<Date>(new Date())
  const [notes, setNotes] = useState<string>("")
  const [details, setDetails] = useState<DetailRow[]>(() => 
    Array.from({ length: MINIMUM_ROWS }, () => createEmptyRow())
  )

  // Whenever the last row is filled (product selected or quantity entered), add a new empty row
  useEffect(() => {
    if (details.length === 0) {
      // إذا تم حذف جميع الصفوف، أعد إنشاء 6 صفوف
      setDetails(Array.from({ length: MINIMUM_ROWS }, () => createEmptyRow()))
      return
    }
    
    // لا نضيف صفوف تلقائياً إلا إذا وصلنا للصف السادس أو تجاوزناه
    if (details.length < MINIMUM_ROWS) {
      return
    }
    
    const last = details[details.length - 1]
    // If last row has product or actual_qty entered, add a new row
    if ((last.item_id || last.searchText.trim() || last.actual_qty) && details.length < 100) {
      setDetails([
        ...details,
        createEmptyRow(countId)
      ])
    }
  }, [details, countId])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([])
  const [searchOpen, setSearchOpen] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadStores()
    handleGenerateCountId()
  }, [])

  useEffect(() => {
    if (selectedStore) {
      loadInventoryItems(selectedStore)
    } else {
      setInventoryItems([])
      setDetails([])
      setSearchResults([])
      setSearchOpen(null)
    }
  }, [selectedStore])

  const loadStores = async () => {
    const result = await getStores()
    if (result.success) {
      setStores(result.data as Store[])
    }
  }

  const loadInventoryItems = async (storeId: string) => {
    const result = await getInventoryByStore(storeId)
    if (result.success) {
      setInventoryItems(result.data as InventoryItem[])
      setSearchResults(result.data as InventoryItem[])
    }
  }

  const handleGenerateCountId = async () => {
    const newId = await generateNextCountId()
    setCountId(newId)
  }

  const addNewRow = () => {
    const newRow: DetailRow = {
      tempId: `temp-${Date.now()}`,
      count_id: countId,
      item_id: '',
      item_name: '',
      searchText: '',
      system_qty: 0,
      actual_qty: 0,
      diff_qty: 0,
      cost: 0,
      diff_value: 0,
      item_status: 'عادي',
      notes: '',
    }
    setDetails([...details, newRow])
  }

  const removeRow = (tempId: string) => {
    const index = details.findIndex(d => d.tempId === tempId)
    
    // منع حذف أول 6 صفوف
    if (index < MINIMUM_ROWS) {
      toast.error(t("inventoryCountCannotDeleteFirstRows", lang).replace("{count}", String(MINIMUM_ROWS)))
      return
    }
    
    setDetails(details.filter(d => d.tempId !== tempId))
  }

  const updateRow = (tempId: string, field: keyof DetailRow, value: string | number) => {
    setDetails(details.map(row => {
      if (row.tempId === tempId) {
        const updated = { ...row, [field]: value }

        // If user edits the search text manually, clear the selected item to avoid mismatches.
        if (field === "searchText") {
          const nextText = String(value)
          if (updated.item_id) {
            updated.item_id = ""
            updated.item_name = ""
            updated.system_qty = 0
            updated.cost = 0
            updated.diff_qty = 0
            updated.diff_value = 0
            updated.item_status = "عادي"
          }

          // Keep display name in sync for convenience.
          updated.item_name = nextText
          return updated
        }

        // If item selected, update system qty and cost
        if (field === "item_id" && value) {
          const item = inventoryItems.find(i => i.id === value)
          if (item) {
            updated.item_name = item.productname
            updated.searchText = `${item.productname} (${item.productcode})`
            updated.system_qty = Number(item.quantity)
            updated.cost = Number(item.sellpriceiqd)
          }
        }

        // Calculate diff when actual_qty changes
        if (field === "actual_qty" || field === "item_id") {
          updated.diff_qty = updated.actual_qty - updated.system_qty
          updated.diff_value = updated.diff_qty * updated.cost
          
          // Update status based on diff
          if (updated.diff_qty > 0) {
            updated.item_status = "زيادة"
          } else if (updated.diff_qty < 0) {
            updated.item_status = "نقص"
          } else {
            updated.item_status = "متطابق"
          }
        }

        return updated
      }
      return row
    }))
  }

  const handleProductSearch = (rowKey: string, searchTerm: string) => {
    if (!selectedStore) {
      toast.error(t("selectStoreRequired", lang))
      return
    }

    if (!searchTerm || searchTerm.length === 0) {
      setSearchResults(inventoryItems)
      setSearchOpen(rowKey)
      return
    }

    const lowered = searchTerm.toLowerCase()
    const filtered = inventoryItems.filter((item) =>
      item.productcode.toLowerCase().includes(lowered) ||
      item.productname.toLowerCase().includes(lowered)
    )

    setSearchResults(filtered)
    setSearchOpen(rowKey)
  }

  const handleSelectProduct = (tempId: string, item: InventoryItem) => {
    setDetails(details.map((row) => {
      if (row.tempId !== tempId) return row

      const systemQty = Number(item.quantity)
      const cost = Number(item.sellpriceiqd)
      const diffQty = Number(row.actual_qty) - systemQty
      const diffValue = diffQty * cost

      let status: DetailRow["item_status"] = "متطابق"
      if (diffQty > 0) status = "زيادة"
      else if (diffQty < 0) status = "نقص"

      return {
        ...row,
        item_id: item.id,
        item_name: item.productname,
        searchText: `${item.productname} (${item.productcode})`,
        system_qty: systemQty,
        cost,
        diff_qty: diffQty,
        diff_value: diffValue,
        item_status: status,
      }
    }))

    setSearchOpen(null)
    setSearchResults([])
  }

  const handleKeyDown = (e: React.KeyboardEvent, tempId: string) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const currentIndex = details.findIndex(d => d.tempId === tempId)
      
      // إذا كنا في الصفوف الـ 5 الأولى (index 0-4)، انتقل للصف التالي
      if (currentIndex < MINIMUM_ROWS - 1) {
        // التركيز على الصف التالي
        setTimeout(() => {
          const nextRow = document.querySelector(`[data-row-index="${currentIndex + 1}"] input`)
          if (nextRow instanceof HTMLElement) {
            nextRow.focus()
          }
        }, 0)
      }
      // إذا كنا في الصف السادس أو ما بعده، أضف صف جديد
      else if (currentIndex >= MINIMUM_ROWS - 1) {
        if (currentIndex === details.length - 1) {
          addNewRow()
          // التركيز على الصف الجديد
          setTimeout(() => {
            const newRow = document.querySelector(`[data-row-index="${currentIndex + 1}"] input`)
            if (newRow instanceof HTMLElement) {
              newRow.focus()
            }
          }, 100)
        } else {
          // الانتقال للصف التالي الموجود
          setTimeout(() => {
            const nextRow = document.querySelector(`[data-row-index="${currentIndex + 1}"] input`)
            if (nextRow instanceof HTMLElement) {
              nextRow.focus()
            }
          }, 0)
        }
      }
    }
  }

  const getRowColor = (row: DetailRow) => {
    if (row.diff_qty > 0) {
      return "bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30"
    } else if (row.diff_qty < 0) {
      return "bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30"
    }
    return ""
  }

  const calculateTotalDiff = () => {
    return details
      .filter(d => d.diff_qty > 0)
      .reduce((sum, d) => sum + d.diff_value, 0)
  }

  const validateCount = () => {
    if (!selectedStore) {
      toast.error(t("selectStoreRequired", lang))
      return false
    }
    if (!countId) {
      toast.error(t("inventoryCountNumberRequired", lang))
      return false
    }
    if (details.length === 0 || details.every(d => !d.item_id)) {
      toast.error(t("addAtLeastOneItem", lang))
      return false
    }
    return true
  }

  const handleApprove = async () => {
    if (!validateCount()) return

    setIsLoading(true)
    try {
      const selectedStoreData = stores.find(s => s.id === selectedStore)
      const count = {
        id: "",
        count_id: countId,
        date: date.toISOString().split('T')[0],
        user_id: currentUser?.id || "",
        user_name: currentUser?.full_name || "",
        type: "جرد دوري",
        notes,
        status: "معتمد",
        store_id: selectedStore,
        store_name: selectedStoreData?.storename || "",
      }
      const validDetails = details.filter(d => d.item_id)
      const createResult = await createInventoryCount(count, validDetails)
      if (!createResult.success) {
        toast.error(createResult.error || t("inventoryCountSaveFailed", lang))
        setIsLoading(false)
        return
      }
      const applyResult = await applyInventoryCount(countId, validDetails)
      if (!applyResult.success) {
        toast.error(applyResult.error || t("inventoryCountApplyFailed", lang))
        setIsLoading(false)
        return
      }
      toast.success(t("inventoryCountApprovedSuccess", lang))
      setCountId("")
      setNotes("")
      setDetails(Array.from({ length: MINIMUM_ROWS }, () => createEmptyRow()))
      setSelectedStore("")
      // إنشاء رقم قائمة جديد
      handleGenerateCountId()
    } catch (error) {
      console.error("Error approving count:", error)
      toast.error(t("inventoryCountApproveError", lang))
    } finally {
      setIsLoading(false)
    }
  }

  const openReportWindow = (data: any) => {
      const jsonString = JSON.stringify(data)
      // Use text encoder to handle utf-8 correctly before base64
      const utf8Bytes = new TextEncoder().encode(jsonString)
      const binaryString = String.fromCharCode(...Array.from(utf8Bytes))
      const base64Data = btoa(binaryString)
      const encodedData = encodeURIComponent(base64Data)

      window.location.href = `/report/inventory?s=${encodedData}&back=/inventory-count`
  }

  const handlePrint = async () => {
    try {
      setIsLoading(true)
      const storeName = stores.find(s => s.id === selectedStore)?.storename || ""
      const managerName = currentUser?.full_name || ""
      
      const reportData = {
          countId,
          storeName,
          managerName,
          date: date.toISOString(),
          items: details.filter(d => d.item_id).map(d => ({
              productName: d.item_name,
              systemQty: d.system_qty,
              actualQty: d.actual_qty,
              diffQty: d.diff_qty,
              cost: d.cost,
              diffValue: d.diff_value,
              status: d.item_status
          })),
          totalDiffQty: details.reduce((sum, d) => sum + d.diff_qty, 0),
          totalDiffValue: details.reduce((sum, d) => sum + d.diff_value, 0),
          notes
      }

      openReportWindow(reportData)
      
      toast.success(t("inventoryCountPrintWindowOpened", lang))
    } catch (error) {
      console.error("Error printing:", error)
      toast.error(t("inventoryCountPrintError", lang))
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveAndPrint = async () => {
    if (!validateCount()) return

    // Capture data before approval (which resets state)
    const storeName = stores.find(s => s.id === selectedStore)?.storename || ""
    const managerName = currentUser?.full_name || ""
    const currentDetails = [...details]
    const currentCountId = countId
    const currentNotes = notes
    const currentDate = date.toISOString()

    setIsLoading(true)
    try {
      // First, attempt to approve/save
      await handleApprove()
      
      // If successful, prepare report data
      const reportData = {
          countId: currentCountId,
          storeName,
          managerName,
          date: currentDate,
          items: currentDetails.filter(d => d.item_id).map(d => ({
              productName: d.item_name,
              systemQty: d.system_qty,
              actualQty: d.actual_qty,
              diffQty: d.diff_qty,
              cost: d.cost,
              diffValue: d.diff_value,
              status: d.item_status
          })),
          totalDiffQty: currentDetails.reduce((sum, d) => sum + d.diff_qty, 0),
          totalDiffValue: currentDetails.reduce((sum, d) => sum + d.diff_value, 0),
          notes: currentNotes
      }

      openReportWindow(reportData)
      
      toast.success(t("inventoryCountPrintWindowOpened", lang))
    } catch (error) {
      console.error("Error printing:", error)
      toast.error(t("inventoryCountPrintError", lang))
    } finally {
      setIsLoading(false)
    }
  }

  // State for dropdown position
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number; width: number } | null>(null)

  const updateDropdownPosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    setDropdownPosition({
      top: rect.bottom,
      right: window.innerWidth - rect.right,
      width: rect.width
    })
  }

  // Handle scroll to update position or close
  useEffect(() => {
    const handleScroll = () => {
      if (searchOpen) {
        setSearchOpen(null) // Close on scroll for simplicity
      }
    }
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll, true)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll, true)
    }
  }, [searchOpen])

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            {t("inventoryCount", lang)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* First Row: Store, Count ID, User, Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t("inventoryCountFromStore", lang)}</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectStore", lang)} />
                </SelectTrigger>
                <SelectContent>
                  {stores.map(store => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.storename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("inventoryCountNumber", lang)}</Label>
              <Input
                value={countId}
                disabled
                placeholder="INV-000001"
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("operationManager", lang)}</Label>
              <Input
                value={currentUser?.full_name || ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("inventoryCountDate", lang)}</Label>
              <Input
                type="date"
                value={date.toISOString().split('T')[0]}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          {/* Notes Row */}
          <div className="space-y-2">
            <Label>{t("notes", lang)}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("inventoryCountNotesPlaceholder", lang)}
              rows={3}
            />
          </div>

          {/* Table */}
          <div className="rounded-lg border max-h-[600px] overflow-x-auto overflow-y-auto" ref={tableRef}>
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12">{t("rowNumber", lang)}</TableHead>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="min-w-[250px]">{t("product", lang)}</TableHead>
                  <TableHead className="w-28">{t("inventoryCountSystemQty", lang)}</TableHead>
                  <TableHead className="w-28">{t("price", lang)}</TableHead>
                  <TableHead className="w-28">{t("inventoryCountActualQty", lang)}</TableHead>
                  <TableHead className="w-28">{t("difference", lang)}</TableHead>
                  <TableHead className="w-28 text-center">{t("status", lang)}</TableHead>
                  <TableHead className="min-w-[200px]">{t("notes", lang)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {details.map((row, index) => (
                    <TableRow key={row.tempId} className={getRowColor(row)} data-row-index={index}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.tempId)}
                          disabled={index < MINIMUM_ROWS}
                          className={cn(
                            "h-8 w-8",
                            index < MINIMUM_ROWS 
                              ? "text-muted-foreground cursor-not-allowed opacity-50" 
                              : "text-destructive hover:text-destructive"
                          )}
                          title={index < MINIMUM_ROWS ? t("inventoryCountCannotDeleteRow", lang) : t("inventoryCountDeleteRow", lang)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Input
                            value={row.searchText}
                            onFocus={(e) => {
                              updateDropdownPosition(e.target)
                              handleProductSearch(row.tempId, row.searchText)
                            }}
                            onChange={(e) => {
                              updateDropdownPosition(e.target)
                              const value = e.target.value
                              updateRow(row.tempId, "searchText", value)
                              handleProductSearch(row.tempId, value)
                            }}
                            onBlur={() => {
                              setTimeout(() => setSearchOpen(null), 200)
                            }}
                            placeholder={t("searchForProduct", lang)}
                          />
                          {searchOpen === row.tempId && searchResults.length > 0 && dropdownPosition && createPortal(
                            <div 
                              className="fixed bg-background border rounded-md shadow-lg max-h-[300px] overflow-auto"
                              style={{
                                top: `${dropdownPosition.top}px`,
                                right: `${dropdownPosition.right}px`,
                                width: `${dropdownPosition.width}px`,
                                zIndex: 9999
                              }}
                            >
                              {searchResults.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    handleSelectProduct(row.tempId, item)
                                  }}
                                  className="w-full flex flex-col items-start px-4 py-2 text-right hover:bg-accent cursor-pointer border-b last:border-b-0"
                                >
                                  <span className="font-medium">{item.productname}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {item.productcode}
                                  </span>
                                </button>
                              ))}
                            </div>,
                            document.body
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.system_qty}
                          disabled
                          className="bg-muted text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.cost.toLocaleString()}
                          disabled
                          className="bg-muted text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.actual_qty || ""}
                          onChange={(e) => updateRow(row.tempId, "actual_qty", Number(e.target.value))}
                          onKeyDown={(e) => handleKeyDown(e, row.tempId)}
                          className="text-center"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.diff_qty}
                          disabled
                          className={cn(
                            "bg-muted text-center font-bold",
                            row.diff_qty > 0 && "text-red-600",
                            row.diff_qty < 0 && "text-orange-600"
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {!row.item_id ? (
                          <span className="text-muted-foreground">.</span>
                        ) : row.diff_qty > 0 ? (
                          <span className="inline-block px-3 py-1 rounded-[10px] border border-red-200 text-red-600 text-sm font-medium">
                            {t("inventoryCountStatusIncrease", lang)}
                          </span>
                        ) : row.diff_qty < 0 ? (
                          <span className="inline-block px-3 py-1 rounded-[10px] border border-orange-500 text-orange-600 text-sm font-medium">
                            {t("inventoryCountStatusDecrease", lang)}
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 rounded-[10px] border border-green-500 text-green-600 text-sm font-medium">
                            {t("inventoryCountStatusMatch", lang)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.notes}
                          onChange={(e) => updateRow(row.tempId, "notes", e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, row.tempId)}
                          placeholder={t("notePlaceholder", lang)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {details.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {t("inventoryCountEmptyState", lang).replace("{action}", t("inventoryCountAddRow", lang))}
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
          </div>


          <div className="flex flex-col md:flex-row justify-between items-center p-4 bg-muted rounded-lg border gap-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold">{t("inventoryCountTotalQtyDiff", lang)}</span>
              <span className={cn(
                "text-2xl font-bold dir-ltr",
                details.reduce((sum, d) => sum + d.diff_qty, 0) > 0 ? "text-red-600" : 
                details.reduce((sum, d) => sum + d.diff_qty, 0) < 0 ? "text-orange-600" : "text-green-600"
              )}>
                {details.reduce((sum, d) => sum + d.diff_qty, 0)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold">{t("inventoryCountTotalPriceDiff", lang)}</span>
              <span className={cn(
                "text-2xl font-bold dir-ltr",
                details.reduce((sum, d) => sum + d.diff_value, 0) > 0 ? "text-red-600" : 
                details.reduce((sum, d) => sum + d.diff_value, 0) < 0 ? "text-orange-600" : "text-green-600"
              )}>
                {details.reduce((sum, d) => sum + d.diff_value, 0).toLocaleString()} {t("currencyIQDAbbrev", lang)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleApprove}
              disabled={isLoading}
              className="h-12 text-lg"
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin ml-2" />
              ) : (
                <FileText className="h-5 w-5 ml-2" />
              )}
              {t("inventoryCountApprove", lang)}
            </Button>
            
            <Button
              onClick={handleApproveAndPrint}
              disabled={isLoading}
              variant="secondary"
              className="h-12 text-lg"
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin ml-2" />
              ) : (
                <Printer className="h-5 w-5 ml-2" />
              )}
              {t("inventoryCountApproveAndPrint", lang)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-8 rounded-lg shadow-lg flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-semibold">{t("inventoryCountProcessing", lang)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
