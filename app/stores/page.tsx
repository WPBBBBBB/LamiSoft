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
import { PermissionGuard } from "@/components/permission-guard"
import { Textarea } from "@/components/ui/textarea"
import { getStores, deleteStore, createStore, updateStore, type Store } from "@/lib/stores-operations"
import { logAction } from "@/lib/system-log-operations"
import { toast } from "sonner"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { useDebounce } from "@/lib/hooks"

export default function StoresPage() {
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [storeToDelete, setStoreToDelete] = useState<string | null>(null)
  const [addEditModalOpen, setAddEditModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

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
      } catch (error: unknown) {
      if ((error as { message?: string })?.message?.includes('CORS')) {
        toast.error("??? ?? ??????? ?????? ????????. ???? ?? ??????? CORS ?? Supabase")
      } else if ((error as { message?: string })?.message?.includes('NetworkError')) {
        toast.error("??? ?? ??????. ???? ?? ??????? ?????????")
      } else {
        toast.error("??? ??? ????? ????? ????????: " + ((error as { message?: string })?.message || "??? ??? ?????"))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const filteredStores = stores.filter((store) =>
    store.storename.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    store.location?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    store.storekeeper?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  )

  const handleRefresh = () => {
    loadStores()
    toast.success(t('dataRefreshed', currentLanguage.code))
  }

  const handleClearSearch = () => {
    setSearchQuery("")
  }

  const handleStoreDoubleClick = (store: Store) => {
    router.push(`/stores/${store.id}`)
  }

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

  const handleEditClick = () => {
    if (!selectedStore) {
      toast.error(t('selectStoreToEdit', currentLanguage.code))
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

  const handleSaveStore = async () => {
    if (!formData.storename.trim()) {
      toast.error(t('enterStoreNameRequired', currentLanguage.code))
      return
    }

    try {
      if (isEditMode && selectedStore) {
        await updateStore(selectedStore.id, formData)
        
        await logAction(
          "?????",
          `?? ????? ????: ${formData.storename}`,
          "???????",
          undefined,
          {
            storename: selectedStore.storename,
            location: selectedStore.location,
            storekeeper: selectedStore.storekeeper,
            isactive: selectedStore.isactive
          },
          {
            storename: formData.storename,
            location: formData.location,
            storekeeper: formData.storekeeper,
            isactive: formData.isactive
          }
        )
        
        toast.success(t('storeUpdatedSuccess', currentLanguage.code))
      } else {
        await createStore(formData)
        
        await logAction(
          "?????",
          `??? ????? ????? ???? ????: ${formData.storename}`,
          "???????",
          undefined,
          undefined,
          {
            storename: formData.storename,
            location: formData.location,
            storekeeper: formData.storekeeper,
            phonenumber: formData.phonenumber,
            isactive: formData.isactive
          }
        )
        
        toast.success(t('storeAddedSuccess', currentLanguage.code))
      }
      setAddEditModalOpen(false)
      loadStores()
      setSelectedStore(null)
    } catch (error) {
      toast.error(t('errorSavingData', currentLanguage.code))
    }
  }

  const handleDeleteClick = () => {
    if (!selectedStore) {
      toast.error(t('selectStoreToDelete', currentLanguage.code))
      return
    }
    setStoreToDelete(selectedStore.id)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!storeToDelete) return

    try {
      const storeToDeleteData = stores.find(s => s.id === storeToDelete)
      
      await deleteStore(storeToDelete)
      
      if (storeToDeleteData) {
        await logAction(
          "???",
          `?? ??? ????: ${storeToDeleteData.storename}`,
          "???????",
          undefined,
          {
            storename: storeToDeleteData.storename,
            location: storeToDeleteData.location,
            storekeeper: storeToDeleteData.storekeeper,
            phonenumber: storeToDeleteData.phonenumber,
            isactive: storeToDeleteData.isactive
          },
          undefined
        )
      }
      
      toast.success(t('storeDeletedSuccess', currentLanguage.code))
      setDeleteConfirmOpen(false)
      setStoreToDelete(null)
      setSelectedStore(null)
      loadStores()
    } catch (error) {
      toast.error(t('errorDeletingData', currentLanguage.code))
    }
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
                <ArrowRight className="h-5 w-5 theme-icon" />
              </Button>
              <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
                {t('stores', currentLanguage.code)}
              </h1>
            </div>
            <p className="text-muted-foreground mt-1">
              {t('customerManagement', currentLanguage.code).replace('???????', t('stores', currentLanguage.code))}
            </p>
          </div>
        </div>

        <Card className="p-6">
          {}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={handleAddClick} className="gap-2">
              <Plus className="h-4 w-4 theme-success" />
              {t('addStore', currentLanguage.code)}
            </Button>
            <Button
              onClick={handleEditClick}
              variant="outline"
              className="gap-2"
            >
              <Edit className="h-4 w-4 theme-info" />
              {t('edit', currentLanguage.code)}
            </Button>
            <Button
              onClick={handleDeleteClick}
              variant="outline"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4 theme-danger" />
              {t('delete', currentLanguage.code)}
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4 theme-info" />
              {t('refresh', currentLanguage.code)}
            </Button>
          </div>

          {}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 theme-icon" />
              <Input
                placeholder={t('searchStore', currentLanguage.code)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            {searchQuery && (
              <Button variant="outline" size="icon" onClick={handleClearSearch}>
                <X className="h-4 w-4 theme-danger" />
              </Button>
            )}
          </div>

          {}
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
                  {}
                  <div className="mb-3 flex justify-center">
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <Warehouse className="h-12 w-12 theme-info" />
                    </div>
                  </div>

                  {}
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--theme-text)" }}>
                    {store.storename}
                  </h3>

                  {}
                  {store.storekeeper && (
                    <div className="flex items-center justify-center gap-2 mb-1 text-sm text-muted-foreground">
                      <User className="h-4 w-4 theme-icon" />
                      <span>{store.storekeeper}</span>
                    </div>
                  )}

                  {}
                  {store.location && (
                    <div className="flex items-center justify-center gap-2 mb-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 theme-icon" />
                      <span>{store.location}</span>
                    </div>
                  )}

                  {}
                  {store.phonenumber && (
                    <div className="flex items-center justify-center gap-2 mb-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 theme-icon" />
                      <span>{store.phonenumber}</span>
                    </div>
                  )}

                  {}
                  <Badge variant={store.isactive ? "default" : "secondary"}>
                    {store.isactive ? t('active', currentLanguage.code) : t('inactive', currentLanguage.code)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {}
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            <span className="font-semibold">{t('totalStoresCount', currentLanguage.code)}:</span>{" "}
            <span style={{ color: "var(--theme-text)" }} className="font-bold">
              {filteredStores.length}
            </span>
          </div>
        </Card>

        {}
        <Dialog open={addEditModalOpen} onOpenChange={setAddEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? t('editStore', currentLanguage.code) : t('addNewStore', currentLanguage.code)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="storename">{t('storeName', currentLanguage.code)} {t('required', currentLanguage.code)}</Label>
              <Input
                id="storename"
                value={formData.storename}
                onChange={(e) =>
                  setFormData({ ...formData, storename: e.target.value })
                }
                placeholder={t('enterStoreName', currentLanguage.code)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t('location', currentLanguage.code)}</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder={t('enterLocation', currentLanguage.code)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storekeeper">{t('storekeeper', currentLanguage.code)}</Label>
              <Input
                id="storekeeper"
                value={formData.storekeeper}
                onChange={(e) =>
                  setFormData({ ...formData, storekeeper: e.target.value })
                }
                placeholder={t('enterStorekeeper', currentLanguage.code)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phonenumber">{t('phoneNumber', currentLanguage.code)}</Label>
              <Input
                id="phonenumber"
                value={formData.phonenumber}
                onChange={(e) =>
                  setFormData({ ...formData, phonenumber: e.target.value })
                }
                placeholder={t('enterPhoneNumber', currentLanguage.code)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">{t('details', currentLanguage.code)}</Label>
              <Textarea
                id="details"
                value={formData.details}
                onChange={(e) =>
                  setFormData({ ...formData, details: e.target.value })
                }
                placeholder={t('enterDetails', currentLanguage.code)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setAddEditModalOpen(false)}>
              {t('cancel', currentLanguage.code)}
            </Button>
            <Button onClick={handleSaveStore}>
              {isEditMode ? t('update', currentLanguage.code) : t('add', currentLanguage.code)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDelete', currentLanguage.code)}</DialogTitle>
            <DialogDescription>
              {t('deleteStoreConfirm', currentLanguage.code)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              {t('cancel', currentLanguage.code)}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t('delete', currentLanguage.code)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
