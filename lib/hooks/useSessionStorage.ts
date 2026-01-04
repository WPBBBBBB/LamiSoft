import { useState, useEffect } from 'react'

/**
 * Custom hook للتعامل مع sessionStorage
 * يحفظ ويقرأ البيانات المؤقتة (تُحذف عند إغلاق التبويب)
 */
export function useSessionStorage<T>(key: string, initialValue: T) {
  // الحصول على القيمة من sessionStorage أو استخدام القيمة الافتراضية
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.sessionStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      return initialValue
    }
  })

  // دالة لحفظ القيمة في sessionStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore))
        window.dispatchEvent(new Event('session-storage'))
      }
    } catch (error) {
      }
  }

  // دالة لحذف القيمة من sessionStorage
  const removeValue = () => {
    try {
      setStoredValue(initialValue)
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key)
        window.dispatchEvent(new Event('session-storage'))
      }
    } catch (error) {
      }
  }

  // مزامنة البيانات داخل نفس التبويب
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const item = window.sessionStorage.getItem(key)
        if (item) {
          setStoredValue(JSON.parse(item))
        }
      } catch (error) {
        }
    }

    window.addEventListener('session-storage', handleStorageChange)

    return () => {
      window.removeEventListener('session-storage', handleStorageChange)
    }
  }, [key])

  return [storedValue, setValue, removeValue] as const
}
