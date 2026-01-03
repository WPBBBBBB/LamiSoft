import { useState, useEffect } from 'react'

/**
 * Custom hook لتأخير تنفيذ قيمة متغيرة
 * مفيد للبحث وتجنب الطلبات الكثيرة
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // تعيين مؤقت لتحديث القيمة بعد التأخير
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // إلغاء المؤقت إذا تغيرت القيمة قبل انتهاء التأخير
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Custom hook لتأخير تنفيذ دالة
 * مفيد لتقليل عدد مرات تنفيذ دالة معينة
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  return (...args: Parameters<T>) => {
    // إلغاء المؤقت السابق
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // تعيين مؤقت جديد
    const newTimeoutId = setTimeout(() => {
      callback(...args)
    }, delay)

    setTimeoutId(newTimeoutId)
  }
}
