"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowRight, Save, X } from "lucide-react"
import { getUserWithPermissions, updateUser, checkUsernameExists, type User } from "@/lib/users-operations"
import { OAuthLinking } from "@/components/oauth/oauth-linking"
import { toast } from "sonner"
import { PermissionGuard } from "@/components/permission-guard"

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const lang = currentLanguage.code
  const { id } = use(params)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    address: "",
    age: "",
    username: "",
    password: "",
    permissionType: "" as "" | "مدير" | "محاسب" | "موظف",
  })

  const [permissions, setPermissions] = useState({
    viewStatistics: false,
    viewReports: false,
    viewServices: false,
    viewPeople: false,
    viewNotifications: false,
    addPurchase: false,
    viewStores: false,
    viewStoreTransfer: false,
  })

  async function loadUserData() {
    try {
      setIsLoading(true)
      const userData = await getUserWithPermissions(id)
      
      if (!userData) {
        toast.error(t('userNotFound', lang))
        router.push("/users-permissions")
        return
      }

      setCurrentUser(userData)
      setFormData({
        fullName: userData.full_name,
        phoneNumber: userData.phone_number || "",
        address: userData.address || "",
        age: userData.age ? userData.age.toString() : "",
        username: userData.username,
        password: userData.password,
        permissionType: userData.permission_type,
      })

      if (userData.permissions) {
        setPermissions({
          viewStatistics: userData.permissions.view_statistics || false,
          viewReports: userData.permissions.view_reports || false,
          viewServices: userData.permissions.view_services || false,
          viewPeople: userData.permissions.view_people || false,
          viewNotifications: userData.permissions.view_notifications || false,
          addPurchase: userData.permissions.add_purchase || false,
          viewStores: userData.permissions.view_stores || false,
          viewStoreTransfer: userData.permissions.view_store_transfer || false,
        })
      }
    } catch (error) {
      toast.error(t('errorLoadingData', lang))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUserData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleInputChange = (field: string, value: string) => {
    if (field === "phoneNumber") {
      const numbersOnly = value.replace(/[^0-9]/g, "")
      if (!numbersOnly.startsWith("07") && numbersOnly.length > 0) {
        value = "07" + numbersOnly.replace(/^07/, "")
      } else {
        value = numbersOnly
      }
      if (value.length > 11) {
        value = value.slice(0, 11)
      }
    }
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePermissionChange = (field: string, checked: boolean) => {
    setPermissions((prev) => ({ ...prev, [field]: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.fullName.trim()) {
      toast.error(t('pleaseEnterFullName', lang))
      return
    }
    if (!formData.username.trim()) {
      toast.error(t('pleaseEnterUsername', lang))
      return
    }
    if (!formData.password.trim()) {
      toast.error(t('pleaseEnterPassword', lang))
      return
    }
    if (!formData.permissionType) {
      toast.error(t('pleaseSelectPermissionType', lang))
      return
    }

    const usernameExists = await checkUsernameExists(formData.username, id)
    if (usernameExists) {
      toast.error(t('usernameAlreadyExists', lang))
      return
    }

    setIsSaving(true)

    try {
      const userData = {
        full_name: formData.fullName,
        phone_number: formData.phoneNumber || undefined,
        address: formData.address || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        username: formData.username,
        password: formData.password,
        permission_type: formData.permissionType,
      }

      let permissionsData = undefined
      if (formData.permissionType === "محاسب" || formData.permissionType === "موظف") {
        permissionsData = {
          view_statistics: permissions.viewStatistics,
          view_reports: permissions.viewReports,
          view_services: permissions.viewServices,
          view_people: permissions.viewPeople,
          view_notifications: formData.permissionType === "موظف" ? permissions.viewNotifications : false,
          add_purchase: formData.permissionType === "موظف" ? permissions.addPurchase : false,
          view_stores: formData.permissionType === "موظف" ? permissions.viewStores : false,
          view_store_transfer: formData.permissionType === "موظف" ? permissions.viewStoreTransfer : false,
        }
      }

      await updateUser(id, userData, permissionsData)
      toast.success(t('updateUserSuccess', lang))
      router.push("/users-permissions")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('unknownError', lang)
      toast.error(`${t('updateUserError', lang)}: ${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  const accountantPermissions = [
    { id: "viewStatistics", label: t('permViewStatistics', lang) },
    { id: "viewReports", label: t('permViewReports', lang) },
    { id: "viewServices", label: t('permViewServices', lang) },
    { id: "viewPeople", label: t('permViewPeople', lang) },
  ]

  const employeeAdditionalPermissions = [
    { id: "viewNotifications", label: t('permViewNotificationsHome', lang) },
    { id: "addPurchase", label: t('permShowAddPurchaseButton', lang) },
    { id: "viewStores", label: t('permViewStores', lang) },
    { id: "viewStoreTransfer", label: t('permViewStoreTransfer', lang) },
  ]

  if (isLoading) {
    return (
      <PermissionGuard requiredRole="مدير">
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <Card className="p-6">
            <p className="text-center text-muted-foreground">{t('loading', lang)}</p>
          </Card>
        </div>
      </div>
      </PermissionGuard>
    )
  }

  return (
    <PermissionGuard requiredRole="مدير">
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        {}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            title={t('back', lang)}
            className="shrink-0"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
              {t('editUserPageTitle', lang)}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('editUserPageDescription', lang)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="p-6">
            <div className="space-y-6">
              {}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">{t('basicInformation', lang)}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {}
                  <div className="space-y-2">
                    <Label htmlFor="fullName">
                      {t('fullName', lang)} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                      placeholder={t('enterFullName', lang)}
                      required
                    />
                  </div>

                  {}
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">{t('phoneNumber', lang)}</Label>
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                      placeholder="07xxxxxxxxx"
                      dir="ltr"
                      maxLength={11}
                    />
                  </div>

                  {}
                  <div className="space-y-2">
                    <Label htmlFor="address">{t('address', lang)}</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder={t('enterAddress', lang)}
                    />
                  </div>

                  {}
                  <div className="space-y-2">
                    <Label htmlFor="age">{t('age', lang)}</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => handleInputChange("age", e.target.value)}
                      placeholder={t('enterAge', lang)}
                      min="18"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              {}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">{t('loginData', lang)}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {}
                  <div className="space-y-2">
                    <Label htmlFor="username">
                      {t('username', lang)} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange("username", e.target.value)}
                      placeholder={t('enterUsername', lang)}
                      required
                      dir="ltr"
                    />
                  </div>

                  {}
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      {t('password', lang)} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      placeholder={t('enterPassword', lang)}
                      required
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">{t('permissionsAndRole', lang)}</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="permissionType">
                    {t('permissionType', lang)} <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.permissionType}
                    onValueChange={(value: "مدير" | "محاسب" | "موظف") =>
                      handleInputChange("permissionType", value)
                    }
                  >
                    <SelectTrigger id="permissionType">
                      <SelectValue placeholder={t('selectPermissionTypePlaceholder', lang)} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="مدير">{t('roleManager', lang)}</SelectItem>
                      <SelectItem value="محاسب">{t('roleAccountant', lang)}</SelectItem>
                      <SelectItem value="موظف">{t('roleEmployeeRegular', lang)}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {formData.permissionType === "مدير" && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('managerFullPermissionsHint', lang)}
                    </p>
                  )}
                </div>

                {}
                {formData.permissionType === "محاسب" && (
                  <div className="space-y-3 pt-4">
                    <Label className="text-base">{t('chooseAllowedSections', lang)}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
                      {accountantPermissions.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2 space-x-reverse">
                          <Checkbox
                            id={perm.id}
                            checked={permissions[perm.id as keyof typeof permissions]}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(perm.id, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={perm.id}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {perm.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {}
                {formData.permissionType === "موظف" && (
                  <div className="space-y-3 pt-4">
                    <Label className="text-base">{t('chooseAllowedSections', lang)}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
                      {}
                      {accountantPermissions.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2 space-x-reverse">
                          <Checkbox
                            id={perm.id}
                            checked={permissions[perm.id as keyof typeof permissions]}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(perm.id, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={perm.id}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {perm.label}
                          </Label>
                        </div>
                      ))}
                      
                      {}
                      {employeeAdditionalPermissions.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2 space-x-reverse">
                          <Checkbox
                            id={perm.id}
                            checked={permissions[perm.id as keyof typeof permissions]}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(perm.id, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={perm.id}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {perm.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {}
              {currentUser && (
                <OAuthLinking 
                  user={currentUser} 
                  onUpdate={loadUserData}
                />
              )}

              {}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  {t('cancel', lang)}
                </Button>
                <Button type="submit" disabled={isSaving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? t('saving', lang) : t('saveChanges', lang)}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </div>
    </PermissionGuard>
  )
}
