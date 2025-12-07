"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowRight,
  Package,
  AlertCircle,
  CheckCircle,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  getActiveStores, 
  searchInventoryInStore,
  transferInventory,
  type Store,
  type InventoryItem 
} from "@/lib/stores-operations"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface TransferRow {
  id: string
  productcode: string
  productname: string
  availableQuantity: number
  transferQuantity: number
  unit: string
  sellPriceIQD: number
  sellPriceUSD: number
}

export default function StoreTransferPage() {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [fromStoreId, setFromStoreId] = useState("")
  const [toStoreId, setToStoreId] = useState("")
  const [note, setNote] = useState("")
  const [transferRows, setTransferRows] = useState<TransferRow[]>([])
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([])
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([])
  const [searchOpen, setSearchOpen] = useState<string | null>(null)
  const [priceUpdateModalOpen, setPriceUpdateModalOpen] = useState(false)
  const [currentTransferIndex, setCurrentTransferIndex] = useState<number | null>(null)
  const [priceUpdateChoice, setPriceUpdateChoice] = useState<"price" | "quantity" | "both">("both")
  const [isTransferring, setIsTransferring] = useState(false)
  
  // New row for quick add - always visible
  const [newRow, setNewRow] = useState<TransferRow>({
    id: "new",
    productcode: "",
    productname: "",
    availableQuantity: 0,
    transferQuantity: 0,
    unit: "",
    sellPriceIQD: 0,
    sellPriceUSD: 0,
  })

  useEffect(() => {
    loadStores()
  }, [])

  // تحميل كل المواد من المخزن المصدر
  useEffect(() => {
    if (fromStoreId) {
      loadInventoryFromStore()
    } else {
      setAllInventory([])
      setSearchResults([])
    }
  }, [fromStoreId])

  async function loadInventoryFromStore() {
    if (!fromStoreId) return
    
    try {
      const { getStoreInventory } = await import("@/lib/stores-operations")
      const data = await getStoreInventory(fromStoreId)
      setAllInventory(data)
      setSearchResults(data) // عرض كل المواد افتراضياً
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء تحميل المواد")
    }
  }

  async function loadStores() {
    try {
      const data = await getActiveStores()
      setStores(data)
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء تحميل المخازن")
    }
  }

  // Add new row from newRow data
  const handleAddRow = () => {
    if (!newRow.productcode || !newRow.productname || newRow.transferQuantity <= 0) {
      toast.error("الرجاء إدخال بيانات المادة والكمية")
      return
    }
    
    setTransferRows([
      ...transferRows.filter(r => r.productcode || r.productname), // Remove empty rows
      {
        ...newRow,
        id: Date.now().toString(),
      },
    ])
    
    // Reset new row
    setNewRow({
      id: "new",
      productcode: "",
      productname: "",
      availableQuantity: 0,
      transferQuantity: 0,
      unit: "",
      sellPriceIQD: 0,
      sellPriceUSD: 0,
    })
    
    toast.success("تم إضافة المادة للقائمة")
  }

  // Remove row
  const handleRemoveRow = (id: string) => {
    setTransferRows(transferRows.filter((row) => row.id !== id))
  }

  // Handle new row product selection
  const handleNewRowSelectProduct = (item: InventoryItem) => {
    setNewRow({
      ...newRow,
      productcode: item.productcode,
      productname: item.productname,
      availableQuantity: item.quantity,
      unit: item.unit || "",
      sellPriceIQD: item.sellpriceiqd,
      sellPriceUSD: item.sellpriceusd,
    })
    setSearchOpen(null)
    setSearchResults([])
  }
  
  // Handle Enter key on new row quantity field
  const handleNewRowKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddRow()
    }
  }

  // Search for products
  const handleProductSearch = async (rowId: string, searchTerm: string) => {
    if (!fromStoreId) {
      toast.error("الرجاء اختيار المخزن المصدر أولاً")
      return
    }

    // إذا كان البحث فارغاً، عرض كل المواد
    if (!searchTerm || searchTerm.length === 0) {
      setSearchResults(allInventory)
      setSearchOpen(rowId)
      return
    }

    // البحث في المواد المحملة
    const filtered = allInventory.filter(item => 
      item.productcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productname.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setSearchResults(filtered)
    setSearchOpen(rowId)
  }

  // Select product from search
  const handleSelectProduct = (rowId: string, item: InventoryItem) => {
    setTransferRows(
      transferRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              productcode: item.productcode,
              productname: item.productname,
              availableQuantity: item.quantity,
              unit: item.unit || "",
              sellPriceIQD: item.sellpriceiqd,
              sellPriceUSD: item.sellpriceusd,
            }
          : row
      )
    )
    setSearchOpen(null)
    setSearchResults([])
  }

  // Update transfer quantity
  const handleQuantityChange = (rowId: string, quantity: number) => {
    setTransferRows(
      transferRows.map((row) =>
        row.id === rowId ? { ...row, transferQuantity: quantity } : row
      )
    )
  }

  // Start transfer process
  const handleStartTransfer = async () => {
    // Validation
    if (!fromStoreId || !toStoreId) {
      toast.error("الرجاء اختيار المخازن")
      return
    }

    if (fromStoreId === toStoreId) {
      toast.error("لا يمكن النقل من وإلى نفس المخزن")
      return
    }

    // Filter valid rows (non-empty)
    const validRows = transferRows.filter(
      (row) => row.productcode && row.transferQuantity > 0
    )

    if (validRows.length === 0) {
      toast.error("الرجاء إضافة مواد للقائمة أولاً")
      return
    }

    setIsTransferring(true)
    try {
      // Transfer each item
      for (const row of validRows) {
        // Check if price update is needed (this is simplified - in real scenario, check target store)
        await transferInventory(
          row.productcode,
          row.productname,
          row.transferQuantity,
          fromStoreId,
          toStoreId,
          note,
          true, // Update prices
          row.sellPriceIQD,
          row.sellPriceUSD
        )
      }

      toast.success(`تم نقل ${validRows.length} مادة بنجاح`)
      
      // Reset form
      setTransferRows([])
      setNewRow({
        id: "new",
        productcode: "",
        productname: "",
        availableQuantity: 0,
        transferQuantity: 0,
        unit: "",
        sellPriceIQD: 0,
        sellPriceUSD: 0,
      })
      setNote("")
      loadInventoryFromStore() // Reload inventory to get updated quantities
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء النقل")
    } finally {
      setIsTransferring(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
              النقل المخزني
            </h1>
            <p className="text-muted-foreground mt-1">
              نقل المواد بين المخازن
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/home")}
            title="رجوع"
            className="shrink-0"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Store Selection */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* From Store */}
            <div className="space-y-2">
              <Label htmlFor="fromStore">
                من المخزن
              </Label>
              <Select 
                value={fromStoreId} 
                onValueChange={(value) => {
                  setFromStoreId(value)
                  // إذا كان المخزن المختار هو نفسه المخزن الهدف، نفرغ المخزن الهدف
                  if (value === toStoreId) {
                    setToStoreId("")
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر المخزن المصدر" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem 
                      key={store.id} 
                      value={store.id}
                      disabled={store.id === toStoreId}
                    >
                      {store.storename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To Store */}
            <div className="space-y-2">
              <Label htmlFor="toStore">
                إلى المخزن
              </Label>
              <Select 
                value={toStoreId} 
                onValueChange={(value) => {
                  setToStoreId(value)
                  // إذا كان المخزن المختار هو نفسه المخزن المصدر، نفرغ المخزن المصدر
                  if (value === fromStoreId) {
                    setFromStoreId("")
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر المخزن الهدف" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem 
                      key={store.id} 
                      value={store.id}
                      disabled={store.id === fromStoreId}
                    >
                      {store.storename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6 space-y-2">
            <Label htmlFor="note">
              الملاحظات
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="أدخل تفاصيل أو ملاحظات حول عملية النقل..."
              rows={3}
              className="w-full"
            />
          </div>
        </Card>

        {/* Transfer Table */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">المواد المراد نقلها</h2>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ background: 'linear-gradient(to right, var(--theme-surface), var(--theme-accent))', color: 'var(--theme-text)' }}>
                  <TableHead className="text-center w-[50px]" style={{ color: 'var(--theme-text)' }}>#</TableHead>
                  <TableHead className="text-right min-w-[150px]" style={{ color: 'var(--theme-text)' }}>رمز المادة</TableHead>
                  <TableHead className="text-right min-w-[200px]" style={{ color: 'var(--theme-text)' }}>اسم المادة</TableHead>
                  <TableHead className="text-right min-w-[120px]" style={{ color: 'var(--theme-text)' }}>الكمية المتوفرة</TableHead>
                  <TableHead className="text-right min-w-[150px]" style={{ color: 'var(--theme-text)' }}>الكمية المراد نقلها</TableHead>
                  <TableHead className="text-center w-[50px]" style={{ color: 'var(--theme-text)' }}>إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* New Row - Always Visible */}
                <TableRow className="sticky top-0 z-10" style={{ backgroundColor: 'var(--theme-surface)', opacity: 0.95, color: 'var(--theme-text)' }}>
                  <TableCell className="text-center" style={{ color: 'var(--theme-text)' }}>✨</TableCell>
                  
                  {/* Product Code with Autocomplete */}
                  <TableCell>
                    <div className="relative">
                      <Input
                        value={newRow.productcode}
                        onFocus={() => {
                          handleProductSearch("new-code", newRow.productcode)
                        }}
                        onChange={(e) => {
                          const value = e.target.value
                          setNewRow({ ...newRow, productcode: value })
                          handleProductSearch("new-code", value)
                        }}
                        onBlur={() => {
                          setTimeout(() => setSearchOpen(null), 200)
                        }}
                        placeholder="رمز المادة"
                        autoFocus
                      />
                      {searchOpen === "new-code" && searchResults.length > 0 && (
                        <div className="absolute z-50 w-[300px] mt-1 bg-background border rounded-md shadow-lg max-h-[300px] overflow-auto">
                          {searchResults.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                handleNewRowSelectProduct(item)
                              }}
                              className="w-full flex flex-col items-start px-4 py-2 text-right hover:bg-accent cursor-pointer border-b last:border-b-0"
                            >
                              <span className="font-medium">{item.productcode}</span>
                              <span className="text-sm text-muted-foreground">
                                {item.productname}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Product Name with Autocomplete */}
                  <TableCell>
                    <div className="relative">
                      <Input
                        value={newRow.productname}
                        onFocus={() => {
                          handleProductSearch("new-name", newRow.productname)
                        }}
                        onChange={(e) => {
                          const value = e.target.value
                          setNewRow({ ...newRow, productname: value })
                          handleProductSearch("new-name", value)
                        }}
                        onBlur={() => {
                          setTimeout(() => setSearchOpen(null), 200)
                        }}
                        placeholder="اسم المادة"
                      />
                      {searchOpen === "new-name" && searchResults.length > 0 && (
                        <div className="absolute z-50 w-[300px] mt-1 bg-background border rounded-md shadow-lg max-h-[300px] overflow-auto">
                          {searchResults.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                handleNewRowSelectProduct(item)
                              }}
                              className="w-full flex flex-col items-start px-4 py-2 text-right hover:bg-accent cursor-pointer border-b last:border-b-0"
                            >
                              <span className="font-medium">{item.productname}</span>
                              <span className="text-sm text-muted-foreground">
                                {item.productcode}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Available Quantity */}
                  <TableCell className="text-right">
                    <span className="font-medium">
                      {newRow.availableQuantity > 0
                        ? `${newRow.availableQuantity} ${newRow.unit}`
                        : "-"}
                    </span>
                  </TableCell>

                  {/* Transfer Quantity */}
                  <TableCell>
                    <div className="relative">
                      <Input
                        type="number"
                        value={newRow.transferQuantity || ""}
                        onChange={(e) =>
                          setNewRow({
                            ...newRow,
                            transferQuantity: parseFloat(e.target.value) || 0,
                          })
                        }
                        onKeyPress={handleNewRowKeyPress}
                        placeholder="0"
                        className={
                          newRow.transferQuantity > newRow.availableQuantity
                            ? "border-orange-500"
                            : ""
                        }
                      />
                      {newRow.transferQuantity > newRow.availableQuantity && (
                        <div className="absolute -bottom-6 right-0 text-xs text-orange-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>الكمية أكبر من المتوفر</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleAddRow}
                      title="إضافة للقائمة (Enter)"
                    >
                      <Plus className="h-4 w-4 text-green-600" />
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Existing Rows */}
                {transferRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      لا توجد مواد في قائمة النقل. أضف مواد من الصف أعلاه.
                    </TableCell>
                  </TableRow>
                ) : (
                  transferRows.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-center">{index + 1}</TableCell>
                    
                    {/* Product Code with Autocomplete */}
                    <TableCell>
                      <div className="relative">
                        <Input
                          value={row.productcode}
                          onFocus={() => {
                            handleProductSearch(`code-${row.id}`, row.productcode)
                          }}
                          onChange={(e) => {
                            const value = e.target.value
                            setTransferRows(
                              transferRows.map((r) =>
                                r.id === row.id ? { ...r, productcode: value } : r
                              )
                            )
                            handleProductSearch(`code-${row.id}`, value)
                          }}
                          onBlur={() => {
                            setTimeout(() => setSearchOpen(null), 200)
                          }}
                          placeholder="رمز المادة"
                        />
                        {searchOpen === `code-${row.id}` && searchResults.length > 0 && (
                          <div className="absolute z-50 w-[300px] mt-1 bg-background border rounded-md shadow-lg max-h-[300px] overflow-auto">
                            {searchResults.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  handleSelectProduct(row.id, item)
                                }}
                                className="w-full flex flex-col items-start px-4 py-2 text-right hover:bg-accent cursor-pointer border-b last:border-b-0"
                              >
                                <span className="font-medium">{item.productcode}</span>
                                <span className="text-sm text-muted-foreground">
                                  {item.productname}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Product Name with Autocomplete */}
                    <TableCell>
                      <div className="relative">
                        <Input
                          value={row.productname}
                          onFocus={() => {
                            handleProductSearch(`name-${row.id}`, row.productname)
                          }}
                          onChange={(e) => {
                            const value = e.target.value
                            setTransferRows(
                              transferRows.map((r) =>
                                r.id === row.id ? { ...r, productname: value } : r
                              )
                            )
                            handleProductSearch(`name-${row.id}`, value)
                          }}
                          onBlur={() => {
                            setTimeout(() => setSearchOpen(null), 200)
                          }}
                          placeholder="اسم المادة"
                        />
                        {searchOpen === `name-${row.id}` && searchResults.length > 0 && (
                          <div className="absolute z-50 w-[300px] mt-1 bg-background border rounded-md shadow-lg max-h-[300px] overflow-auto">
                            {searchResults.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  handleSelectProduct(row.id, item)
                                }}
                                className="w-full flex flex-col items-start px-4 py-2 text-right hover:bg-accent cursor-pointer border-b last:border-b-0"
                              >
                                <span className="font-medium">{item.productname}</span>
                                <span className="text-sm text-muted-foreground">
                                  {item.productcode}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Available Quantity */}
                    <TableCell className="text-right">
                      <span className="font-medium">
                        {row.availableQuantity > 0
                          ? `${row.availableQuantity} ${row.unit}`
                          : "-"}
                      </span>
                    </TableCell>

                    {/* Transfer Quantity */}
                    <TableCell>
                      <div className="relative">
                        <Input
                          type="number"
                          value={row.transferQuantity || ""}
                          onChange={(e) =>
                            handleQuantityChange(row.id, parseFloat(e.target.value) || 0)
                          }
                          placeholder="0"
                          className={
                            row.transferQuantity > row.availableQuantity
                              ? "border-orange-500"
                              : ""
                          }
                        />
                        {row.transferQuantity > row.availableQuantity && (
                          <div className="absolute -bottom-6 right-0 text-xs text-orange-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>الكمية أكبر من المتوفر</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center">
                      {transferRows.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRow(row.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Start Transfer Button */}
          <div className="mt-6 pt-6 border-t">
            <Button
              onClick={handleStartTransfer}
              disabled={isTransferring}
              className="w-full h-14 text-lg gap-2"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  جاري النقل...
                </>
              ) : (
                <>
                  <CheckCircle className="h-6 w-6" />
                  بدء النقل
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Price Update Modal */}
      <Dialog open={priceUpdateModalOpen} onOpenChange={setPriceUpdateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديث البيانات</DialogTitle>
            <DialogDescription>
              المادة موجودة في المخزن الهدف بسعر مختلف. كيف تريد التحديث؟
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setPriceUpdateChoice("price")
                setPriceUpdateModalOpen(false)
              }}
            >
              تحديث السعر فقط
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setPriceUpdateChoice("quantity")
                setPriceUpdateModalOpen(false)
              }}
            >
              تحديث العدد فقط
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setPriceUpdateChoice("both")
                setPriceUpdateModalOpen(false)
              }}
            >
              تحديث الاثنين معاً
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceUpdateModalOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
