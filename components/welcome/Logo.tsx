"use client"
import { motion } from "framer-motion"

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <motion.div 
      className={`flex flex-col items-center gap-2 ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Icon */}
      <motion.svg
        width="60"
        height="60"
        viewBox="0 0 60 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        whileHover={{ scale: 1.05, rotate: 5 }}
        transition={{ duration: 0.3 }}
      >
        {/* Background Circle with Gradient */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--theme-primary)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--theme-primary)" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        
        {/* Main Circle */}
        <circle cx="30" cy="30" r="28" fill="url(#logoGradient)" opacity="0.1" />
        <circle cx="30" cy="30" r="28" stroke="var(--theme-primary)" strokeWidth="2" fill="none" />
        
        {/* Shopping Cart Icon (Simplified & Modern) */}
        <path
          d="M12 12L16 12L19 28L42 28"
          stroke="var(--theme-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M19 28L21 38L39 38"
          stroke="var(--theme-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="24" cy="44" r="2.5" fill="var(--theme-primary)" />
        <circle cx="36" cy="44" r="2.5" fill="var(--theme-primary)" />
        
        {/* Tech Element - Circuit Lines */}
        <path
          d="M38 18L42 18L42 22"
          stroke="var(--theme-primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <circle cx="42" cy="18" r="1.5" fill="var(--theme-primary)" opacity="0.7" />
        <path
          d="M44 24L48 24L48 28"
          stroke="var(--theme-primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        <circle cx="48" cy="28" r="1.5" fill="var(--theme-primary)" opacity="0.5" />
      </motion.svg>

      {/* Text */}
      <motion.div
        className="font-bold text-xl tracking-tight"
        style={{ color: "var(--theme-primary)" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        AL-LamiSoft
      </motion.div>
    </motion.div>
  )
}
