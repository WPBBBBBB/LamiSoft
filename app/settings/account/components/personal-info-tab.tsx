"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useSettings } from "@/components/providers/settings-provider"
import { t } from "@/lib/translations"

interface PersonalInfoUserData {
  id: string
  full_name: string
  age: number | null
  phone_number: string | null
  address: string | null
  username: string
}

interface PersonalInfoFormData {
  full_name: string
  age: string
  phone_number: string
  address: string
  username: string
}

interface PersonalInfoTabProps {
  userData: PersonalInfoUserData
  onUpdate: () => void
}

export default function PersonalInfoTab({ userData, onUpdate }: PersonalInfoTabProps) {
  const { currentLanguage } = useSettings()
  const lang = currentLanguage.code

  const [formData, setFormData] = useState<PersonalInfoFormData>({
    full_name: userData.full_name ?? "",
    age: userData.age !== null && userData.age !== undefined ? String(userData.age) : "",
    phone_number: userData.phone_number ?? "",
    address: userData.address ?? "",
    username: userData.username ?? "",
  })
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    setFormData({
      full_name: userData.full_name ?? "",
      age: userData.age !== null && userData.age !== undefined ? String(userData.age) : "",
      phone_number: userData.phone_number ?? "",
      address: userData.address ?? "",
      username: userData.username ?? "",
    })
  }, [userData])

  const hasChanges = () => {
    const baseline: PersonalInfoFormData = {
      full_name: userData.full_name ?? "",
      age: userData.age !== null && userData.age !== undefined ? String(userData.age) : "",
      phone_number: userData.phone_number ?? "",
      address: userData.address ?? "",
      username: userData.username ?? "",
    }

    return (
      formData.full_name !== baseline.full_name ||
      formData.age !== baseline.age ||
      formData.phone_number !== baseline.phone_number ||
      formData.address !== baseline.address ||
      formData.username !== baseline.username ||
      newPassword !== ''
    )
  }

  const handleUpdate = async () => {
    // Validation
    if (newPassword && newPassword !== passwordConfirm) {
      toast.error(t('passwordsDoNotMatch', lang))
      return
    }

    if (newPassword && newPassword.length < 6) {
      toast.error(t('passwordMinLength6', lang))
      return
    }

    setIsUpdating(true)
    try {
      const trimmedAge = formData.age.trim()
      const parsedAge = trimmedAge ? Number.parseInt(trimmedAge, 10) : NaN
      const ageValue = trimmedAge && Number.isFinite(parsedAge) ? parsedAge : null

      const updateData: {
        userId: string
        full_name: string
        age: number | null
        phone_number: string
        address: string
        username: string
        password?: string
      } = {
        userId: userData.id,
        full_name: formData.full_name,
        age: ageValue,
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

      if (!response.ok) throw new Error(t('updateFailed', lang))

      toast.success(t('profileUpdatedSuccessfully', lang))
      setNewPassword('')
      setPasswordConfirm('')
      onUpdate()
    } catch (error) {
      toast.error(t('updateError', lang))
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
            <Label htmlFor="full_name">{t('fullName', lang)}</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          {/* العمر */}
          <div className="space-y-2">
            <Label htmlFor="age">{t('age', lang)}</Label>
            <Input
              id="age"
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            />
          </div>

          {/* رقم الهاتف */}
          <div className="space-y-2">
            <Label htmlFor="phone_number">{t('phoneNumber', lang)}</Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            />
          </div>

          {/* العنوان */}
          <div className="space-y-2">
            <Label htmlFor="address">{t('address', lang)}</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {/* اسم المستخدم */}
          <div className="space-y-2">
            <Label htmlFor="username">{t('username', lang)}</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-bold mb-4">{t('changePassword', lang)}</h3>
          
          {/* تحذير كلمة المرور المشفرة */}
          <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-300">
              {t('passwordEncryptedNote', lang)}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* كلمة المرور الجديدة */}
            <div className="space-y-2">
              <Label htmlFor="new_password">{t('newPassword', lang)}</Label>
              <Input
                id="new_password"
                type="password"
                placeholder={t('enterNewPassword', lang)}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            {/* تأكيد كلمة المرور */}
            <div className="space-y-2">
              <Label htmlFor="password_confirm">{t('confirmNewPassword', lang)}</Label>
              <Input
                id="password_confirm"
                type="password"
                placeholder={t('reenterPassword', lang)}
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
            {isUpdating ? t('updating', lang) : t('updateInformation', lang)}
          </Button>
        </div>
      </div>
    </Card>
  )
}
