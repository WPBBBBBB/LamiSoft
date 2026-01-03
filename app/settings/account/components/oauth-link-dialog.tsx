"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

interface OAuthLinkDialogProps {
  provider: 'google' | 'microsoft' | 'github'
  userId: string
  onClose: () => void
  onSuccess: () => void
}

export default function OAuthLinkDialog({ provider, userId, onClose, onSuccess }: OAuthLinkDialogProps) {
  const [status, setStatus] = useState<'idle' | 'linking' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const providerConfig = {
    google: {
      name: 'Google',
      color: 'from-red-500 to-orange-500',
      icon: (
        <svg className="h-12 w-12" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      ),
    },
    microsoft: {
      name: 'Microsoft',
      color: 'from-blue-500 to-cyan-500',
      icon: (
        <svg className="h-12 w-12" viewBox="0 0 23 23">
          <path fill="#f25022" d="M0 0h11v11H0z"/>
          <path fill="#00a4ef" d="M12 0h11v11H12z"/>
          <path fill="#7fba00" d="M0 12h11v11H0z"/>
          <path fill="#ffb900" d="M12 12h11v11H12z"/>
        </svg>
      ),
    },
    github: {
      name: 'GitHub',
      color: 'from-gray-700 to-gray-900',
      icon: (
        <svg className="h-12 w-12" viewBox="0 0 24 24" fill="white">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      ),
    },
  }

  const config = providerConfig[provider]

  const handleLink = () => {
    setStatus('linking')
    
    const width = 600
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const authWindow = window.open(
      `/api/oauth/${provider}/authorize?userId=${userId}`,
      `${provider}_link`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    )

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data.type === 'oauth-success' && event.data.provider === provider) {
        setStatus('success')
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      } else if (event.data.type === 'oauth-error') {
        setStatus('error')
        setErrorMessage(event.data.error || 'حدث خطأ أثناء الربط')
      }
    }

    window.addEventListener('message', handleMessage)

    const checkClosed = setInterval(() => {
      if (authWindow?.closed) {
        clearInterval(checkClosed)
        window.removeEventListener('message', handleMessage)
        if (status === 'linking') {
          setStatus('idle')
        }
      }
    }, 500)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            ربط حساب {config.name}
          </DialogTitle>
          <DialogDescription className="text-center">
            قم بتسجيل الدخول إلى حساب {config.name} الخاص بك لربطه
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {status === 'idle' && (
            <div className="text-center space-y-6">
              <div className={`mx-auto w-24 h-24 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}>
                {config.icon}
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">اربط حسابك</h3>
                <p className="text-sm text-muted-foreground">
                  سيتم فتح نافذة جديدة لتسجيل الدخول
                </p>
              </div>
              <Button 
                onClick={handleLink}
                className="w-full"
                size="lg"
              >
                ربط حساب {config.name}
              </Button>
            </div>
          )}

          {status === 'linking' && (
            <div className="text-center space-y-6">
              <div className={`mx-auto w-24 h-24 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}>
                <Loader2 className="h-12 w-12 text-white animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">جاري الربط...</h3>
                <p className="text-sm text-muted-foreground">
                  يرجى إكمال عملية المصادقة في النافذة المفتوحة
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-green-600 mb-2">تم الربط بنجاح!</h3>
                <p className="text-sm text-muted-foreground">
                  تم ربط حساب {config.name} بنجاح
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-24 h-24 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                <XCircle className="h-12 w-12 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-red-600 mb-2">فشل الربط</h3>
                <p className="text-sm text-muted-foreground">
                  {errorMessage}
                </p>
              </div>
              <Button 
                onClick={() => setStatus('idle')}
                variant="outline"
                className="w-full"
              >
                حاول مرة أخرى
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
