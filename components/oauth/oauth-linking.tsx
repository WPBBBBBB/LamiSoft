"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { linkOAuthAccount, unlinkOAuthAccount, type OAuthProvider, type User } from "@/lib/users-operations"
import { toast } from "sonner"
import { Link as LinkIcon, Unlink } from "lucide-react"

interface OAuthLinkingProps {
  user: User
  onUpdate: () => void
}

export function OAuthLinking({ user, onUpdate }: OAuthLinkingProps) {
  const [showOAuthOptions, setShowOAuthOptions] = useState(false)
  const [isLinking, setIsLinking] = useState<OAuthProvider | null>(null)
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false)
  const [providerToUnlink, setProviderToUnlink] = useState<OAuthProvider | null>(null)

  const isGoogleLinked = !!user.google_id
  const isMicrosoftLinked = !!user.microsoft_id
  const isGithubLinked = !!user.github_id

  const handleLinkAccount = async (provider: OAuthProvider) => {
    setIsLinking(provider)

    try {
      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      let authUrl = ''
      
      switch (provider) {
        case 'google':
          authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_GOOGLE_CLIENT_ID&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/callback/google')}&response_type=code&scope=openid%20email%20profile&state=${user.id}`
          break
        case 'microsoft':
          authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_MICROSOFT_CLIENT_ID&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/callback/microsoft')}&response_type=code&scope=openid%20email%20profile&state=${user.id}`
          break
        case 'github':
          authUrl = `https://github.com/login/oauth/authorize?client_id=YOUR_GITHUB_CLIENT_ID&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/callback/github')}&scope=read:user%20user:email&state=${user.id}`
          break
      }

      const authWindow = window.open(
        authUrl,
        `${provider}_auth`,
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      )

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === 'oauth_success' && event.data.provider === provider) {
          try {
            await linkOAuthAccount(user.id, {
              provider: provider,
              providerId: event.data.providerId,
              email: event.data.email,
              username: event.data.username,
              avatarUrl: event.data.avatarUrl
            })

            toast.success(`تم ربط حساب ${getProviderName(provider)} بنجاح`)
            onUpdate()
            
            if (authWindow) authWindow.close()
          } catch (error) {
            console.error(error)
            toast.error(`فشل ربط حساب ${getProviderName(provider)}`)
          }
        } else if (event.data.type === 'oauth_error') {
          toast.error(`حدث خطأ: ${event.data.error}`)
          if (authWindow) authWindow.close()
        }
      }

      window.addEventListener('message', handleMessage)

      const checkWindow = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkWindow)
          window.removeEventListener('message', handleMessage)
          setIsLinking(null)
        }
      }, 500)

    } catch (error) {
      console.error(error)
      toast.error(`فشل فتح نافذة المصادقة`)
      setIsLinking(null)
    }
  }

  const handleUnlinkClick = (provider: OAuthProvider) => {
    setProviderToUnlink(provider)
    setUnlinkConfirmOpen(true)
  }

  const confirmUnlink = async () => {
    if (!providerToUnlink) return

    try {
      await unlinkOAuthAccount(user.id, providerToUnlink)
      toast.success(`تم إلغاء ربط حساب ${getProviderName(providerToUnlink)}`)
      setUnlinkConfirmOpen(false)
      setProviderToUnlink(null)
      onUpdate()
    } catch (error) {
      console.error(error)
      toast.error(`فشل إلغاء الربط`)
    }
  }

  const getProviderName = (provider: OAuthProvider): string => {
    switch (provider) {
      case 'google': return 'Google'
      case 'microsoft': return 'Microsoft'
      case 'github': return 'GitHub'
    }
  }

  const getProviderColor = (provider: OAuthProvider, isLinked: boolean) => {
    if (!isLinked) {
      switch (provider) {
        case 'google':
          return 'bg-[#4285F4] hover:bg-[#357ae8] text-white'
        case 'microsoft':
          return 'bg-[#00A4EF] hover:bg-[#0078d4] text-white'
        case 'github':
          return 'bg-[#24292e] hover:bg-[#1a1e22] text-white'
      }
    }
    return 'bg-muted hover:bg-muted/80'
  }

  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex items-center space-x-2 space-x-reverse">
        <Checkbox
          id="enable-oauth"
          checked={showOAuthOptions}
          onCheckedChange={(checked) => setShowOAuthOptions(checked as boolean)}
        />
        <Label htmlFor="enable-oauth" className="text-base font-semibold cursor-pointer">
          ربط بحساب خارجي
        </Label>
      </div>

      {showOAuthOptions && (
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg animate-in slide-in-from-top-2">
          <p className="text-sm text-muted-foreground mb-3">
            يمكنك ربط عدة حسابات خارجية مع هذا المستخدم
          </p>

          {}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <div>
                <p className="font-medium">Google</p>
                {isGoogleLinked && (
                  <p className="text-xs text-muted-foreground">{user.google_email}</p>
                )}
              </div>
            </div>
            {isGoogleLinked ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  مرتبط
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnlinkClick('google')}
                  className="gap-2"
                >
                  <Unlink className="h-3 w-3" />
                  إلغاء الربط
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => handleLinkAccount('google')}
                disabled={isLinking !== null}
                className={getProviderColor('google', false)}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                ربط Google
              </Button>
            )}
          </div>

          {}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <svg className="h-6 w-6" viewBox="0 0 23 23">
                <path fill="#f25022" d="M0 0h11v11H0z"/>
                <path fill="#00a4ef" d="M12 0h11v11H12z"/>
                <path fill="#7fba00" d="M0 12h11v11H0z"/>
                <path fill="#ffb900" d="M12 12h11v11H12z"/>
              </svg>
              <div>
                <p className="font-medium">Microsoft</p>
                {isMicrosoftLinked && (
                  <p className="text-xs text-muted-foreground">{user.microsoft_email}</p>
                )}
              </div>
            </div>
            {isMicrosoftLinked ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  مرتبط
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnlinkClick('microsoft')}
                  className="gap-2"
                >
                  <Unlink className="h-3 w-3" />
                  إلغاء الربط
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => handleLinkAccount('microsoft')}
                disabled={isLinking !== null}
                className={getProviderColor('microsoft', false)}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                ربط Microsoft
              </Button>
            )}
          </div>

          {}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <div>
                <p className="font-medium">GitHub</p>
                {isGithubLinked && (
                  <p className="text-xs text-muted-foreground">@{user.github_username}</p>
                )}
              </div>
            </div>
            {isGithubLinked ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  مرتبط
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnlinkClick('github')}
                  className="gap-2"
                >
                  <Unlink className="h-3 w-3" />
                  إلغاء الربط
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => handleLinkAccount('github')}
                disabled={isLinking !== null}
                className={getProviderColor('github', false)}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                ربط GitHub
              </Button>
            )}
          </div>

          {isLinking && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              جاري فتح نافذة المصادقة...
            </p>
          )}
        </div>
      )}

      {}
      <Dialog open={unlinkConfirmOpen} onOpenChange={setUnlinkConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد إلغاء الربط</DialogTitle>
            <DialogDescription>
              هل تريد إلغاء ربط حساب {providerToUnlink ? getProviderName(providerToUnlink) : ''}؟
              <br />
              <br />
              سيتم حذف معلومات الربط وسيحتاج المستخدم لإعادة الربط مجدداً إذا أراد استخدام هذه الخدمة لتسجيل الدخول.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUnlinkConfirmOpen(false)
                setProviderToUnlink(null)
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={confirmUnlink}
              className="gap-2"
            >
              <Unlink className="h-4 w-4" />
              نعم، إلغاء الربط
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
