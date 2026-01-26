"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { 
  ShoppingCart, Package, BarChart3, Bell, Users, Shield, 
  CreditCard, Warehouse, TrendingUp, FileText, Settings, Smartphone,
  Lock, Eye, Download, Upload, Printer, Search, Zap, Globe,
  CheckCircle, AlertCircle, Calendar, DollarSign, Briefcase, Target,
  Award, Sparkles, Star, Heart, ThumbsUp, Cpu
} from "lucide-react"
import { useSettings } from "@/components/providers/settings-provider"
import { t } from "@/lib/translations"

interface Feature {
  key: string
  icon: any
  color: string
  gradient: string
}

const features: Feature[] = [
  { key: "feature_1", icon: ShoppingCart, color: "#FF6B6B", gradient: "from-red-500 to-pink-500" },
  { key: "feature_2", icon: DollarSign, color: "#4ECDC4", gradient: "from-teal-500 to-cyan-500" },
  { key: "feature_3", icon: CreditCard, color: "#45B7D1", gradient: "from-blue-500 to-indigo-500" },
  { key: "feature_4", icon: Globe, color: "#FFA07A", gradient: "from-orange-500 to-amber-500" },
  { key: "feature_5", icon: Target, color: "#98D8C8", gradient: "from-green-500 to-emerald-500" },
  { key: "feature_6", icon: Printer, color: "#F7DC6F", gradient: "from-yellow-500 to-lime-500" },
  { key: "feature_7", icon: Settings, color: "#BB8FCE", gradient: "from-purple-500 to-violet-500" },
  { key: "feature_8", icon: Users, color: "#85C1E2", gradient: "from-sky-500 to-blue-500" },
  { key: "feature_9", icon: Sparkles, color: "#F8B739", gradient: "from-amber-500 to-orange-500" },
  { key: "feature_10", icon: Package, color: "#52BE80", gradient: "from-emerald-500 to-green-500" },
  { key: "feature_11", icon: Briefcase, color: "#5DADE2", gradient: "from-indigo-500 to-blue-500" },
  { key: "feature_12", icon: CheckCircle, color: "#48C9B0", gradient: "from-teal-500 to-green-500" },
  { key: "feature_13", icon: Users, color: "#AF7AC5", gradient: "from-violet-500 to-purple-500" },
  { key: "feature_14", icon: Zap, color: "#F39C12", gradient: "from-yellow-500 to-orange-500" },
  { key: "feature_15", icon: Warehouse, color: "#3498DB", gradient: "from-blue-500 to-cyan-500" },
  { key: "feature_16", icon: FileText, color: "#E74C3C", gradient: "from-red-500 to-rose-500" },
  { key: "feature_17", icon: TrendingUp, color: "#1ABC9C", gradient: "from-green-500 to-teal-500" },
  { key: "feature_18", icon: Bell, color: "#E67E22", gradient: "from-orange-500 to-red-500" },
  { key: "feature_19", icon: Eye, color: "#9B59B6", gradient: "from-purple-500 to-pink-500" },
  { key: "feature_20", icon: Award, color: "#16A085", gradient: "from-teal-500 to-emerald-500" },
  { key: "feature_21", icon: CreditCard, color: "#2980B9", gradient: "from-blue-500 to-indigo-500" },
  { key: "feature_22", icon: Calendar, color: "#8E44AD", gradient: "from-violet-500 to-purple-500" },
  { key: "feature_23", icon: DollarSign, color: "#27AE60", gradient: "from-green-500 to-lime-500" },
  { key: "feature_24", icon: TrendingUp, color: "#D35400", gradient: "from-orange-500 to-amber-500" },
  { key: "feature_25", icon: FileText, color: "#C0392B", gradient: "from-red-500 to-orange-500" },
  { key: "feature_26", icon: BarChart3, color: "#2ECC71", gradient: "from-emerald-500 to-green-500" },
  { key: "feature_27", icon: TrendingUp, color: "#3498DB", gradient: "from-sky-500 to-blue-500" },
  { key: "feature_28", icon: Users, color: "#9B59B6", gradient: "from-purple-500 to-violet-500" },
  { key: "feature_29", icon: Package, color: "#1ABC9C", gradient: "from-teal-500 to-cyan-500" },
  { key: "feature_30", icon: BarChart3, color: "#E74C3C", gradient: "from-rose-500 to-red-500" },
  { key: "feature_31", icon: Shield, color: "#34495E", gradient: "from-slate-500 to-gray-500" },
  { key: "feature_32", icon: Lock, color: "#E67E22", gradient: "from-orange-500 to-amber-500" },
  { key: "feature_33", icon: FileText, color: "#16A085", gradient: "from-green-500 to-teal-500" },
  { key: "feature_34", icon: Shield, color: "#2980B9", gradient: "from-blue-500 to-indigo-500" },
  { key: "feature_35", icon: Globe, color: "#8E44AD", gradient: "from-violet-500 to-purple-500" },
  { key: "feature_36", icon: Smartphone, color: "#25D366", gradient: "from-green-500 to-emerald-500" },
  { key: "feature_37", icon: Bell, color: "#27AE60", gradient: "from-emerald-500 to-teal-500" },
  { key: "feature_38", icon: Eye, color: "#3498DB", gradient: "from-sky-500 to-blue-500" },
  { key: "feature_39", icon: Sparkles, color: "#9B59B6", gradient: "from-purple-500 to-pink-500" },
  { key: "feature_40", icon: Star, color: "#F39C12", gradient: "from-yellow-500 to-orange-500" },
  { key: "feature_41", icon: FileText, color: "#1ABC9C", gradient: "from-teal-500 to-cyan-500" },
  { key: "feature_42", icon: Printer, color: "#E74C3C", gradient: "from-red-500 to-rose-500" },
  { key: "feature_43", icon: Download, color: "#2ECC71", gradient: "from-green-500 to-emerald-500" },
  { key: "feature_44", icon: AlertCircle, color: "#E67E22", gradient: "from-orange-500 to-red-500" },
  { key: "feature_45", icon: Bell, color: "#C0392B", gradient: "from-rose-500 to-red-500" },
  { key: "feature_46", icon: Star, color: "#3498DB", gradient: "from-blue-500 to-indigo-500" },
  { key: "feature_47", icon: Settings, color: "#9B59B6", gradient: "from-violet-500 to-purple-500" },
  { key: "feature_48", icon: Lock, color: "#34495E", gradient: "from-gray-500 to-slate-500" },
  { key: "feature_49", icon: FileText, color: "#16A085", gradient: "from-teal-500 to-green-500" },
  { key: "feature_50", icon: Shield, color: "#E74C3C", gradient: "from-red-500 to-rose-500" },
  { key: "feature_51", icon: Cpu, color: "#2980B9", gradient: "from-indigo-500 to-blue-500" },
  { key: "feature_52", icon: Globe, color: "#27AE60", gradient: "from-green-500 to-emerald-500" },
  { key: "feature_53", icon: Smartphone, color: "#8E44AD", gradient: "from-purple-500 to-violet-500" },
  { key: "feature_54", icon: Zap, color: "#F39C12", gradient: "from-yellow-500 to-orange-500" },
  { key: "feature_55", icon: Search, color: "#3498DB", gradient: "from-sky-500 to-blue-500" },
  { key: "feature_56", icon: TrendingUp, color: "#1ABC9C", gradient: "from-teal-500 to-cyan-500" },
  { key: "feature_57", icon: Printer, color: "#E67E22", gradient: "from-orange-500 to-amber-500" },
  { key: "feature_58", icon: FileText, color: "#9B59B6", gradient: "from-purple-500 to-pink-500" },
  { key: "feature_59", icon: Upload, color: "#2ECC71", gradient: "from-emerald-500 to-green-500" },
  { key: "feature_60", icon: Sparkles, color: "#E74C3C", gradient: "from-rose-500 to-red-500" },
  { key: "feature_61", icon: Download, color: "#3498DB", gradient: "from-blue-500 to-indigo-500" },
  { key: "feature_62", icon: Upload, color: "#16A085", gradient: "from-green-500 to-teal-500" },
  { key: "feature_63", icon: Settings, color: "#C0392B", gradient: "from-red-500 to-orange-500" },
  { key: "feature_64", icon: Zap, color: "#27AE60", gradient: "from-emerald-500 to-lime-500" },
]

