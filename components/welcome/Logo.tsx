"use client"
import { motion } from "framer-motion"
import Image from "next/image"

export default function Logo({ className = "" }: { className?: string }) {
  const handleLogoClick = () => {
    window.location.href = '/'
  }

  return (
    <motion.div 
      className={`flex items-center gap-3 ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="relative w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center cursor-pointer"
        whileHover={{ scale: 1.05, rotate: 5 }}
        whileTap={{ scale: 1.2 }}
        transition={{ duration: 0.3 }}
        onClick={handleLogoClick}
      >
        <Image
          src="/aave.svg"
          alt="AL-LamiSoft Logo"
          width={32}
          height={32}
          className="object-contain"
        />
      </motion.div>
      
      <motion.div
        className="font-bold text-xl tracking-tight"
        style={{ color: "var(--theme-primary)" }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        اللامي سوفت
      </motion.div>
    </motion.div>
  )
}

