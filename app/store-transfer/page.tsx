"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowRight,
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
  getActiveStores, 
  transferInventory,
  type Store,
  type InventoryItem 
} from "@/lib/stores-operations"
import { logAction } from "@/lib/system-log-operations"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { PermissionGuard } from "@/components/permission-guard"

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
  const { currentLanguage } = useSettings()
  const [stores, setStores] = useState<Store[]>([])
  const [fromStoreId, setFromStoreId] = useState("")
  const [toStoreId, setToStoreId] = useState("")
  const [note, setNote] = useState("")
  const [transferRows, setTransferRows] = useState<TransferRow[]>([])
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([])
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([])
  const [searchOpen, setSearchOpen] = useState<string | null>(null)
  const [priceUpdateModalOpen, setPriceUpdateModalOpen] = useState(false)
  const [priceUpdateChoice, setPriceUpdateChoice] = useState<"price" | "quantity" | "both">("both")
  const [isTransferring, setIsTransferring] = useState(false)
  
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

  const loadStores = useCallback(async () => {
    try {
      const data = await getActiveStores()
      setStores(data)
    } catch (error) {
      toast.error(t('loadingStoresError', currentLanguage.code))
    }
  }, [currentLanguage.code])

  const loadInventoryFromStore = useCallback(async () => {
    if (!fromStoreId) return

    try {
      const { getStoreInventory } = await import("@/lib/stores-operations")
      const data = await getStoreInventory(fromStoreId)
      setAllInventory(data)
      setSearchResults(data)
    } catch (error) {
      toast.error(t('loadingMaterialsError', currentLanguage.code))
    }
  }, [fromStoreId, currentLanguage.code])

  useEffect(() => {
    loadStores()
  }, [loadStores])

  useEffect(() => {
    if (fromStoreId) {
      loadInventoryFromStore()
    } else {
      setAllInventory([])
      setSearchResults([])
    }
  }, [fromStoreId, loadInventoryFromStore])

  const handleAddRow = () => {
    if (!newRow.productcode || !newRow.productname || newRow.transferQuantity <= 0) {
      toast.error(t('enterMaterialData', currentLanguage.code))
      return
    }
    
    setTransferRows([
      ...transferRows.filter(r => r.productcode || r.productname),
      {
        ...newRow,
        id: Date.now().toString(),
      },
    ])
    
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
    
    toast.success(t('materialAddedToList', currentLanguage.code))
  }

  const handleRemoveRow = (id: string) => {
    setTransferRows(transferRows.filter((row) => row.id !== id))
  }

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
  
  const handleNewRowKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddRow()
    }
  }

  const handleProductSearch = async (rowId: string, searchTerm: string) => {
    if (!fromStoreId) {
      toast.error(t('selectSourceStoreFirst', currentLanguage.code))
      return
    }

    if (!searchTerm || searchTerm.length === 0) {
      setSearchResults(allInventory)
      setSearchOpen(rowId)
      return
    }

    const filtered = allInventory.filter(item => 
      item.productcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productname.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setSearchResults(filtered)
    setSearchOpen(rowId)
  }

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

  const handleQuantityChange = (rowId: string, quantity: number) => {
    setTransferRows(
      transferRows.map((row) =>
        row.id === rowId ? { ...row, transferQuantity: quantity } : row
      )
    )
  }

  const handleStartTransfer = async () => {
    if (!fromStoreId || !toStoreId) {
      toast.error(t('selectStoresFirst', currentLanguage.code))
      return
    }

    if (fromStoreId === toStoreId) {
      toast.error(t('cannotTransferToSameStore', currentLanguage.code))
      return
    }

    const validRows = transferRows.filter(
      (row) => row.productcode && row.transferQuantity > 0
    )

    if (validRows.length === 0) {
      toast.error(t('addMaterialsFirst', currentLanguage.code))
      return
    }

    setIsTransferring(true)
    try {
      const fromStore = stores.find(s => s.id === fromStoreId)
      const toStore = stores.find(s => s.id === toStoreId)
      
      for (const row of validRows) {
        const shouldUpdatePrice = priceUpdateChoice !== "quantity"

        await transferInventory(
          row.productcode,
          row.productname,
          row.transferQuantity,
          fromStoreId,
          toStoreId,
          note,
          shouldUpdatePrice,
          shouldUpdatePrice ? row.sellPriceIQD : undefined,
          shouldUpdatePrice ? row.sellPriceUSD : undefined
        )
        
        await logAction(
          "إضافة",
          `تمت عملية نقل مادة (${row.productname}) بكمية ${row.transferQuantity} ${row.unit} من المخزن: ${fromStore?.storename || 'غير معروف'} إلى المخزن: ${toStore?.storename || 'غير معروف'}`,
          "النقل المخزني",
          undefined,
          undefined,
          {
            productname: row.productname,
            quantity: row.transferQuantity,
            unit: row.unit,
            fromstore: fromStore?.storename,
            tostore: toStore?.storename
          }
        )
      }

      toast.success(`${validRows.length} ${t('materialsTransferredSuccess', currentLanguage.code).replace('{count}', '')}`.trim())
      
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
      loadInventoryFromStore()
    } catch (error) {
      toast.error(t('transferError', currentLanguage.code))
    } finally {
      setIsTransferring(false)
    }
  }

  return (
    <PermissionGuard requiredPermission="view_store_transfer">
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
              {t('storeTransferPage', currentLanguage.code)}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('transferMaterialsBetweenStores', currentLanguage.code)}
            </p>
          </div>
        </div>

        {}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {}
            <div className="space-y-2">
              <Label htmlFor="fromStore">
                {t('fromStore', currentLanguage.code)}
              </Label>
              <Select 
                value={fromStoreId} 
                onValueChange={(value) => {
                  setFromStoreId(value)
                  if (value === toStoreId) {
                    setToStoreId("")
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectSourceStore', currentLanguage.code)} />
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

            {}
            <div className="space-y-2">
              <Label htmlFor="toStore">
                {t('toStore', currentLanguage.code)}
              </Label>
              <Select 
                value={toStoreId} 
                onValueChange={(value) => {
                  setToStoreId(value)
                  if (value === fromStoreId) {
                    setFromStoreId("")
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectTargetStore', currentLanguage.code)} />
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

          {}
          <div className="mt-6 space-y-2">
            <Label htmlFor="note">
              {t('notes', currentLanguage.code)}
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('enterTransferDetails', currentLanguage.code)}
              rows={3}
              className="w-full"
            />
          </div>
        </Card>

        {}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{t('materialsToTransfer', currentLanguage.code)}</h2>
          </div>

          <div className="rounded-lg border h-[450px] overflow-x-auto overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ background: 'linear-gradient(to right, var(--theme-surface), var(--theme-accent))', color: 'var(--theme-text)' }}>
                  <TableHead className="text-center w-[50px]" style={{ color: 'var(--theme-text)' }}>#</TableHead>
                  <TableHead className="text-right min-w-[150px]" style={{ color: 'var(--theme-text)' }}>{t('materialCode', currentLanguage.code)}</TableHead>
                  <TableHead className="text-right min-w-[200px]" style={{ color: 'var(--theme-text)' }}>{t('materialName', currentLanguage.code)}</TableHead>
                  <TableHead className="text-right min-w-[120px]" style={{ color: 'var(--theme-text)' }}>{t('availableQuantity', currentLanguage.code)}</TableHead>
                  <TableHead className="text-right min-w-[150px]" style={{ color: 'var(--theme-text)' }}>{t('transferQuantity', currentLanguage.code)}</TableHead>
                  <TableHead className="text-center w-[50px]" style={{ color: 'var(--theme-text)' }}>{t('action', currentLanguage.code)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {}
                <TableRow className="sticky top-0 z-10" style={{ backgroundColor: 'var(--theme-surface)', opacity: 0.95, color: 'var(--theme-text)' }}>
                  <TableCell className="text-center" style={{ color: 'var(--theme-text)' }}>✨</TableCell>
                  
                  {}
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
                        placeholder={t('materialCode', currentLanguage.code)}
                        autoFocus
                      />
                      {searchOpen === "new-code" && searchResults.length > 0 && (
                        <div className="absolute z-50 w-full min-w-[360px] mt-1 bg-background border rounded-md shadow-lg max-h-[700px] overflow-auto">
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

                  {}
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
                        placeholder={t('materialName', currentLanguage.code)}
                      />
                      {searchOpen === "new-name" && searchResults.length > 0 && (
                        <div className="absolute z-50 w-full min-w-[360px] mt-1 bg-background border rounded-md shadow-lg max-h-[700px] overflow-auto">
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

                  {}
                  <TableCell className="text-right">
                    <span className="font-medium">
                      {newRow.availableQuantity > 0
                        ? `${newRow.availableQuantity} ${newRow.unit}`
                        : "-"}
                    </span>
                  </TableCell>

                  {}
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
                          <span>{t('quantityGreaterThanAvailable', currentLanguage.code)}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {}
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleAddRow}
                      title={`${t('addToList', currentLanguage.code)} (Enter)`}
                    >
                      <Plus className="h-4 w-4 theme-success" />
                    </Button>
                  </TableCell>
                </TableRow>

                {}
                {transferRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('noMaterialsInTransferList', currentLanguage.code)}
                    </TableCell>
                  </TableRow>
                ) : (
                  transferRows.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-center">{index + 1}</TableCell>
                    
                    {}
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
                          <div className="absolute z-50 w-full min-w-[360px] mt-1 bg-background border rounded-md shadow-lg max-h-[700px] overflow-auto">
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

                    {}
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
                          <div className="absolute z-50 w-full min-w-[360px] mt-1 bg-background border rounded-md shadow-lg max-h-[700px] overflow-auto">
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

                    {}
                    <TableCell className="text-right">
                      <span className="font-medium">
                        {row.availableQuantity > 0
                          ? `${row.availableQuantity} ${row.unit}`
                          : "-"}
                      </span>
                    </TableCell>

                    {}
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

                    {}
                    <TableCell className="text-center">
                      {transferRows.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRow(row.id)}
                        >
                          <Trash2 className="h-4 w-4 theme-danger" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {}
          <div className="mt-6 pt-6 border-t">
            <Button
              onClick={handleStartTransfer}
              disabled={isTransferring}
              className="w-full h-14 text-lg gap-2"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  {t('transferring', currentLanguage.code)}
                </>
              ) : (
                <>
                  <CheckCircle className="h-6 w-6" />
                  {t('startTransfer', currentLanguage.code)}
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {}
      <Dialog open={priceUpdateModalOpen} onOpenChange={setPriceUpdateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('updateData', currentLanguage.code)}</DialogTitle>
            <DialogDescription>
              {t('materialExistsWithDifferentPrice', currentLanguage.code)}
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
              {t('updatePriceOnly', currentLanguage.code)}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setPriceUpdateChoice("quantity")
                setPriceUpdateModalOpen(false)
              }}
            >
              {t('updateQuantityOnly', currentLanguage.code)}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setPriceUpdateChoice("both")
                setPriceUpdateModalOpen(false)
              }}
            >
              {t('updateBoth', currentLanguage.code)}
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceUpdateModalOpen(false)}>
              {t('cancel', currentLanguage.code)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGuard>
  )
}
