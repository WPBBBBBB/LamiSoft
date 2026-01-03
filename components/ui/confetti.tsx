"use client"

import { useEffect, useState } from "react"

interface ConfettiProps {
  active: boolean
  onComplete?: () => void
}

export function Confetti({ active, onComplete }: ConfettiProps) {
  const [pieces, setPieces] = useState<Array<{ id: number; style: React.CSSProperties }>>([])

  useEffect(() => {
    if (active) {
      // إنشاء 50 قطعة من الأوراق الملونة
      const newPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        style: {
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 0.5}s`,
          animationDuration: `${2 + Math.random() * 1}s`,
          backgroundColor: [
            '#FFD700', // ذهبي
            '#FFA500', // برتقالي
            '#FF69B4', // وردي
            '#00CED1', // فيروزي
            '#32CD32', // أخضر
            '#FF6347', // أحمر
            '#9370DB', // بنفسجي
            '#FFD700', // ذهبي آخر
          ][Math.floor(Math.random() * 8)],
        },
      }))
      setPieces(newPieces)

      // إزالة الأوراق بعد 3 ثواني
      const timer = setTimeout(() => {
        setPieces([])
        onComplete?.()
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [active, onComplete])

  if (!active || pieces.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece absolute w-3 h-3 opacity-90"
          style={piece.style}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .confetti-piece {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  )
}
