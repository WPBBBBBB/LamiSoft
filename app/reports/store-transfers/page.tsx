"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
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
import {
  ArrowRight,
  Search,
  Trash2,
  Loader2,
  Package,
} from "lucide-react"
import { toast } from "sonner"
import {
  getAllStoreTransfers,
  deleteStoreTransfer,
  type StoreTransfer,
} from "@/lib/stores-operations"
import { logAction } from "@/lib/system-log-operations"

export default function StoreTransfersManagementPage() {
  const router = useRouter()
  const [transfers, setTransfers] = useState<StoreTransfer[]>([])
  const [filteredTransfers, setFilteredTransfers] = useState<StoreTransfer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTransfers, setSelectedTransfers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteMultipleDialogOpen, setDeleteMultipleDialogOpen] = useState(false)
  const [transferToDelete, setTransferToDelete] = useState<StoreTransfer | null>(null)

  useEffect(() => {
    loadTransfers()
  }, [])

  const loadTransfers = async () => {
    try {
      setLoading(true)
      const data = await getAllStoreTransfers()
      setTransfers(data)
      setFilteredTransfers(data)
    } catch (error) {
      console.error("Error loading transfers:", error)
      toast.error("فشل في تحميل عمليات النقل")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!searchTerm) {
      setFilteredTransfers(transfers)
      return
    }

    const filtered = transfers.filter(
      (transfer) =>
        transfer.productname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.productcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.fromstorename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.tostorename.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredTransfers(filtered)
  }, [searchTerm, transfers])

  const toggleSelection = (id: string) => {
    setSelectedTransfers((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedTransfers.length === filteredTransfers.length) {
      setSelectedTransfers([])
    } else {
      setSelectedTransfers(filteredTransfers.map((t) => t.id))
    }
  }

  const handleDeleteTransfer = async () => {
    if (!transferToDelete) return

    try {
      const result = await deleteStoreTransfer(transferToDelete.id)
      
      if (result.success) {
        await logAction(
          "حذف",
          `تم حذف عملية نقل مخزني للمادة: ${transferToDelete.productname}`,
          "النقل المخزني",
          undefined,
          {
            productname: transferToDelete.productname,
            quantity: transferToDelete.quantity,
            fromstorename: transferToDelete.fromstorename,
            tostorename: transferToDelete.tostorename
          },
          undefined
        )

        toast.success("تم حذف عملية النقل بنجاح")
        loadTransfers()
      } else {
        toast.error(result.error || "فشل في حذف عملية النقل")
      }
    } catch (error) {
      console.error("Error deleting transfer:", error)
      toast.error("فشل في حذف عملية النقل")
    } finally {
      setDeleteDialogOpen(false)
      setTransferToDelete(null)
    }
  }

  const handleDeleteMultiple = async () => {
    if (selectedTransfers.length === 0) return

    try {
      let successCount = 0
      const transfersToDelete = transfers.filter(t => selectedTransfers.includes(t.id))

      for (const transfer of transfersToDelete) {
        const result = await deleteStoreTransfer(transfer.id)
        
        if (result.success) {
          successCount++
          
          await logAction(
            "حذف",
            `تم حذف عملية نقل مخزني للمادة: ${transfer.productname}`,
            "النقل المخزني",
            undefined,
            {
              productname: transfer.productname,
              quantity: transfer.quantity,
              fromstorename: transfer.fromstorename,
              tostorename: transfer.tostorename
            },
            undefined
          )
        }
      }

      toast.success(`تم حذف ${successCount} عملية نقل بنجاح`)
      setSelectedTransfers([])
      loadTransfers()
    } catch (error) {
      console.error("Error deleting transfers:", error)
      toast.error("فشل في حذف بعض عمليات النقل")
    } finally {
      setDeleteMultipleDialogOpen(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        {}
        <div className="mb-6 flex items-start justify-between gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/reports")}
            title="رجوع"
            className="shrink-0"
          >
            <ArrowRight className="h-5 w-5 theme-icon" />
          </Button>
          <div className="flex-1 text-right">
            <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
              إدارة النقل المخزني
            </h1>
            <p className="text-muted-foreground mt-1">
              عرض وإدارة جميع عمليات النقل بين المخازن
            </p>
          </div>
        </div>

        {}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث عن مادة أو مخزن..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            
            {selectedTransfers.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setDeleteMultipleDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 ml-2" />
                حذف المحدد ({selectedTransfers.length})
              </Button>
            )}
          </div>
        </Card>

        {}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchTerm ? "لا توجد نتائج للبحث" : "لا توجد عمليات نقل"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center w-[50px]">
                      <Checkbox
                        checked={
                          selectedTransfers.length === filteredTransfers.length &&
                          filteredTransfers.length > 0
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">كود المادة</TableHead>
                    <TableHead className="text-right">اسم المادة</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right">من مخزن</TableHead>
                    <TableHead className="text-right">إلى مخزن</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedTransfers.includes(transfer.id)}
                          onCheckedChange={() => toggleSelection(transfer.id)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {new Date(transfer.transferdate).toLocaleDateString('ar-IQ')}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {transfer.productcode}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {transfer.productname}
                      </TableCell>
                      <TableCell className="text-right">
                        {transfer.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">
                          {transfer.fromstorename}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                          {transfer.tostorename}
                        </span>
                      </TableCell>
                      <TableCell className="text-right max-w-[200px] truncate">
                        {transfer.note || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setTransferToDelete(transfer)
                            setDeleteDialogOpen(true)
                          }}
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد الحذف</DialogTitle>
              <DialogDescription asChild>
                <div>
                  <span className="block">
                    هل أنت متأكد من حذف عملية النقل هذه؟
                  </span>
                  {transferToDelete && (
                    <div className="mt-4 p-3 bg-muted rounded-md text-right">
                      <p className="font-semibold">{transferToDelete.productname}</p>
                      <p className="text-sm text-muted-foreground">
                        من: {transferToDelete.fromstorename} → إلى: {transferToDelete.tostorename}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        الكمية: {transferToDelete.quantity}
                      </p>
                    </div>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                إلغاء
              </Button>
              <Button variant="destructive" onClick={handleDeleteTransfer}>
                حذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={deleteMultipleDialogOpen} onOpenChange={setDeleteMultipleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد حذف متعدد</DialogTitle>
              <DialogDescription asChild>
                <div>
                  <span className="block">
                    هل أنت متأكد من حذف {selectedTransfers.length} عملية نقل؟
                  </span>
                  <span className="block mt-2 text-destructive font-semibold">
                    لا يمكن التراجع عن هذه العملية!
                  </span>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteMultipleDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button variant="destructive" onClick={handleDeleteMultiple}>
                حذف الكل
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
