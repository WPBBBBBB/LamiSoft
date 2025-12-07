"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  RefreshCw,
  ArrowRight,
  FileText,
  Package,
  Check,
  XCircle,
  Save,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { 
  getStore, 
  getStoreInventory, 
  deleteInventoryItem,
  deleteInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  type Store,
  type InventoryItem 
} from "@/lib/stores-operations"
import { getCurrentExchangeRate } from "@/lib/exchange-rate-operations"
import { toast } from "sonner"
import { use } from "react"

type EditingRow = {
  id: string
  productcode: string
  productname: string
  quantity: number
  unit: string
  sellpriceiqd: number
  sellpriceusd: number
}

const UNIT_OPTIONS = ["كارتون", "قطعة", "كغم", "لتر"]

export default function StoreDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: storeId } = use(params)
  const [store, setStore] = useState<Store | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  
  // Exchange rate
  const [exchangeRate, setExchangeRate] = useState<number>(1500)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 30
  
  // Inline editing state
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set())
  const [editedData, setEditedData] = useState<Map<string, EditingRow>>(new Map())
  // Always show new item row - no need for isAddingNew
  const [newRowData, setNewRowData] = useState<EditingRow>({
    id: "new",
    productcode: "",
    productname: "",
    quantity: 0,
    unit: "",
    sellpriceiqd: 0,
    sellpriceusd: 0,
  })

  useEffect(() => {
    loadStoreData()
    loadExchangeRate()
  }, [storeId])

  async function loadStoreData() {
    try {
      setIsLoading(true)
      const storeData = await getStore(storeId)
      const inventoryData = await getStoreInventory(storeId)
      setStore(storeData)
      setInventory(inventoryData)
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء تحميل البيانات")
    } finally {
      setIsLoading(false)
    }
  }

  async function loadExchangeRate() {
    try {
      const rate = await getCurrentExchangeRate()
      setExchangeRate(rate)
    } catch (error) {
      console.error("خطأ في تحميل سعر الصرف:", error)
      // استخدام القيمة الافتراضية
    }
  }

  // Filter inventory based on search
  const filteredInventory = inventory.filter((item) =>
    item.productcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.productname.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Pagination calculations
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedInventory = filteredInventory.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Handle refresh
  const handleRefresh = () => {
    loadStoreData()
    setEditingRows(new Set())
    setEditedData(new Map())
    toast.success("تم تحديث البيانات")
  }

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery("")
  }

  // Reset new row data after adding
  const resetNewRowData = () => {
    setNewRowData({
      id: "new",
      productcode: "",
      productname: "",
      quantity: 0,
      unit: "",
      sellpriceiqd: 0,
      sellpriceusd: 0,
    })
  }

  // Handle edit row
  const handleEditRow = (item: InventoryItem) => {
    const newEditingRows = new Set(editingRows)
    newEditingRows.add(item.id)
    setEditingRows(newEditingRows)
    
    const newEditedData = new Map(editedData)
    newEditedData.set(item.id, {
      id: item.id,
      productcode: item.productcode,
      productname: item.productname,
      quantity: item.quantity,
      unit: item.unit || "",
      sellpriceiqd: item.sellpriceiqd,
      sellpriceusd: item.sellpriceusd,
    })
    setEditedData(newEditedData)
  }

  // Handle cancel edit
  const handleCancelEdit = (id: string) => {
    const newEditingRows = new Set(editingRows)
    newEditingRows.delete(id)
    setEditingRows(newEditingRows)
    
    const newEditedData = new Map(editedData)
    newEditedData.delete(id)
    setEditedData(newEditedData)
  }

  // Handle save edited row
  const handleSaveRow = async (id: string) => {
    const data = editedData.get(id)
    if (!data) return

    if (!data.productcode.trim() || !data.productname.trim()) {
      toast.error("الرجاء إدخال رمز واسم المادة")
      return
    }

    try {
      await updateInventoryItem(id, {
        productcode: data.productcode,
        productname: data.productname,
        quantity: data.quantity,
        unit: data.unit,
        sellpriceiqd: data.sellpriceiqd,
        sellpriceusd: data.sellpriceusd,
        storeid: storeId,
      })
      
      toast.success("تم تحديث المادة بنجاح")
      handleCancelEdit(id)
      loadStoreData()
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء الحفظ")
    }
  }

  // Handle save new row
  const handleSaveNewRow = async () => {
    if (!newRowData.productcode.trim() || !newRowData.productname.trim()) {
      toast.error("الرجاء إدخال رمز واسم المادة")
      return
    }

    try {
      await createInventoryItem({
        productcode: newRowData.productcode,
        productname: newRowData.productname,
        quantity: newRowData.quantity,
        unit: newRowData.unit,
        sellpriceiqd: newRowData.sellpriceiqd,
        sellpriceusd: newRowData.sellpriceusd,
        storeid: storeId,
        minstocklevel: 0,
        reorderquantity: 0,
        refnumber: "",
        monitorenabled: false,
        lowstocknotify: false,
      })
      
      toast.success("تم إضافة المادة بنجاح")
      resetNewRowData()
      loadStoreData()
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء الإضافة")
    }
  }

  // Handle Enter key press on price field
  const handlePriceKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSaveNewRow()
    }
  }

  // Update edited data with auto currency conversion
  const updateEditedField = (id: string, field: keyof EditingRow, value: any) => {
    const newEditedData = new Map(editedData)
    const currentData = newEditedData.get(id)
    if (currentData) {
      const updatedData = { ...currentData, [field]: value }
      
      // Auto convert currency
      if (field === "sellpriceiqd") {
        updatedData.sellpriceusd = Math.round((value / exchangeRate) * 100) / 100
      } else if (field === "sellpriceusd") {
        updatedData.sellpriceiqd = Math.round(value * exchangeRate)
      }
      
      newEditedData.set(id, updatedData)
      setEditedData(newEditedData)
    }
  }

  // Update new row data with auto currency conversion
  const updateNewRowField = (field: keyof EditingRow, value: any) => {
    const updatedData = { ...newRowData, [field]: value }
    
    // Auto convert currency
    if (field === "sellpriceiqd") {
      updatedData.sellpriceusd = Math.round((value / exchangeRate) * 100) / 100
    } else if (field === "sellpriceusd") {
      updatedData.sellpriceiqd = Math.round(value * exchangeRate)
    }
    
    setNewRowData(updatedData)
  }

  // Handle delete items
  const handleDeleteClick = () => {
    if (selectedItems.length === 0) {
      toast.error("الرجاء اختيار مادة واحدة على الأقل للحذف")
      return
    }
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (selectedItems.length === 0) return

    try {
      if (selectedItems.length === 1) {
        await deleteInventoryItem(selectedItems[0])
        toast.success("تم حذف المادة بنجاح")
      } else {
        await deleteInventoryItems(selectedItems)
        toast.success(`تم حذف ${selectedItems.length} مادة بنجاح`)
      }
      
      setDeleteConfirmOpen(false)
      setSelectedItems([])
      loadStoreData()
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء الحذف")
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <Card className="p-6">
            <p className="text-center text-muted-foreground">جاري التحميل...</p>
          </Card>
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <Card className="p-6 text-center">
            <p className="mb-4">المخزن غير موجود</p>
            <Button onClick={() => router.push("/stores")}>
              العودة للمخازن
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Button>
        </div>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
              {store.storename}
            </h1>
            <p className="text-muted-foreground mt-1">
              {store.location && `${store.location} • `}
              {store.storekeeper && `أمين المخزن: ${store.storekeeper}`}
            </p>
          </div>
        </div>

        <Card className="p-6">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              onClick={handleDeleteClick}
              variant="outline"
              className="gap-2"
              disabled={selectedItems.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              حذف المحدد ({selectedItems.length})
            </Button>
          </div>

          {/* Toolbar */}
          <div className="flex gap-2 mb-6">
            <Button variant="outline" size="icon">
              <FileText className="h-4 w-4" />
            </Button>
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن مادة (الرمز، الاسم)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            {searchQuery && (
              <Button variant="outline" size="icon" onClick={handleClearSearch}>
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Inventory Table */}
          <div className="rounded-lg border overflow-hidden mb-6">
            <Table>
              <TableHeader>
                <TableRow style={{ background: 'linear-gradient(to right, var(--theme-surface), var(--theme-accent))', color: 'var(--theme-text)' }}>
                  <TableHead className="text-center w-[50px]" style={{ color: 'var(--theme-text)' }}>#</TableHead>
                  <TableHead className="text-center w-[50px]" style={{ color: 'var(--theme-text)' }}>
                    <Checkbox
                      checked={selectedItems.length === filteredInventory.length && filteredInventory.length > 0}
                      onCheckedChange={() => {
                        if (selectedItems.length === filteredInventory.length) {
                          setSelectedItems([])
                        } else {
                          setSelectedItems(filteredInventory.map((item) => item.id))
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="text-right" style={{ color: 'var(--theme-text)' }}>رمز المادة</TableHead>
                  <TableHead className="text-right" style={{ color: 'var(--theme-text)' }}>اسم المادة</TableHead>
                  <TableHead className="text-right" style={{ color: 'var(--theme-text)' }}>الكمية</TableHead>
                  <TableHead className="text-right" style={{ color: 'var(--theme-text)' }}>الوحدة</TableHead>
                  <TableHead className="text-right" style={{ color: 'var(--theme-text)' }}>سعر البيع (IQD)</TableHead>
                  <TableHead className="text-right" style={{ color: 'var(--theme-text)' }}>سعر البيع (USD)</TableHead>
                  <TableHead className="text-right" style={{ color: 'var(--theme-text)' }}>تاريخ الإضافة</TableHead>
                  <TableHead className="text-center w-[100px]" style={{ color: 'var(--theme-text)' }}>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* New Row - Always Visible */}
                <TableRow className="sticky top-0 z-10" style={{ backgroundColor: 'var(--theme-surface)', opacity: 0.95, color: 'var(--theme-text)' }}>
                  <TableCell className="text-center" style={{ color: 'var(--theme-text)' }}>✨</TableCell>
                  <TableCell className="text-center" style={{ color: 'var(--theme-text)' }}>-</TableCell>
                  <TableCell className="text-right">
                    <Input
                      placeholder="رمز المادة"
                      value={newRowData.productcode}
                      onChange={(e) => updateNewRowField("productcode", e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      placeholder="اسم المادة"
                      value={newRowData.productname}
                      onChange={(e) => updateNewRowField("productname", e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      placeholder="الكمية"
                      value={newRowData.quantity || ""}
                      onChange={(e) => updateNewRowField("quantity", parseFloat(e.target.value) || 0)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={newRowData.unit}
                      onValueChange={(value) => updateNewRowField("unit", value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="اختر الوحدة" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      placeholder="السعر IQD"
                      value={newRowData.sellpriceiqd || ""}
                      onChange={(e) => updateNewRowField("sellpriceiqd", parseFloat(e.target.value) || 0)}
                      onKeyPress={handlePriceKeyPress}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      placeholder="السعر USD"
                      value={newRowData.sellpriceusd || ""}
                      onChange={(e) => updateNewRowField("sellpriceusd", parseFloat(e.target.value) || 0)}
                      onKeyPress={handlePriceKeyPress}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    سيضاف تلقائياً
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-green-600"
                      onClick={handleSaveNewRow}
                      title="حفظ (Enter)"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Existing Rows */}
                {paginatedInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "لا توجد نتائج للبحث" : "لا توجد مواد في المخزن"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInventory.map((item, index) => {
                    const isEditing = editingRows.has(item.id)
                    const editData = editedData.get(item.id)
                    const globalIndex = startIndex + index

                    return (
                      <TableRow
                        key={item.id}
                        className="transition-colors"
                        style={{
                          backgroundColor: isEditing ? 'var(--theme-surface)' :
                            selectedItems.includes(item.id) ? 'var(--theme-surface)' : 'transparent'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-surface)'}
                        onMouseLeave={(e) => {
                          if (!isEditing && !selectedItems.includes(item.id)) {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <TableCell className="text-center">{globalIndex + 1}</TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            disabled={isEditing}
                            onCheckedChange={() => {
                              if (selectedItems.includes(item.id)) {
                                setSelectedItems(selectedItems.filter((itemId) => itemId !== item.id))
                              } else {
                                setSelectedItems([...selectedItems, item.id])
                              }
                            }}
                          />
                        </TableCell>
                        
                        {/* Product Code */}
                        <TableCell className="text-right font-medium">
                          {isEditing && editData ? (
                            <Input
                              value={editData.productcode}
                              onChange={(e) => updateEditedField(item.id, "productcode", e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            item.productcode
                          )}
                        </TableCell>
                        
                        {/* Product Name */}
                        <TableCell className="text-right">
                          {isEditing && editData ? (
                            <Input
                              value={editData.productname}
                              onChange={(e) => updateEditedField(item.id, "productname", e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            item.productname
                          )}
                        </TableCell>
                        
                        {/* Quantity */}
                        <TableCell className="text-right">
                          {isEditing && editData ? (
                            <Input
                              type="number"
                              value={editData.quantity}
                              onChange={(e) => updateEditedField(item.id, "quantity", parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          ) : (
                            <span className={item.quantity < item.minstocklevel ? "text-red-600 font-bold" : ""}>
                              {item.quantity}
                            </span>
                          )}
                        </TableCell>
                        
                        {/* Unit */}
                        <TableCell className="text-right">
                          {isEditing && editData ? (
                            <Select
                              value={editData.unit}
                              onValueChange={(value) => updateEditedField(item.id, "unit", value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="اختر الوحدة" />
                              </SelectTrigger>
                              <SelectContent>
                                {UNIT_OPTIONS.map((unit) => (
                                  <SelectItem key={unit} value={unit}>
                                    {unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            item.unit
                          )}
                        </TableCell>
                        
                        {/* Price IQD */}
                        <TableCell className="text-right">
                          {isEditing && editData ? (
                            <Input
                              type="number"
                              value={editData.sellpriceiqd}
                              onChange={(e) => updateEditedField(item.id, "sellpriceiqd", parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          ) : (
                            item.sellpriceiqd.toLocaleString()
                          )}
                        </TableCell>
                        
                        {/* Price USD */}
                        <TableCell className="text-right">
                          {isEditing && editData ? (
                            <Input
                              type="number"
                              value={editData.sellpriceusd}
                              onChange={(e) => updateEditedField(item.id, "sellpriceusd", parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          ) : (
                            item.sellpriceusd.toLocaleString()
                          )}
                        </TableCell>
                        
                        {/* Created Date */}
                        <TableCell className="text-right text-sm">
                          {new Date(item.createdat).toLocaleDateString("ar-IQ")}
                        </TableCell>
                        
                        {/* Actions */}
                        <TableCell className="text-center">
                          {isEditing ? (
                            <div className="flex gap-1 justify-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-600"
                                onClick={() => handleSaveRow(item.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600"
                                onClick={() => handleCancelEdit(item.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleEditRow(item)}
                              disabled={editingRows.size > 0}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer with Pagination */}
          <div className="flex flex-col gap-4 pt-4 border-t">
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  الأولى
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  السابقة
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  التالية
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  الأخيرة
                </Button>
              </div>
            )}
            
            {/* Stats and Refresh */}
            <div className="flex justify-between items-center">
              <Button onClick={handleRefresh} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                تحديث الجدول
              </Button>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>
                  عرض {startIndex + 1} - {Math.min(endIndex, filteredInventory.length)} من {filteredInventory.length}
                </span>
                <span className="font-semibold">
                  سعر الصرف: {exchangeRate.toLocaleString()} IQD = 1 USD
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              {selectedItems.length === 1 
                ? "هل أنت متأكد من حذف هذه المادة؟" 
                : `هل أنت متأكد من حذف ${selectedItems.length} مادة؟`
              }
              {" "}هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              حذف {selectedItems.length > 1 && `(${selectedItems.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
