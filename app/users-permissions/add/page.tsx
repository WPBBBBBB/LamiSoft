"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { createUser } from "@/lib/users-operations"
import { toast } from "sonner"

export default function AddUserPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  // بيانات المستخدم الأساسية
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    address: "",
    age: "",
    username: "",
    password: "",
    permissionType: "" as "" | "مدير" | "محاسب" | "موظف",
  })

  // صلاحيات المحاسب والموظف
  const [permissions, setPermissions] = useState({
    viewStatistics: false,
    viewReports: false,
    viewServices: false,
    viewPeople: false,
    viewNotifications: false,
    addPurchase: false,
    viewStores: false,
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePermissionChange = (field: string, checked: boolean) => {
    setPermissions((prev) => ({ ...prev, [field]: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // التحقق من البيانات
    if (!formData.fullName.trim()) {
      toast.error("يرجى إدخال الاسم الكامل")
      return
    }
    if (!formData.username.trim()) {
      toast.error("يرجى إدخال اسم المستخدم")
      return
    }
    if (!formData.password.trim()) {
      toast.error("يرجى إدخال كلمة المرور")
      return
    }
    if (!formData.permissionType) {
      toast.error("يرجى اختيار نوع الصلاحية")
      return
    }

    setIsLoading(true)

    try {
      // تحضير بيانات المستخدم
      const userData = {
        full_name: formData.fullName,
        phone_number: formData.phoneNumber || undefined,
        address: formData.address || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        username: formData.username,
        password: formData.password,
        permission_type: formData.permissionType,
      }

      // تحضير الصلاحيات للمحاسب والموظف
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
        }
      }

      await createUser(userData, permissionsData)
      toast.success("تم إضافة المستخدم بنجاح")
      router.push("/users-permissions")
    } catch (error: any) {
      console.error(error)
      toast.error("حدث خطأ أثناء الإضافة: " + (error?.message || "خطأ غير معروف"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  // صلاحيات المحاسب
  const accountantPermissions = [
    { id: "viewStatistics", label: "عرض الإحصائيات" },
    { id: "viewReports", label: "عرض التقارير" },
    { id: "viewServices", label: "عرض الخدمات" },
    { id: "viewPeople", label: "عرض قائمة الأشخاص" },
  ]

  // صلاحيات إضافية للموظف
  const employeeAdditionalPermissions = [
    { id: "viewNotifications", label: "عرض الإشعارات في الصفحة الرئيسية" },
    { id: "addPurchase", label: "عرض زر إضافة شراء" },
    { id: "viewStores", label: "عرض المخازن" },
  ]

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with back button */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            title="رجوع"
            className="shrink-0"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
              إضافة مستخدم جديد
            </h1>
            <p className="text-muted-foreground mt-1">
              إضافة مستخدم جديد مع تحديد الصلاحيات
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="p-6">
            <div className="space-y-6">
              {/* معلومات أساسية */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">المعلومات الأساسية</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* الاسم الكامل */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName">
                      الاسم الكامل <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                      placeholder="أدخل الاسم الكامل"
                      required
                    />
                  </div>

                  {/* رقم الهاتف */}
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">رقم الهاتف</Label>
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                      placeholder="أدخل رقم الهاتف"
                      dir="ltr"
                    />
                  </div>

                  {/* العنوان */}
                  <div className="space-y-2">
                    <Label htmlFor="address">العنوان</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="أدخل العنوان"
                    />
                  </div>

                  {/* العمر */}
                  <div className="space-y-2">
                    <Label htmlFor="age">العمر</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => handleInputChange("age", e.target.value)}
                      placeholder="أدخل العمر"
                      min="18"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              {/* بيانات تسجيل الدخول */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">بيانات تسجيل الدخول</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* اسم المستخدم */}
                  <div className="space-y-2">
                    <Label htmlFor="username">
                      اسم المستخدم <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange("username", e.target.value)}
                      placeholder="أدخل اسم المستخدم"
                      required
                      dir="ltr"
                    />
                  </div>

                  {/* كلمة المرور */}
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      كلمة المرور <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      placeholder="أدخل كلمة المرور"
                      required
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* نوع الصلاحية */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">نوع الصلاحية والأذونات</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="permissionType">
                    نوع الصلاحية <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.permissionType}
                    onValueChange={(value: "مدير" | "محاسب" | "موظف") =>
                      handleInputChange("permissionType", value)
                    }
                  >
                    <SelectTrigger id="permissionType">
                      <SelectValue placeholder="اختر نوع الصلاحية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="مدير">مدير</SelectItem>
                      <SelectItem value="محاسب">محاسب</SelectItem>
                      <SelectItem value="موظف">موظف عادي</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {formData.permissionType === "مدير" && (
                    <p className="text-sm text-muted-foreground mt-2">
                      المدير لديه صلاحيات كاملة على جميع أجزاء النظام
                    </p>
                  )}
                </div>

                {/* صلاحيات المحاسب */}
                {formData.permissionType === "محاسب" && (
                  <div className="space-y-3 pt-4">
                    <Label className="text-base">اختر الأجزاء المسموح له بمشاهدتها:</Label>
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

                {/* صلاحيات الموظف */}
                {formData.permissionType === "موظف" && (
                  <div className="space-y-3 pt-4">
                    <Label className="text-base">اختر الأجزاء المسموح له بمشاهدتها:</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
                      {/* الصلاحيات المشتركة */}
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
                      
                      {/* الصلاحيات الإضافية للموظف */}
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

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  إلغاء
                </Button>
                <Button type="submit" disabled={isLoading} className="gap-2">
                  <Save className="h-4 w-4" />
                  {isLoading ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </div>
  )
}
