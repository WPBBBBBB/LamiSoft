"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  RefreshCw,
  Warehouse,
  MapPin,
  User,
  Phone,
  ArrowRight,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getStores, deleteStore, createStore, updateStore, type Store } from "@/lib/stores-operations"
import { toast } from "sonner"

export default function StoresPage() {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [storeToDelete, setStoreToDelete] = useState<string | null>(null)
  const [addEditModalOpen, setAddEditModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    storename: "",
    location: "",
    storekeeper: "",
    phonenumber: "",
    details: "",
    isactive: true,
  })

  useEffect(() => {
    loadStores()
  }, [])

  async function loadStores() {
    try {
      setIsLoading(true)
      const data = await getStores()
      setStores(data)
      console.log("تم تحميل المخازن:", data.length)
    } catch (error: any) {
      console.error("خطأ في تحميل المخازن:", error)
      if (error?.message?.includes('CORS')) {
        toast.error("خطأ في الاتصال بقاعدة البيانات. تحقق من إعدادات CORS في Supabase")
      } else if (error?.message?.includes('NetworkError')) {
        toast.error("خطأ في الشبكة. تحقق من الاتصال بالإنترنت")
      } else {
        toast.error("حدث خطأ أثناء تحميل البيانات: " + (error?.message || "خطأ غير معروف"))
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Filter stores based on search
  const filteredStores = stores.filter((store) =>
    store.storename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.storekeeper?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle refresh
  const handleRefresh = () => {
    loadStores()
    toast.success("تم تحديث البيانات")
  }

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery("")
  }

  // Handle double click to view details
  const handleStoreDoubleClick = (store: Store) => {
    router.push(`/stores/${store.id}`)
  }

  // Handle add new store
  const handleAddClick = () => {
    setIsEditMode(false)
    setFormData({
      storename: "",
      location: "",
      storekeeper: "",
      phonenumber: "",
      details: "",
      isactive: true,
    })
    setAddEditModalOpen(true)
  }

  // Handle edit store
  const handleEditClick = () => {
    if (!selectedStore) {
      toast.error("الرجاء اختيار مخزن للتعديل")
      return
    }
    setIsEditMode(true)
    setFormData({
      storename: selectedStore.storename,
      location: selectedStore.location || "",
      storekeeper: selectedStore.storekeeper || "",
      phonenumber: selectedStore.phonenumber || "",
      details: selectedStore.details || "",
      isactive: selectedStore.isactive,
    })
    setAddEditModalOpen(true)
  }

  // Handle save store
  const handleSaveStore = async () => {
    if (!formData.storename.trim()) {
      toast.error("الرجاء إدخال اسم المخزن")
      return
    }

    try {
      if (isEditMode && selectedStore) {
        await updateStore(selectedStore.id, formData)
        toast.success("تم تحديث المخزن بنجاح")
      } else {
        await createStore(formData)
        toast.success("تم إضافة المخزن بنجاح")
      }
      setAddEditModalOpen(false)
      loadStores()
      setSelectedStore(null)
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء حفظ البيانات")
    }
  }

  // Handle delete store
  const handleDeleteClick = () => {
    if (!selectedStore) {
      toast.error("الرجاء اختيار مخزن للحذف")
      return
    }
    setStoreToDelete(selectedStore.id)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!storeToDelete) return

    try {
      await deleteStore(storeToDelete)
      toast.success("تم حذف المخزن بنجاح")
      setDeleteConfirmOpen(false)
      setStoreToDelete(null)
      setSelectedStore(null)
      loadStores()
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

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Button
                onClick={() => router.push('/home')}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold" style={{ color: "var(--theme-text)" }}>
                المخازن
              </h1>
            </div>
            <p className="text-muted-foreground mt-1">
              إدارة المخازن والمستودعات
            </p>
          </div>
        </div>

        <Card className="p-6">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={handleAddClick} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة مخزن
            </Button>
            <Button
              onClick={handleEditClick}
              variant="outline"
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              تعديل
            </Button>
            <Button
              onClick={handleDeleteClick}
              variant="outline"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              حذف
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث
            </Button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن مخزن (الاسم، الموقع، أمين المخزن)..."
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
          </div>

          {/* Stores Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {filteredStores.map((store) => (
              <Card
                key={store.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedStore?.id === store.id
                    ? "ring-2 ring-primary"
                    : ""
                }`}
                onClick={() => setSelectedStore(store)}
                onDoubleClick={() => handleStoreDoubleClick(store)}
              >
                <CardContent className="p-4 text-center">
                  {/* Icon */}
                  <div className="mb-3 flex justify-center">
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <Warehouse className="h-12 w-12 text-primary" />
                    </div>
                  </div>

                  {/* Store Name */}
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--theme-text)" }}>
                    {store.storename}
                  </h3>

                  {/* Store Keeper */}
                  {store.storekeeper && (
                    <div className="flex items-center justify-center gap-2 mb-1 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{store.storekeeper}</span>
                    </div>
                  )}

                  {/* Location */}
                  {store.location && (
                    <div className="flex items-center justify-center gap-2 mb-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{store.location}</span>
                    </div>
                  )}

                  {/* Phone */}
                  {store.phonenumber && (
                    <div className="flex items-center justify-center gap-2 mb-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{store.phonenumber}</span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <Badge variant={store.isactive ? "default" : "secondary"}>
                    {store.isactive ? "نشط" : "غير نشط"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer Info */}
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            <span className="font-semibold">إجمالي المخازن:</span>{" "}
            <span style={{ color: "var(--theme-text)" }} className="font-bold">
              {filteredStores.length}
            </span>
          </div>
        </Card>

        {/* Add/Edit Modal */}
        <Dialog open={addEditModalOpen} onOpenChange={setAddEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "تعديل مخزن" : "إضافة مخزن جديد"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="storename">اسم المخزن *</Label>
              <Input
                id="storename"
                value={formData.storename}
                onChange={(e) =>
                  setFormData({ ...formData, storename: e.target.value })
                }
                placeholder="أدخل اسم المخزن"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">الموقع</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="أدخل موقع المخزن"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storekeeper">أمين المخزن</Label>
              <Input
                id="storekeeper"
                value={formData.storekeeper}
                onChange={(e) =>
                  setFormData({ ...formData, storekeeper: e.target.value })
                }
                placeholder="أدخل اسم أمين المخزن"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phonenumber">رقم الهاتف</Label>
              <Input
                id="phonenumber"
                value={formData.phonenumber}
                onChange={(e) =>
                  setFormData({ ...formData, phonenumber: e.target.value })
                }
                placeholder="أدخل رقم الهاتف"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">التفاصيل</Label>
              <Textarea
                id="details"
                value={formData.details}
                onChange={(e) =>
                  setFormData({ ...formData, details: e.target.value })
                }
                placeholder="أدخل تفاصيل إضافية"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setAddEditModalOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveStore}>
              {isEditMode ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذا المخزن؟ سيتم حذف جميع المواد المرتبطة به أيضاً.
              هذا الإجراء لا يمكن التراجع عنه.
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
    </div>
  )
}
