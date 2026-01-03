"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Pencil, Shield, Check, Phone, Calendar, MapPin, User } from "lucide-react"
import { useSettings } from "@/components/providers/settings-provider"
import { t } from "@/lib/translations"
import AvatarEditor from "./components/avatar-editor"
import PersonalInfoTab from "./components/personal-info-tab"
import OAuthLinksTab from "./components/oauth-links-tab"

interface UserData {
  id: string
  full_name: string
  phone_number: string | null
  address: string | null
  age: number | null
  permission_type: string
  username: string
  avatar_url: string | null
  google_id: string | null
  google_email: string | null
  microsoft_id: string | null
  microsoft_email: string | null
  github_id: string | null
  github_username: string | null
  permissions: {
    view_statistics: boolean
    view_reports: boolean
    view_services: boolean
    view_people: boolean
    view_notifications: boolean
    add_purchase: boolean
    view_stores: boolean
    view_store_transfer: boolean
  }
}

export default function AccountPage() {
  const { currentUser } = useAuth()
  const { currentLanguage } = useSettings()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAvatarEditor, setShowAvatarEditor] = useState(false)

  useEffect(() => {
    if (currentUser) {
      fetchUserData()
    }
  }, [currentUser])

  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/user/profile?userId=${currentUser?.id}`)
      const data = await response.json()
      setUserData(data)
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    if (userData) {
      setUserData({ ...userData, avatar_url: newAvatarUrl })
    }
  }

  if (isLoading || !userData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const connectedAccounts = [
    { provider: 'google', connected: !!userData.google_id, email: userData.google_email },
    { provider: 'microsoft', connected: !!userData.microsoft_id, email: userData.microsoft_email },
    { provider: 'github', connected: !!userData.github_id, username: userData.github_username },
  ].filter(acc => acc.connected)

  const permissionsList = [
    { key: 'view_statistics', label: 'عرض الإحصائيات' },
    { key: 'view_reports', label: 'عرض التقارير' },
    { key: 'view_services', label: 'عرض الخدمات' },
    { key: 'view_people', label: 'عرض الأشخاص' },
    { key: 'view_notifications', label: 'عرض الإشعارات' },
    { key: 'add_purchase', label: 'إضافة مشتريات' },
    { key: 'view_stores', label: 'عرض المخازن' },
    { key: 'view_store_transfer', label: 'عرض نقل المخزون' },
  ]

  return (
    <div className="p-6 h-full overflow-auto">
      <h1 className="text-3xl font-bold mb-6">الحساب</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6">
        {/* الجزء الأيمن - 30% */}
        <div className="space-y-4">
          {/* صورة المستخدم */}
          <Card className="p-0 relative overflow-hidden">
            <div className="relative w-full aspect-square">
              <div 
                className="w-full h-full rounded-[25px] overflow-hidden bg-muted flex items-center justify-center"
                style={{
                  backgroundImage: userData.avatar_url ? `url(${userData.avatar_url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {!userData.avatar_url && (
                  <span className="text-6xl font-bold text-muted-foreground">
                    {userData.full_name.charAt(0)}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowAvatarEditor(true)}
                className="absolute bottom-4 right-4 bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:scale-110 transition-transform z-10"
              >
                <Pencil className="h-5 w-5" />
              </button>
            </div>
          </Card>

          {/* معلومات المستخدم */}
          <Card className="p-6">
            <h3 className="font-bold text-xl mb-4">{userData.full_name}</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              {userData.phone_number && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{userData.phone_number}</span>
                </div>
              )}
              {userData.age && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{userData.age} سنة</span>
                </div>
              )}
              {userData.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{userData.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>@{userData.username}</span>
              </div>
            </div>
          </Card>

          {/* الحسابات المرتبطة */}
          {connectedAccounts.length > 0 && (
            <Card className="p-6">
              <h3 className="font-bold mb-4">الحسابات المرتبطة</h3>
              <div className="flex flex-wrap gap-2">
                {connectedAccounts.map((account) => (
                  <Badge key={account.provider} variant="secondary" className="text-xs flex items-center gap-1.5">
                    {account.provider === 'google' && (
                      <>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                      </>
                    )}
                    {account.provider === 'microsoft' && (
                      <>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 23 23">
                          <path fill="#f25022" d="M0 0h11v11H0z"/>
                          <path fill="#00a4ef" d="M12 0h11v11H12z"/>
                          <path fill="#7fba00" d="M0 12h11v11H0z"/>
                          <path fill="#ffb900" d="M12 12h11v11H12z"/>
                        </svg>
                        Microsoft
                      </>
                    )}
                    {account.provider === 'github' && (
                      <>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub
                      </>
                    )}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* الصلاحيات */}
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-bold">الصلاحيات والرتبة</h3>
            </div>
            <div className="mb-4">
              <Badge className="text-sm">{userData.permission_type}</Badge>
            </div>
            <div className="space-y-2">
              {userData.permission_type === 'مدير' ? (
                // إذا كان مدير - عرض جميع الصلاحيات
                permissionsList.map((perm) => (
                  <div key={perm.key} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-foreground">{perm.label}</span>
                  </div>
                ))
              ) : (
                // إذا كان موظف أو محاسب - عرض الصلاحيات المتاحة فقط
                permissionsList
                  .filter((perm) => userData.permissions[perm.key as keyof typeof userData.permissions])
                  .map((perm) => (
                    <div key={perm.key} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-foreground">{perm.label}</span>
                    </div>
                  ))
              )}
            </div>
          </Card>
        </div>

        {/* الجزء الأيسر - 70% */}
        <div>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="personal">المعلومات الشخصية</TabsTrigger>
              <TabsTrigger value="links">الروابط</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-6">
              <PersonalInfoTab userData={userData} onUpdate={fetchUserData} />
            </TabsContent>

            <TabsContent value="links" className="mt-6">
              <OAuthLinksTab userData={userData} onUpdate={fetchUserData} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* محرر الصورة */}
      {showAvatarEditor && (
        <AvatarEditor
          currentAvatar={userData.avatar_url}
          userId={userData.id}
          onClose={() => setShowAvatarEditor(false)}
          onUpdate={handleAvatarUpdate}
        />
      )}
    </div>
  )
}
