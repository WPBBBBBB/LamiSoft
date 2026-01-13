"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  RefreshCw,
  ArrowRight,
  FileText,
  Check,
  XCircle,
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
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"

type EditingRow = {
  id: string
  productcode: string
  productname: string
  quantity: number
  unit: string
  sellpriceiqd: number
  sellpriceusd: number
}

const UNIT_OPTIONS = [
  { value: "كارتون", labelKey: "unitCarton" },
  { value: "قطعة", labelKey: "unitPiece" },
  { value: "كغم", labelKey: "unitKg" },
  { value: "لتر", labelKey: "unitLiter" },
] as const

export default function StoreDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const { id: storeId } = use(params)
  const [store, setStore] = useState<Store | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  
  const [exchangeRate, setExchangeRate] = useState<number>(1500)
  
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 30
  
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set())
  const [editedData, setEditedData] = useState<Map<string, EditingRow>>(new Map())
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  const normalizedLang = (currentLanguage.code || "en").toLowerCase().split(/[-_]/)[0]
  const locale = normalizedLang === "ar" ? "ar-IQ" : normalizedLang === "ku" ? "ckb-IQ" : "en-US"

  const formatNumber = (value: number) => {
    try {
      return value.toLocaleString(locale)
    } catch {
      return value.toLocaleString()
    }
  }

  const formatDate = (value: string | number | Date) => {
    const date = value instanceof Date ? value : new Date(value)
    try {
      return date.toLocaleDateString(locale)
    } catch {
      return date.toLocaleDateString("en-GB")
    }
  }

  const formatUnit = (unit: string) => {
    const found = UNIT_OPTIONS.find((o) => o.value === unit)
    return found ? t(found.labelKey, currentLanguage.code) : unit
  }

  async function loadStoreData() {
    try {
      setIsLoading(true)
      const storeData = await getStore(storeId)
      const inventoryData = await getStoreInventory(storeId)
      setStore(storeData)
      setInventory(inventoryData)
    } catch {
      toast.error(t("errorLoadingData", currentLanguage.code))
    } finally {
      setIsLoading(false)
    }
  }

  async function loadExchangeRate() {
    try {
      const rate = await getCurrentExchangeRate()
      setExchangeRate(rate)
    } catch {
      // Silent fail
    }
  }

  const filteredInventory = inventory.filter((item) =>
    item.productcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.productname.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedInventory = filteredInventory.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const handleRefresh = () => {
    loadStoreData()
    setEditingRows(new Set())
    setEditedData(new Map())
    toast.success(t("dataRefreshed", currentLanguage.code))
  }

  const handleClearSearch = () => {
    setSearchQuery("")
  }

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

  const handleCancelEdit = (id: string) => {
    const newEditingRows = new Set(editingRows)
    newEditingRows.delete(id)
    setEditingRows(newEditingRows)
    
    const newEditedData = new Map(editedData)
    newEditedData.delete(id)
    setEditedData(newEditedData)
  }

  const handleSaveRow = async (id: string) => {
    const data = editedData.get(id)
    if (!data) return

    if (!data.productcode.trim() || !data.productname.trim()) {
      toast.error(t("enterMaterialCodeAndName", currentLanguage.code))
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
      
      toast.success(t("materialUpdatedSuccess", currentLanguage.code))
      handleCancelEdit(id)
      loadStoreData()
    } catch {
      toast.error(t("saveFailed", currentLanguage.code))
    }
  }

  const handleSaveNewRow = async () => {
    if (!newRowData.productcode.trim() || !newRowData.productname.trim()) {
      toast.error(t("enterMaterialCodeAndName", currentLanguage.code))
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
      
      toast.success(t("materialAddedSuccess", currentLanguage.code))
      resetNewRowData()
      loadStoreData()
    } catch {
      toast.error(t("addFailed", currentLanguage.code))
    }
  }

  const handlePriceKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSaveNewRow()
    }
  }

  const updateEditedField = (id: string, field: keyof EditingRow, value: unknown) => {
    const newEditedData = new Map(editedData)
    const currentData = newEditedData.get(id)
    if (currentData) {
      const updatedData = { ...currentData, [field]: value }
      
      if (field === "sellpriceiqd") {
        updatedData.sellpriceusd = Math.round((Number(value) / exchangeRate) * 100) / 100
      } else if (field === "sellpriceusd") {
        updatedData.sellpriceiqd = Math.round(Number(value) * exchangeRate)
      }
      
      newEditedData.set(id, updatedData)
      setEditedData(newEditedData)
    }
  }

  const updateNewRowField = (field: keyof EditingRow, value: unknown) => {
    const updatedData = { ...newRowData, [field]: value }
    
    if (field === "sellpriceiqd") {
      updatedData.sellpriceusd = Math.round((Number(value) / exchangeRate) * 100) / 100
    } else if (field === "sellpriceusd") {
      updatedData.sellpriceiqd = Math.round(Number(value) * exchangeRate)
    }
    
    setNewRowData(updatedData)
  }

  const handleDeleteClick = () => {
    if (selectedItems.length === 0) {
      toast.error(t("selectAtLeastOneItemToDelete", currentLanguage.code))
      return
    }
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (selectedItems.length === 0) return

    try {
      if (selectedItems.length === 1) {
        await deleteInventoryItem(selectedItems[0])
        toast.success(t("materialDeletedSuccess", currentLanguage.code))
      } else {
        await deleteInventoryItems(selectedItems)
        toast.success(
          `${t("deletedItemsPrefix", currentLanguage.code)} ${selectedItems.length} ${t("materials", currentLanguage.code)} ${t("successfullySuffix", currentLanguage.code)}`
        )
      }
      
      setDeleteConfirmOpen(false)
      setSelectedItems([])
      loadStoreData()
    } catch (error: unknown) {
      // معالجة أخطاء قيود المفاتيح الأجنبية
      if (error && typeof error === 'object' && 'message' in error) {
        const err = error as { message?: string; code?: string }
        if (err.message?.includes('foreign key') || err.code === '23503') {
          toast.error(t("cannotDeleteLinkedItem", currentLanguage.code))
        } else if (err.message) {
          toast.error(`${t("errorDeletingData", currentLanguage.code)}: ${err.message}`)
        } else {
          toast.error(t("errorDeletingData", currentLanguage.code))
        }
      } else {
        toast.error(t("errorDeletingData", currentLanguage.code))
      }
      
      setDeleteConfirmOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <Card className="p-6">
            <p className="text-center text-muted-foreground">{t("loading", currentLanguage.code)}</p>
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
            <p className="mb-4">{t("storeNotFound", currentLanguage.code)}</p>
            <Button onClick={() => router.push("/stores")}>
              {t("backToStores", currentLanguage.code)}
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        {}
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
          {}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              onClick={handleDeleteClick}
              variant="outline"
              className="gap-2"
              disabled={selectedItems.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              {t("deleteSelected", currentLanguage.code)} ({selectedItems.length})
            </Button>
          </div>

          {}
          <div className="flex gap-2 mb-6">
            <Button variant="outline" size="icon">
              <FileText className="h-4 w-4" />
            </Button>
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchMaterialPlaceholder", currentLanguage.code)}
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

          {}
          <div className="rounded-lg border overflow-hidden mb-6">
            <Table>
              <TableHeader>
                <TableRow style={{ background: 'linear-gradient(to right, var(--theme-surface), var(--theme-accent))', color: 'var(--theme-text)' }}>
                  <TableHead className="text-center w-[50px]" style={{ color: 'var(--theme-text)' }}>{t("rowNumber", currentLanguage.code)}</TableHead>
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
                  <TableHead className="text-right" style={{ color: 'var(--theme-text)' }}>{t("materialCode", currentLanguage.code)}</TableHead>
                  <TableHead className="text-right" style={{ color: 'var(--theme-text)' }}>{t("materialName", currentLanguage.code)}</TableHead>
                  <TableHead className="text-right" style={{ color: 'var(--theme-text)' }}>{t("quantity", currentLanguage.code)}</TableHead>
                  <TableHead className="text-right" style={{ color: 'var(--theme-text)' }}>{t("unit", currentLanguage.code)}</TableHead>
                  <TableHead className="text-right" style={{ color: 'var(--theme-text)' }}>{t("sellPrice", currentLanguage.code)} ({t("iqd", currentLanguage.code)})</TableHead>
                  <TableHead className="text-right" style={{ color: 'var(--theme-text)' }}>{t("sellPrice", currentLanguage.code)} ({t("usd", currentLanguage.code)})</TableHead>
                  <TableHead className="text-right" style={{ color: 'var(--theme-text)' }}>{t("addedDate", currentLanguage.code)}</TableHead>
                  <TableHead className="text-center w-[100px]" style={{ color: 'var(--theme-text)' }}>{t("actions", currentLanguage.code)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {}
                <TableRow className="sticky top-0 z-10" style={{ backgroundColor: 'var(--theme-surface)', opacity: 0.95, color: 'var(--theme-text)' }}>
                  <TableCell className="text-center" style={{ color: 'var(--theme-text)' }}>✨</TableCell>
                  <TableCell className="text-center" style={{ color: 'var(--theme-text)' }}>-</TableCell>
                  <TableCell className="text-right">
                    <Input
                      placeholder={t("materialCode", currentLanguage.code)}
                      value={newRowData.productcode}
                      onChange={(e) => updateNewRowField("productcode", e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      placeholder={t("materialName", currentLanguage.code)}
                      value={newRowData.productname}
                      onChange={(e) => updateNewRowField("productname", e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      placeholder={t("quantity", currentLanguage.code)}
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
                        <SelectValue placeholder={t("selectUnit", currentLanguage.code)} />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {t(unit.labelKey, currentLanguage.code)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      placeholder={t("priceIQDPlaceholder", currentLanguage.code)}
                      value={newRowData.sellpriceiqd || ""}
                      onChange={(e) => updateNewRowField("sellpriceiqd", parseFloat(e.target.value) || 0)}
                      onKeyPress={handlePriceKeyPress}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      placeholder={t("priceUSDPlaceholder", currentLanguage.code)}
                      value={newRowData.sellpriceusd || ""}
                      onChange={(e) => updateNewRowField("sellpriceusd", parseFloat(e.target.value) || 0)}
                      onKeyPress={handlePriceKeyPress}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {t("autoAdded", currentLanguage.code)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-green-600"
                      onClick={handleSaveNewRow}
                      title={t("saveEnterHint", currentLanguage.code)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>

                {}
                {paginatedInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? t("noSearchResults", currentLanguage.code) : t("noItemsInStore", currentLanguage.code)}
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
                        
                        {}
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
                        
                        {}
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
                        
                        {}
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
                        
                        {}
                        <TableCell className="text-right">
                          {isEditing && editData ? (
                            <Select
                              value={editData.unit}
                              onValueChange={(value) => updateEditedField(item.id, "unit", value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder={t("selectUnit", currentLanguage.code)} />
                              </SelectTrigger>
                              <SelectContent>
                                {UNIT_OPTIONS.map((unit) => (
                                  <SelectItem key={unit.value} value={unit.value}>
                                    {t(unit.labelKey, currentLanguage.code)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            formatUnit(item.unit ?? "")
                          )}
                        </TableCell>
                        
                        {}
                        <TableCell className="text-right">
                          {isEditing && editData ? (
                            <Input
                              type="number"
                              value={editData.sellpriceiqd}
                              onChange={(e) => updateEditedField(item.id, "sellpriceiqd", parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          ) : (
                            formatNumber(item.sellpriceiqd)
                          )}
                        </TableCell>
                        
                        {}
                        <TableCell className="text-right">
                          {isEditing && editData ? (
                            <Input
                              type="number"
                              value={editData.sellpriceusd}
                              onChange={(e) => updateEditedField(item.id, "sellpriceusd", parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          ) : (
                            formatNumber(item.sellpriceusd)
                          )}
                        </TableCell>
                        
                        {}
                        <TableCell className="text-right text-sm">
                          {formatDate(item.createdat)}
                        </TableCell>
                        
                        {}
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

          {}
          <div className="flex flex-col gap-4 pt-4 border-t">
            {}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  {t("first", currentLanguage.code)}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  {t("previous", currentLanguage.code)}
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
                  {t("next", currentLanguage.code)}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  {t("last", currentLanguage.code)}
                </Button>
              </div>
            )}
            
            {}
            <div className="flex justify-between items-center">
              <Button onClick={handleRefresh} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {t("refreshTable", currentLanguage.code)}
              </Button>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>
                  {t("showing", currentLanguage.code)} {startIndex + 1} - {Math.min(endIndex, filteredInventory.length)} {t("of", currentLanguage.code)} {filteredInventory.length}
                </span>
                <span className="font-semibold">
                  {t("exchangeRate", currentLanguage.code)}: {formatNumber(exchangeRate)} {t("iqd", currentLanguage.code)} = 1 {t("usd", currentLanguage.code)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmationTitle", currentLanguage.code)}</DialogTitle>
            <DialogDescription>
              {selectedItems.length === 1 
                ? t("confirmDeleteThisItem", currentLanguage.code)
                : `${t("confirmDeleteItemsPrefix", currentLanguage.code)} ${selectedItems.length} ${t("materials", currentLanguage.code)}؟`
              }
              {" "}{t("cannotBeUndone", currentLanguage.code)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              {t("cancel", currentLanguage.code)}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t("delete", currentLanguage.code)} {selectedItems.length > 1 && `(${selectedItems.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
