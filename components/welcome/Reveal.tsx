"use client"
import React, { useEffect, useRef, ReactNode } from "react"

export default function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed")
            // optionally unobserve to reveal once
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )

    el.querySelectorAll(".to-reveal").forEach((node) => obs.observe(node))

    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className={className}>
      {children}
      <style jsx>{`
        .to-reveal { opacity: 0; transform: translateY(24px); transition: all 700ms cubic-bezier(.2,.9,.2,1); }
        .revealed .to-reveal { opacity: 1; transform: translateY(0); }
      `}</style>
    </div>
  )
}
