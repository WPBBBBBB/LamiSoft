"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Plus,
  Trash2,
  Search,
  X,
  RefreshCw,
  ArrowRight,
  Save,
  Check,
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
import { logAction } from "@/lib/system-log-operations"
import { toast } from "sonner"
import { use } from "react"

type NewRow = {
  productcode: string
  productname: string
  quantity: number
  unit: string
  sellpriceiqd: number
  sellpriceusd: number
  minstocklevel: number
  refnumber: string
  isNew: true
}

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
  
  const [newRow, setNewRow] = useState<NewRow | null>(null)
  
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set())
  const [editedData, setEditedData] = useState<Map<string, Partial<InventoryItem>>>(new Map())

  useEffect(() => {
    loadStoreData()
  }, [storeId])

  async function loadStoreData() {
    try {
      setIsLoading(true)
      const storeData = await getStore(storeId)
      const inventoryData = await getStoreInventory(storeId)
      setStore(storeData)
      setInventory(inventoryData)
    } catch (error) {
      toast.error("حدث خطأ أثناء تحميل البيانات")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredInventory = inventory.filter((item) =>
    item.productcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.productname.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddNewRow = () => {
    if (newRow) {
      toast.warning("يوجد صف قيد الإضافة بالفعل")
      return
    }
    setNewRow({
      productcode: "",
      productname: "",
      quantity: 0,
      unit: "",
      sellpriceiqd: 0,
      sellpriceusd: 0,
      minstocklevel: 0,
      refnumber: "",
      isNew: true,
    })
  }

  const handleSaveNewRow = async () => {
    if (!newRow) return

    if (!newRow.productcode.trim() || !newRow.productname.trim()) {
      toast.error("الرجاء إدخال رمز المادة واسم المادة")
      return
    }

    const exists = inventory.find(
      (item) => item.productcode.toLowerCase() === newRow.productcode.toLowerCase()
    )

    if (exists) {
      toast.error("رمز المادة موجود مسبقاً. سيتم تحديث البيانات.")
      try {
        await updateInventoryItem(exists.id, {
          productname: newRow.productname,
          quantity: newRow.quantity,
          unit: newRow.unit,
          sellpriceiqd: newRow.sellpriceiqd,
          sellpriceusd: newRow.sellpriceusd,
          minstocklevel: newRow.minstocklevel,
          refnumber: newRow.refnumber,
        })
        toast.success("تم تحديث المادة بنجاح")
        setNewRow(null)
        loadStoreData()
      } catch (error) {
        toast.error("حدث خطأ أثناء التحديث")
      }
      return
    }

    try {
      await createInventoryItem({
        ...newRow,
        storeid: storeId,
        reorderquantity: 0,
        monitorenabled: false,
        lowstocknotify: false,
      })
      
      await logAction(
        "إضافة",
        `تمت إضافة المادة: ${newRow.productname} إلى المخزن: ${store?.storename || 'غير معروف'}`,
        "المخزون",
        undefined,
        undefined,
        {
          productcode: newRow.productcode,
          productname: newRow.productname,
          quantity: newRow.quantity,
          unit: newRow.unit,
          storename: store?.storename
        }
      )
      
      toast.success("تم إضافة المادة بنجاح")
      setNewRow(null)
      loadStoreData()
    } catch (error) {
      toast.error("حدث خطأ أثناء الإضافة")
    }
  }

  const handleCancelNewRow = () => {
    setNewRow(null)
  }

  const handleEditRow = (itemId: string) => {
    const item = inventory.find((i) => i.id === itemId)
    if (!item) return

    const newEditingRows = new Set(editingRows)
    newEditingRows.add(itemId)
    setEditingRows(newEditingRows)

    const newEditedData = new Map(editedData)
    newEditedData.set(itemId, { ...item })
    setEditedData(newEditedData)
  }

  const handleSaveEditedRow = async (itemId: string) => {
    const edited = editedData.get(itemId)
    if (!edited) return

    try {
      const oldItem = inventory.find(i => i.id === itemId)
      
      await updateInventoryItem(itemId, edited)
      
      if (oldItem) {
        await logAction(
          "تعديل",
          `تم تعديل المادة: ${edited.productname || oldItem.productname} في المخزن: ${store?.storename || 'غير معروف'}`,
          "المخزون",
          undefined,
          {
            productcode: oldItem.productcode,
            productname: oldItem.productname,
            quantity: oldItem.quantity,
            unit: oldItem.unit,
            sellpriceiqd: oldItem.sellpriceiqd,
            sellpriceusd: oldItem.sellpriceusd
          },
          {
            productcode: edited.productcode || oldItem.productcode,
            productname: edited.productname || oldItem.productname,
            quantity: edited.quantity ?? oldItem.quantity,
            unit: edited.unit || oldItem.unit,
            sellpriceiqd: edited.sellpriceiqd ?? oldItem.sellpriceiqd,
            sellpriceusd: edited.sellpriceusd ?? oldItem.sellpriceusd
          }
        )
      }
      
      toast.success("تم تحديث المادة بنجاح")
      
      const newEditingRows = new Set(editingRows)
      newEditingRows.delete(itemId)
      setEditingRows(newEditingRows)
      
      const newEditedData = new Map(editedData)
      newEditedData.delete(itemId)
      setEditedData(newEditedData)
      
      loadStoreData()
    } catch (error) {
      toast.error("حدث خطأ أثناء التحديث")
    }
  }

  const handleCancelEditRow = (itemId: string) => {
    const newEditingRows = new Set(editingRows)
    newEditingRows.delete(itemId)
    setEditingRows(newEditingRows)
    
    const newEditedData = new Map(editedData)
    newEditedData.delete(itemId)
    setEditedData(newEditedData)
  }

  const handleDeleteClick = () => {
    if (selectedItems.length === 0) {
      toast.error("الرجاء اختيار مادة للحذف")
      return
    }
    if (selectedItems.length === 1) {
      setItemToDelete(selectedItems[0])
      setDeleteConfirmOpen(true)
    } else {
      handleDeleteSelected()
    }
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    try {
      const itemToDeleteData = inventory.find(i => i.id === itemToDelete)
      
      await deleteInventoryItem(itemToDelete)
      
      if (itemToDeleteData) {
        await logAction(
          "حذف",
          `تم حذف المادة: ${itemToDeleteData.productname} من المخزن: ${store?.storename || 'غير معروف'}`,
          "المخزون",
          undefined,
          {
            productcode: itemToDeleteData.productcode,
            productname: itemToDeleteData.productname,
            quantity: itemToDeleteData.quantity,
            unit: itemToDeleteData.unit,
            storename: store?.storename
          },
          undefined
        )
      }
      
      toast.success("تم حذف المادة بنجاح")
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
      setSelectedItems([])
      loadStoreData()
    } catch (error) {
      toast.error("حدث خطأ أثناء الحذف")
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) {
      toast.error("الرجاء اختيار مواد للحذف")
      return
    }

    try {
      const itemsToDelete = inventory.filter(i => selectedItems.includes(i.id))
      
      await deleteInventoryItems(selectedItems)
      
      for (const item of itemsToDelete) {
        await logAction(
          "حذف",
          `تم حذف المادة: ${item.productname} من المخزن: ${store?.storename || 'غير معروف'}`,
          "المخزون",
          undefined,
          {
            productcode: item.productcode,
            productname: item.productname,
            quantity: item.quantity,
            unit: item.unit,
            storename: store?.storename
          },
          undefined
        )
      }
      
      toast.success(`تم حذف ${selectedItems.length} مادة بنجاح`)
      setSelectedItems([])
      loadStoreData()
    } catch (error) {
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
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold" style={{ color: "var(--theme-text)" }}>
              {store.storename}
            </h1>
            <p className="text-muted-foreground mt-1">
              {store.location && `${store.location} • `}
              {store.storekeeper && `أمين المخزن: ${store.storekeeper}`}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/stores")}
            title="رجوع"
            className="shrink-0"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        <Card className="p-6">
          {}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={handleAddNewRow} className="gap-2" disabled={!!newRow}>
              <Plus className="h-4 w-4" />
              إضافة مادة
            </Button>
            <Button
              onClick={handleDeleteClick}
              variant="outline"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              حذف
            </Button>
          </div>

          {}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن مادة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            {searchQuery && (
              <Button variant="outline" size="icon" onClick={() => setSearchQuery("")}>
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={loadStoreData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {}
          <div className="rounded-lg border overflow-hidden mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-[50px]">#</TableHead>
                  <TableHead className="text-center w-[50px]">
                    <Checkbox
                      checked={selectedItems.length === filteredInventory.length && filteredInventory.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems(filteredInventory.map((item) => item.id))
                        } else {
                          setSelectedItems([])
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="text-right">رمز المادة</TableHead>
                  <TableHead className="text-right">اسم المادة</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">الوحدة</TableHead>
                  <TableHead className="text-right">سعر البيع (IQD)</TableHead>
                  <TableHead className="text-right">سعر البيع (USD)</TableHead>
                  <TableHead className="text-right">الحد الأدنى</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {}
                {newRow && (
                  <TableRow className="bg-blue-50 dark:bg-blue-950">
                    <TableCell className="text-center">جديد</TableCell>
                    <TableCell></TableCell>
                    <TableCell>
                      <Input
                        value={newRow.productcode}
                        onChange={(e) => setNewRow({ ...newRow, productcode: e.target.value })}
                        placeholder="رمز المادة"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={newRow.productname}
                        onChange={(e) => setNewRow({ ...newRow, productname: e.target.value })}
                        placeholder="اسم المادة"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={newRow.quantity}
                        onChange={(e) => setNewRow({ ...newRow, quantity: parseFloat(e.target.value) || 0 })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={newRow.unit}
                        onChange={(e) => setNewRow({ ...newRow, unit: e.target.value })}
                        placeholder="الوحدة"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={newRow.sellpriceiqd}
                        onChange={(e) => setNewRow({ ...newRow, sellpriceiqd: parseFloat(e.target.value) || 0 })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={newRow.sellpriceusd}
                        onChange={(e) => setNewRow({ ...newRow, sellpriceusd: parseFloat(e.target.value) || 0 })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={newRow.minstocklevel}
                        onChange={(e) => setNewRow({ ...newRow, minstocklevel: parseFloat(e.target.value) || 0 })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" onClick={handleSaveNewRow} className="h-8">
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelNewRow} className="h-8">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {}
                {filteredInventory.map((item, index) => {
                  const isEditing = editingRows.has(item.id)
                  const editedItem = editedData.get(item.id) || item

                  return (
                    <TableRow
                      key={item.id}
                      className={selectedItems.includes(item.id) ? "ring-2 ring-primary" : ""}
                      onDoubleClick={() => !isEditing && handleEditRow(item.id)}
                    >
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems([...selectedItems, item.id])
                            } else {
                              setSelectedItems(selectedItems.filter((id) => id !== item.id))
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editedItem.productcode}
                            onChange={(e) => {
                              const newData = new Map(editedData)
                              newData.set(item.id, { ...editedItem, productcode: e.target.value })
                              setEditedData(newData)
                            }}
                            className="h-8"
                          />
                        ) : (
                          item.productcode
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editedItem.productname}
                            onChange={(e) => {
                              const newData = new Map(editedData)
                              newData.set(item.id, { ...editedItem, productname: e.target.value })
                              setEditedData(newData)
                            }}
                            className="h-8"
                          />
                        ) : (
                          item.productname
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editedItem.quantity}
                            onChange={(e) => {
                              const newData = new Map(editedData)
                              newData.set(item.id, { ...editedItem, quantity: parseFloat(e.target.value) || 0 })
                              setEditedData(newData)
                            }}
                            className="h-8"
                          />
                        ) : (
                          item.quantity
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editedItem.unit || ""}
                            onChange={(e) => {
                              const newData = new Map(editedData)
                              newData.set(item.id, { ...editedItem, unit: e.target.value })
                              setEditedData(newData)
                            }}
                            className="h-8"
                          />
                        ) : (
                          item.unit
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editedItem.sellpriceiqd}
                            onChange={(e) => {
                              const newData = new Map(editedData)
                              newData.set(item.id, { ...editedItem, sellpriceiqd: parseFloat(e.target.value) || 0 })
                              setEditedData(newData)
                            }}
                            className="h-8"
                          />
                        ) : (
                          item.sellpriceiqd?.toLocaleString()
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editedItem.sellpriceusd}
                            onChange={(e) => {
                              const newData = new Map(editedData)
                              newData.set(item.id, { ...editedItem, sellpriceusd: parseFloat(e.target.value) || 0 })
                              setEditedData(newData)
                            }}
                            className="h-8"
                          />
                        ) : (
                          item.sellpriceusd?.toFixed(2)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editedItem.minstocklevel}
                            onChange={(e) => {
                              const newData = new Map(editedData)
                              newData.set(item.id, { ...editedItem, minstocklevel: parseFloat(e.target.value) || 0 })
                              setEditedData(newData)
                            }}
                            className="h-8"
                          />
                        ) : (
                          item.minstocklevel
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <div className="flex gap-2 justify-center">
                            <Button size="sm" onClick={() => handleSaveEditedRow(item.id)} className="h-8">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleCancelEditRow(item.id)} className="h-8">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">دبل كليك للتعديل</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {}
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            <span className="font-semibold">إجمالي المواد:</span>{" "}
            <span style={{ color: "var(--theme-text)" }} className="font-bold">
              {filteredInventory.length}
            </span>
          </div>
        </Card>
      </div>

      {}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذه المادة؟ هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