// Logo component for the book
const BookLogo = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center gap-3 opacity-90">
      <div className="relative w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center">
        <Image
          src="/aave.svg"
          alt="AL-LamiSoft Logo"
          width={40}
          height={40}
          className="object-contain"
          // Disable optimization for data url in preview if needed, but since it's a real file we can use it
        />
      </div>
      <div className="font-bold text-xl tracking-tight text-[#8B4513]">
        {label}
      </div>
    </div>
)

export default function Book3D({ className = "" }: { className?: string }) {
  const { currentLanguage } = useSettings()
  const [currentPage, setCurrentPage] = useState(0)
  const [isFlipping, setIsFlipping] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isFlipping) {
        setIsFlipping(true)
        setTimeout(() => {
          // Advance by 1 page each flip
          setCurrentPage((prev) => (prev + 1) % features.length)
          setIsFlipping(false)
        }, 1000)
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [isFlipping])

  // Current spread: left page (currentPage) and right page (currentPage + 1)
  const leftPageIndex = currentPage
  const rightPageIndex = (currentPage + 1) % features.length
  const nextLeftPageIndex = (currentPage + 1) % features.length // What will be the left page after flip
  const hiddenRightPageIndex = (currentPage + 2) % features.length // New page revealed underneath

  const leftFeature = features[leftPageIndex]
  const rightFeature = features[rightPageIndex]
  const nextLeftFeature = features[nextLeftPageIndex]
  const hiddenRightFeature = features[hiddenRightPageIndex]
  
  const LeftIcon = leftFeature.icon
  const RightIcon = rightFeature.icon
  const NextLeftIcon = nextLeftFeature.icon
  const HiddenRightIcon = hiddenRightFeature.icon

  // Calculate page layers for realistic book effect
  const totalPages = features.length
  const pagesRead = currentPage
  const pagesRemaining = totalPages - currentPage - 2 // Subtract 2 because we show 2 pages at once
  
  // Reduce layers on mobile for performance
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  const maxLayersToShow = isMobile ? 5 : 20 // Maximum layers to display

  return (
    <div className={`relative w-full h-[250px] sm:h-[350px] md:h-[400px] lg:h-[450px] flex items-center justify-center ${className}`}>
      {/* Enhanced book base shadow with multiple layers - hidden on mobile */}
      <div className="hidden md:block absolute w-[520px] h-12 bg-black/30 blur-3xl" style={{ bottom: '15px' }} />
      <div className="hidden md:block absolute w-[500px] h-8 bg-black/20 blur-2xl" style={{ bottom: '18px' }} />

      {/* Book container - responsive sizing */}
      <div 
        className="relative w-[90vw] sm:w-[500px] md:w-[550px] lg:w-[600px] h-[200px] sm:h-[300px] md:h-[350px] lg:h-[400px]"
        style={{
          perspective: '2500px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Book spine and back cover */}
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          {/* Left side page layers (pages read) with realistic thickness */}
          <div className="absolute top-0 left-0 w-1/2 h-full" style={{ transformStyle: 'preserve-3d' }}>
            {[...Array(Math.min(Math.max(0, pagesRead), maxLayersToShow))].map((_, i) => {
              const layerIndex = pagesRead - i
              const offset = i * (isMobile ? 0.8 : 1.2) // Reduced thickness on mobile
              const zOffset = i * 0.5
              return (
                <motion.div
                  key={`left-layer-${i}`}
                  className="absolute top-0 left-0 w-full h-full rounded-l-lg"
                  style={{
                    background: i === 0 
                      ? 'linear-gradient(135deg, #f9f7f0 0%, #e8e6dc 50%, #d8d6cc 100%)' 
                      : `linear-gradient(135deg, #ebe9df ${50 - i}%, #dbd9cf ${100 - i * 2}%)`,
                    transform: `translateX(-${offset}px) translateZ(-${zOffset}px) rotateY(-${i * 0.2}deg)`,
                    boxShadow: `
                      inset 5px 0 15px rgba(0,0,0,${0.08 + i * 0.02}),
                      inset 0 5px 10px rgba(0,0,0,0.05),
                      inset 0 -5px 10px rgba(0,0,0,0.05),
                      -3px 0 8px rgba(0,0,0,${0.15 + i * 0.02})
                    `,
                    zIndex: -i,
                    opacity: 1 - (i * 0.03),
                    borderRight: '1px solid rgba(150, 140, 120, 0.3)',
                  }}
                  initial={{ x: -offset }}
                  animate={{ 
                    x: -offset,
                    opacity: 1 - (i * 0.03),
                  }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                >
                  {/* Page edge with yellowing effect */}
                  <div 
                    className="absolute top-0 right-0 bottom-0 w-0.5"
                    style={{
                      background: `linear-gradient(to bottom, 
                        rgba(180, 160, 120, ${0.3 + i * 0.05}), 
                        rgba(160, 140, 100, ${0.4 + i * 0.05}), 
                        rgba(180, 160, 120, ${0.3 + i * 0.05})
                      )`,
                    }}
                  />
                  {/* Top and bottom edges darkening */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-b from-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-t from-black/10 to-transparent" />
                </motion.div>
              )
            })}
          </div>

          {/* Right side page layers (pages remaining) with realistic thickness */}
          <div className="absolute top-0 left-1/2 w-1/2 h-full" style={{ transformStyle: 'preserve-3d' }}>
            {[...Array(Math.min(Math.max(0, pagesRemaining), maxLayersToShow))].map((_, i) => {
              const offset = i * (isMobile ? 0.8 : 1.2) // Reduced thickness on mobile
              const zOffset = i * 0.5
              return (
                <motion.div
                  key={`right-layer-${i}`}
                  className="absolute top-0 left-0 w-full h-full rounded-r-lg"
                  style={{
                    background: i === 0 
                      ? 'linear-gradient(135deg, #ffffff 0%, #f8f8f8 50%, #efefef 100%)' 
                      : `linear-gradient(135deg, #fafafa ${50 - i}%, #f0f0f0 ${100 - i * 2}%)`,
                    transform: `translateX(${offset}px) translateZ(-${zOffset + 2}px) rotateY(${i * 0.2}deg)`,
                    boxShadow: `
                      inset -5px 0 15px rgba(0,0,0,${0.08 + i * 0.02}),
                      inset 0 5px 10px rgba(0,0,0,0.05),
                      inset 0 -5px 10px rgba(0,0,0,0.05),
                      3px 0 8px rgba(0,0,0,${0.15 + i * 0.02})
                    `,
                    zIndex: -i - 2,
                    opacity: 1 - (i * 0.03),
                    borderLeft: '1px solid rgba(200, 200, 200, 0.3)',
                  }}
                  initial={{ x: offset }}
                  animate={{ 
                    x: offset,
                    opacity: 1 - (i * 0.03),
                  }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                >
                  {/* Page edge */}
                  <div 
                    className="absolute top-0 left-0 bottom-0 w-0.5"
                    style={{
                      background: `linear-gradient(to bottom, 
                        rgba(200, 200, 200, ${0.3 + i * 0.05}), 
                        rgba(180, 180, 180, ${0.4 + i * 0.05}), 
                        rgba(200, 200, 200, ${0.3 + i * 0.05})
                      )`,
                    }}
                  />
                  {/* Top and bottom edges darkening */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-b from-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-t from-black/10 to-transparent" />
                </motion.div>
              )
            })}
          </div>

          {/* Back cover with leather texture */}
          <div 
            className="absolute top-0 right-0 w-1/2 h-full rounded-r-lg"
            style={{
              background: 'linear-gradient(135deg, #8B4513 0%, #6B3410 50%, #5a2d0e 100%)',
              transform: 'rotateY(0deg)',
              transformOrigin: 'left',
              boxShadow: isMobile 
                ? 'inset -4px 0 8px rgba(0,0,0,0.3), -4px 0 10px rgba(0,0,0,0.2)'
                : `
                  inset -8px 0 15px rgba(0,0,0,0.4),
                  inset 0 8px 15px rgba(0,0,0,0.3),
                  inset 0 -8px 15px rgba(0,0,0,0.3),
                  -8px 0 20px rgba(0,0,0,0.3)
                `,
            }}
          >
            {/* Leather texture overlay */}
            <div 
              className="absolute inset-0 rounded-r-lg opacity-30"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 20% 50%, rgba(139,69,19,0.3) 0%, transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(139,69,19,0.3) 0%, transparent 50%),
                  radial-gradient(circle at 40% 80%, rgba(139,69,19,0.3) 0%, transparent 50%)
                `,
              }}
            />
            
            {/* Embossed title effect */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-200/80 font-bold text-sm opacity-70"
                 style={{ 
                   writingMode: 'vertical-rl',
                   textShadow: '1px 1px 2px rgba(0,0,0,0.5), -1px -1px 1px rgba(255,255,255,0.1)',
                   letterSpacing: '0.15em',
                 }}>
              AL-LamiSoft
            </div>

            {/* Decorative corner elements */}
            <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-amber-700/40 rounded-tr-lg" />
            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-amber-700/40 rounded-br-lg" />
          </div>

          {/* Spine with enhanced detail */}
          <div 
            className="absolute top-0 left-1/2 w-3 md:w-5 h-full"
            style={{
              background: `
                linear-gradient(90deg, 
                  #4a3214 0%, 
                  #5a3d1a 20%,
                  #6b4821 50%, 
                  #5a3d1a 80%,
                  #4a3214 100%
                )
              `,
              transform: 'rotateY(-90deg)',
              transformOrigin: 'left',
              boxShadow: isMobile
                ? 'inset 0 0 8px rgba(0,0,0,0.5)'
                : `
                  inset 0 0 15px rgba(0,0,0,0.6),
                  inset 0 5px 10px rgba(0,0,0,0.4),
                  inset 0 -5px 10px rgba(0,0,0,0.4)
                `,
            }}
          >
            {/* Spine bands for detail - hidden on mobile */}
            {!isMobile && (
              <>
                <div className="absolute top-[15%] left-0 right-0 h-1 bg-linear-to-r from-amber-900/50 via-amber-700/50 to-amber-900/50" />
                <div className="absolute top-[30%] left-0 right-0 h-1 bg-linear-to-r from-amber-900/50 via-amber-700/50 to-amber-900/50" />
                <div className="absolute top-[70%] left-0 right-0 h-1 bg-linear-to-r from-amber-900/50 via-amber-700/50 to-amber-900/50" />
                <div className="absolute top-[85%] left-0 right-0 h-1 bg-linear-to-r from-amber-900/50 via-amber-700/50 to-amber-900/50" />
              </>
            )}
          </div>

          {/* Static Right Page (Revealed Underneath) */}
          <div 
            className="absolute top-0 left-1/2 w-1/2 h-full rounded-r-lg overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
              boxShadow: isMobile
                ? 'inset -3px 0 8px rgba(0,0,0,0.08), 3px 0 10px rgba(0,0,0,0.15)'
                : 'inset -5px 0 15px rgba(0,0,0,0.1), 5px 0 20px rgba(0,0,0,0.2)',
            }}
          >
            {/* Page content */}
            <div className="relative h-full flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 gap-3 md:gap-6">
              <motion.div
                className={`bg-linear-to-br ${hiddenRightFeature.gradient} p-3 md:p-4 lg:p-6 rounded-xl md:rounded-2xl shadow-lg`}
              >
                <HiddenRightIcon className="w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 text-white" strokeWidth={2} />
              </motion.div>
              <p className="text-sm sm:text-base md:text-lg font-bold text-center leading-relaxed text-gray-800 px-2">
                {t(hiddenRightFeature.key, currentLanguage.code)}
              </p>
            </div>

            {/* Page lines */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className="absolute left-8 right-8 h-px bg-blue-200/30"
                  style={{ top: `${30 + i * 17}px` }}
                />
              ))}
            </div>

            {/* Page number */}
            <div className="absolute bottom-2 md:bottom-4 right-4 md:right-8 text-[10px] md:text-xs text-gray-400">
              {hiddenRightPageIndex + 1}
            </div>
          </div>

          {/* Front cover (left page - static) */}
          <div 
            className="absolute top-0 left-0 w-1/2 h-full rounded-l-lg overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #f5f5dc 0%, #e8e8d0 100%)',
              boxShadow: isMobile
                ? 'inset 3px 0 8px rgba(0,0,0,0.08), -3px 0 10px rgba(0,0,0,0.2)'
                : 'inset 5px 0 15px rgba(0,0,0,0.1), -5px 0 20px rgba(0,0,0,0.3)',
            }}
          >
            {/* Paper texture */}
            <div className="absolute inset-0 opacity-10"
                 style={{
                   backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
                 }}
            />

            {/* Left page content */}
            <div className="relative h-full flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 gap-3 md:gap-6">
              <motion.div
                  className={`bg-linear-to-br ${leftFeature.gradient} p-3 md:p-4 lg:p-6 rounded-xl md:rounded-2xl shadow-lg`}
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <LeftIcon className="w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 text-white" strokeWidth={2} />
              </motion.div>
              <p className="text-sm sm:text-base md:text-lg font-bold text-center leading-relaxed text-gray-800 px-2">
                {t(leftFeature.key, currentLanguage.code)}
              </p>
            </div>

            {/* Page lines - hidden on mobile */}
            {!isMobile && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute left-8 right-8 h-px bg-blue-200/30"
                    style={{ top: `${30 + i * 17}px` }}
                  />
                ))}
              </div>
            )}

            {/* Page number */}
            <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 text-[10px] md:text-xs text-gray-400">
              {leftPageIndex + 1}
            </div>
          </div>

          {/* Right page (flipping page) */}
          <motion.div 
            className="absolute top-0 left-1/2 w-1/2 h-full origin-left"
            style={{
              transformStyle: 'preserve-3d',
            }}
            animate={{
              rotateY: isFlipping ? -180 : 0,
            }}
            transition={{
              duration: 1,
              ease: [0.45, 0.05, 0.55, 0.95], // Custom easing for more realistic paper flip
            }}
          >
            {/* Front of flipping page */}
            <div 
              className="absolute inset-0 rounded-r-lg overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
                boxShadow: isFlipping 
                  ? (isMobile 
                    ? 'inset -8px 0 15px rgba(0,0,0,0.2), 5px 0 15px rgba(0,0,0,0.3)'
                    : 'inset -15px 0 30px rgba(0,0,0,0.3), 10px 0 30px rgba(0,0,0,0.4)') 
                  : (isMobile
                    ? 'inset -3px 0 8px rgba(0,0,0,0.08), 3px 0 10px rgba(0,0,0,0.15)'
                    : 'inset -5px 0 15px rgba(0,0,0,0.1), 5px 0 20px rgba(0,0,0,0.2)'),
                transition: 'box-shadow 0.5s ease',
              }}
            >
              {/* Page curl effect on corners */}
              <motion.div
                className="absolute top-0 right-0 w-12 h-12 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, transparent 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.1) 100%)',
                  clipPath: 'polygon(100% 0, 100% 100%, 0 0)',
                }}
                animate={{
                  opacity: isFlipping ? 0.8 : 0.3,
                }}
              />
              
              {/* Paper fold shadow in middle */}
              <motion.div
                className="absolute inset-y-0 left-0 w-2 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, rgba(0,0,0,0.15) 0%, transparent 100%)',
                }}
                animate={{
                  opacity: isFlipping ? 1 : 0.3,
                  width: isFlipping ? '8px' : '2px',
                }}
                transition={{ duration: 0.5 }}
              />

              {/* Enhanced paper texture with grain */}
              <div className="absolute inset-0 opacity-10"
                   style={{
                     backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
                     mixBlendMode: 'multiply',
                   }}
              />

              {/* Vertical fiber lines for paper texture */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                {[...Array(30)].map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute top-0 bottom-0 w-px bg-gray-400"
                    style={{ left: `${i * 3.33}%` }}
                  />
                ))}
              </div>

              {/* Right page content */}
              <div className="relative h-full flex flex-col items-center justify-center p-8 gap-6">
                <motion.div
                  className={`bg-linear-to-br ${rightFeature.gradient} p-6 rounded-2xl shadow-lg`}
                  animate={{
                    rotate: [0, -5, 5, 0],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <RightIcon className="w-16 h-16 text-white" strokeWidth={2} />
                </motion.div>
                <p className="text-lg font-bold text-center leading-relaxed text-gray-800">
                  {t(rightFeature.key, currentLanguage.code)}
                </p>
              </div>

              {/* Page lines */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute left-8 right-8 h-px bg-blue-200/30"
                    style={{ top: `${30 + i * 17}px` }}
                  />
                ))}
              </div>

              {/* Page number */}
              <div className="absolute bottom-4 right-8 text-xs text-gray-400">
                {rightPageIndex + 1}
              </div>
              
              {/* Bottom right corner curl */}
              <motion.div
                className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none"
                style={{
                  background: 'linear-gradient(225deg, transparent 0%, rgba(0,0,0,0.03) 50%, rgba(0,0,0,0.08) 100%)',
                  clipPath: 'polygon(100% 100%, 100% 0, 0 100%)',
                }}
                animate={{
                  opacity: isFlipping ? 0.5 : 0.2,
                }}
              />
            </div>

            {/* Back of flipping page */}
            <div 
              className="absolute inset-0 rounded-r-lg overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: 'linear-gradient(135deg, #f5f5dc 0%, #e8e8d0 100%)',
                boxShadow: isFlipping
                  ? 'inset 15px 0 30px rgba(0,0,0,0.3), -10px 0 30px rgba(0,0,0,0.4)'
                  : 'inset 5px 0 15px rgba(0,0,0,0.1)',
                transition: 'box-shadow 0.5s ease',
              }}
            >
              {/* Page curl on back */}
              <motion.div
                className="absolute top-0 left-0 w-12 h-12 pointer-events-none"
                style={{
                  background: 'linear-gradient(225deg, transparent 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.1) 100%)',
                  clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                }}
                animate={{
                  opacity: isFlipping ? 0.8 : 0.3,
                }}
              />
              
              {/* Paper fold shadow on back */}
              <motion.div
                className="absolute inset-y-0 right-0 w-2 pointer-events-none"
                style={{
                  background: 'linear-gradient(270deg, rgba(0,0,0,0.15) 0%, transparent 100%)',
                }}
                animate={{
                  opacity: isFlipping ? 1 : 0.3,
                  width: isFlipping ? '8px' : '2px',
                }}
                transition={{ duration: 0.5 }}
              />

              {/* Enhanced paper texture */}
              <div className="absolute inset-0 opacity-10"
                   style={{
                     backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
                     mixBlendMode: 'multiply',
                   }}
              />

              {/* Vertical fiber lines */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                {[...Array(30)].map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute top-0 bottom-0 w-px bg-gray-400"
                    style={{ left: `${i * 3.33}%` }}
                  />
                ))}
              </div>

              {/* Back page preview (Logo on flip verso) */}
              <div className="relative h-full flex flex-col items-center justify-center p-8 gap-6 scale-x-[-1]">
                <BookLogo label={t('alLamiSoft', currentLanguage.code)} />
              </div>

              {/* Page lines */}
              <div className="absolute inset-0 pointer-events-none scale-x-[-1]">
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute left-8 right-8 h-px bg-blue-200/30"
                    style={{ top: `${30 + i * 17}px` }}
                  />
                ))}
              </div>

              {/* Page number */}
              <div className="absolute bottom-4 left-8 text-xs text-gray-400 scale-x-[-1]">
                {nextLeftPageIndex + 1}
              </div>
              
              {/* Bottom left corner curl on back */}
              <motion.div
                className="absolute bottom-0 left-0 w-16 h-16 pointer-events-none"
                style={{
                  background: 'linear-gradient(315deg, transparent 0%, rgba(0,0,0,0.03) 50%, rgba(0,0,0,0.08) 100%)',
                  clipPath: 'polygon(0 100%, 100% 100%, 0 0)',
                }}
                animate={{
                  opacity: isFlipping ? 0.5 : 0.2,
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* Page flip indicator dots */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {[...Array(Math.min(features.length, 10))].map((_, i) => {
            const isActive = i === (currentPage % 10)
            return (
              <motion.div
                key={i}
                className="rounded-full"
                style={{
                  width: isActive ? 10 : 6,
                  height: isActive ? 10 : 6,
                  background: isActive ? rightFeature.color : '#ccc',
                }}
                animate={isActive ? {
                  scale: [1, 1.3, 1],
                } : {}}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
