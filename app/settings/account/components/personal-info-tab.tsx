"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface PersonalInfoTabProps {
  userData: any
  onUpdate: () => void
}

export default function PersonalInfoTab({ userData, onUpdate }: PersonalInfoTabProps) {
  const [formData, setFormData] = useState({
    full_name: userData.full_name || '',
    age: userData.age || '',
    phone_number: userData.phone_number || '',
    address: userData.address || '',
    username: userData.username || '',
  })
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const hasChanges = () => {
    return (
      formData.full_name !== userData.full_name ||
      formData.age !== (userData.age || '') ||
      formData.phone_number !== (userData.phone_number || '') ||
      formData.address !== (userData.address || '') ||
      formData.username !== userData.username ||
      newPassword !== ''
    )
  }

  const handleUpdate = async () => {
    // Validation
    if (newPassword && newPassword !== passwordConfirm) {
      toast.error('كلمات المرور غير متطابقة')
      return
    }

    if (newPassword && newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    setIsUpdating(true)
    try {
      const updateData: any = {
        userId: userData.id,
        full_name: formData.full_name,
        age: formData.age ? parseInt(formData.age) : null,
        phone_number: formData.phone_number,
        address: formData.address,
        username: formData.username,
      }

      if (newPassword) {
        updateData.password = newPassword
      }

      const response = await fetch('/api/user/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) throw new Error('فشل التحديث')

      toast.success('تم تحديث المعلومات بنجاح')
      setNewPassword('')
      setPasswordConfirm('')
      onUpdate()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('حدث خطأ أثناء التحديث')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* الاسم الثلاثي */}
          <div className="space-y-2">
            <Label htmlFor="full_name">الاسم الثلاثي</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          {/* العمر */}
          <div className="space-y-2">
            <Label htmlFor="age">العمر</Label>
            <Input
              id="age"
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            />
          </div>

          {/* رقم الهاتف */}
          <div className="space-y-2">
            <Label htmlFor="phone_number">رقم الهاتف</Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            />
          </div>

          {/* العنوان */}
          <div className="space-y-2">
            <Label htmlFor="address">العنوان</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {/* اسم المستخدم */}
          <div className="space-y-2">
            <Label htmlFor="username">اسم المستخدم</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-bold mb-4">تغيير كلمة المرور</h3>
          
          {/* تحذير كلمة المرور المشفرة */}
          <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-300">
              كلمة المرور مشفرة بشكل آمن جداً، يمكنك فقط تغييرها بشكل مباشر إن أحببت
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* كلمة المرور الجديدة */}
            <div className="space-y-2">
              <Label htmlFor="new_password">كلمة المرور الجديدة</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="أدخل كلمة المرور الجديدة"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            {/* تأكيد كلمة المرور */}
            <div className="space-y-2">
              <Label htmlFor="password_confirm">تأكيد كلمة المرور الجديدة</Label>
              <Input
                id="password_confirm"
                type="password"
                placeholder="أعد إدخال كلمة المرور"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* زر التحديث */}
        <div className="flex justify-end">
          <Button
            onClick={handleUpdate}
            disabled={!hasChanges() || isUpdating}
          >
            {isUpdating ? 'جاري التحديث...' : 'تحديث المعلومات'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
