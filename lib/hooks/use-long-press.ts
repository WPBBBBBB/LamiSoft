import { useRef, useCallback, MouseEvent, TouchEvent } from "react"

interface UseLongPressOptions {
  onLongPress: () => void
  onClick?: () => void
  delay?: number // الوقت بالميلي ثانية (افتراضياً 2000 = 2 ثانية)
}

export function useLongPress(options: UseLongPressOptions) {
  const { onLongPress, onClick, delay = 2000 } = options
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef(false)
  const clickPreventedRef = useRef(false)

  const start = useCallback(() => {
    isLongPressRef.current = false
    clickPreventedRef.current = false
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      clickPreventedRef.current = true
      onLongPress()
    }, delay)
  }, [onLongPress, delay])

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleClick = useCallback(() => {
    if (!isLongPressRef.current && onClick) {
      onClick()
    }
  }, [onClick])

  // Mouse events
  const onMouseDown = useCallback(() => {
    start()
  }, [start])

  const onMouseUp = useCallback(() => {
    clear()
    setTimeout(handleClick, 0)
    // إعادة تعيين بعد فترة قصيرة
    setTimeout(() => {
      isLongPressRef.current = false
      clickPreventedRef.current = false
    }, 100)
  }, [clear, handleClick])

  const onMouseLeave = useCallback(() => {
    clear()
  }, [clear])

  // Touch events
  const onTouchStart = useCallback((e: TouchEvent) => {
    start()
  }, [start])

  const onTouchEnd = useCallback((e: TouchEvent) => {
    clear()
    // منع السلوك الافتراضي إذا كان ضغط مطول
    if (isLongPressRef.current) {
      e.preventDefault()
      e.stopPropagation()
    } else {
      setTimeout(handleClick, 0)
    }
    // إعادة تعيين بعد فترة قصيرة
    setTimeout(() => {
      isLongPressRef.current = false
      clickPreventedRef.current = false
    }, 100)
  }, [clear, handleClick])

  const onTouchCancel = useCallback(() => {
    clear()
  }, [clear])

  const handleLinkClick = useCallback((e: MouseEvent) => {
    if (clickPreventedRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [])

  const handleContextMenu = useCallback((e: MouseEvent | React.MouseEvent) => {
    // منع قائمة السياق الافتراضية للمتصفح
    e.preventDefault()
  }, [])

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
    onTouchCancel,
    onClick: handleLinkClick,
    onContextMenu: handleContextMenu,
    isLongPress: () => isLongPressRef.current,
  }
}
