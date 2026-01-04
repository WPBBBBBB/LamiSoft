import { useState, useEffect } from 'react'


export function useLocalStorage<T>(key: string, initialValue: T) {
  // الحصول على القيمة من localStorage أو استخدام القيمة الافتراضية
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      return initialValue
    }
  })

  // دالة لحفظ القيمة في localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
        // إطلاق حدث مخصص لمزامنة التبويبات
        window.dispatchEvent(new Event('local-storage'))
      }
    } catch (error) {
      }
  }

  // دالة لحذف القيمة من localStorage
  const removeValue = () => {
    try {
      setStoredValue(initialValue)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
        window.dispatchEvent(new Event('local-storage'))
      }
    } catch (error) {
      }
  }

  // مزامنة البيانات بين التبويبات
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const item = window.localStorage.getItem(key)
        if (item) {
          setStoredValue(JSON.parse(item))
        }
      } catch (error) {
        }
    }

    // الاستماع لحدث storage (تغييرات من تبويبات أخرى)
    window.addEventListener('storage', handleStorageChange)
    // الاستماع لحدث مخصص (تغييرات من نفس التبويب)
    window.addEventListener('local-storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('local-storage', handleStorageChange)
    }
  }, [key])

  return [storedValue, setValue, removeValue] as const
}
