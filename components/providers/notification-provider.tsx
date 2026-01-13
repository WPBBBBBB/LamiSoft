"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import {
  getAllNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  archiveNotification,
  archiveAllReadNotifications,
  getNotificationSettings,
  updateNotificationSettings,
  subscribeToNotifications,
  runNotificationsChecks,
  type Notification,
  type NotificationSettings as Settings,
} from '@/lib/notification-system'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  soundEnabled: boolean
  isPanelOpen: boolean
  settings: Settings | null
  
  // Actions
  refreshNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  archiveNotif: (id: string) => Promise<void>
  archiveAllRead: () => Promise<void>
  toggleSound: () => Promise<void>
  togglePanel: () => void
  runChecks: () => Promise<void>
  playNotificationSound: (type: Notification['type']) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  
  // Audio context for sounds
  const audioContextRef = useRef<AudioContext | null>(null)
  const hasUserGestureRef = useRef(false)

  const ensureAudioContext = useCallback(async (): Promise<AudioContext | null> => {
    if (typeof window === 'undefined') return null
    if (!hasUserGestureRef.current) return null

    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as typeof AudioContext)
      audioContextRef.current = new AudioContextClass()
    }

    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }
    } catch {
      // Ignore: browser may still require a gesture depending on context.
    }

    return audioContextRef.current
  }, [])

  // Only enable audio after a real user interaction to avoid autoplay warnings.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const onFirstGesture = () => {
      hasUserGestureRef.current = true
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
      // Lazily create on gesture so later notifications can play without warnings.
      void ensureAudioContext()
    }

    window.addEventListener('pointerdown', onFirstGesture, { once: true })
    window.addEventListener('keydown', onFirstGesture, { once: true })

    return () => {
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
      audioContextRef.current?.close()
    }
  }, [ensureAudioContext])

  // Play notification sound
  const playNotificationSound = useCallback((type: Notification['type']) => {
    if (!soundEnabled) return

    // Create different sounds for different notification types
    const ctx = audioContextRef.current
    if (!ctx) {
      void ensureAudioContext()
      return
    }
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Different frequencies and patterns for different types
    switch (type) {
      case 'milestone_customers':
      case 'milestone_inventory':
      case 'milestone_sales':
        // Happy celebration sound
        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
        oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1) // E5
        oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2) // G5
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.5)
        break

      case 'low_inventory':
      case 'warning':
        // Warning sound
        oscillator.frequency.setValueAtTime(440, ctx.currentTime) // A4
        oscillator.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1) // C#5
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.3)
        break

      case 'error':
      case 'debt_warning':
      case 'payment_due':
        // Alert sound
        oscillator.frequency.setValueAtTime(329.63, ctx.currentTime) // E4
        oscillator.type = 'square'
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.4)
        break

      default:
        // Default notification sound
        oscillator.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.2)
    }
  }, [soundEnabled, ensureAudioContext])

  // Load settings
  const loadSettings = useCallback(async () => {
    const result = await getNotificationSettings()
    if (result.success && result.data) {
      setSettings(result.data)
      setSoundEnabled(result.data.sound_enabled)
    }
  }, [])

  // Load notifications
  const refreshNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const [notifResult, countResult] = await Promise.all([
        getAllNotifications({ includeRead: false, includeArchived: false }),
        getUnreadNotificationsCount(),
      ])

      if (notifResult.success) {
        setNotifications(notifResult.data || [])
      }

      if (countResult.success) {
        setUnreadCount(countResult.count || 0)
      }
    } catch (error) {
      } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      setSettings(null)
      setIsLoading(false)
      return
    }

    loadSettings()
    refreshNotifications()
  }, [isAuthenticated, loadSettings, refreshNotifications])

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!isAuthenticated) return

    const unsubscribe = subscribeToNotifications((notification) => {
      setNotifications((prev) => [notification, ...prev])
      setUnreadCount((prev) => prev + 1)
      
      // Play sound for new notification
      if (soundEnabled && notification.sound_enabled) {
        playNotificationSound(notification.type)
      }

      // Show desktop notification if enabled
      if (settings?.show_desktop_notifications && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/icon.png',
            badge: '/icon.png',
          })
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/icon.png',
                badge: '/icon.png',
              })
            }
          })
        }
      }

      // لا نعرض Toast - فقط الإشعار في اللوحة
    })

    return unsubscribe
  }, [isAuthenticated, soundEnabled, settings, playNotificationSound])

  // Mark as read
  const markAsRead = useCallback(async (id: string) => {
    const result = await markNotificationAsRead(id)
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    const result = await markAllNotificationsAsRead()
    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success('تم تعيين جميع الإشعارات كمقروءة')
    }
  }, [])

  // Archive notification
  const archiveNotif = useCallback(async (id: string) => {
    const result = await archiveNotification(id)
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      const notification = notifications.find((n) => n.id === id)
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    }
  }, [notifications])

  // Archive all read
  const archiveAllRead = useCallback(async () => {
    const result = await archiveAllReadNotifications()
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => !n.is_read))
      toast.success('تم أرشفة جميع الإشعارات المقروءة')
    }
  }, [])

  // Toggle sound
  const toggleSound = useCallback(async () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    
    if (settings) {
      await updateNotificationSettings({
        ...settings,
        sound_enabled: newValue,
      })
      toast.success(newValue ? 'تم تفعيل أصوات الإشعارات' : 'تم كتم أصوات الإشعارات')
    }
  }, [soundEnabled, settings])

  // Toggle panel
  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev)
  }, [])

  // Run checks
  const runChecks = useCallback(async () => {
    const result = await runNotificationsChecks()
    if (result.success && result.data) {
      toast.success(`تم توليد ${result.data.total} إشعار جديد`)
      await refreshNotifications()
    }
  }, [refreshNotifications])

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    soundEnabled,
    isPanelOpen,
    settings,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    archiveNotif,
    archiveAllRead,
    toggleSound,
    togglePanel,
    runChecks,
    playNotificationSound,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
