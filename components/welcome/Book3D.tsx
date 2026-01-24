"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  ShoppingCart, Package, BarChart3, Bell, Users, Shield, 
  CreditCard, Warehouse, TrendingUp, FileText, Settings, Smartphone,
  Lock, Eye, Download, Upload, Printer, Search, Zap, Globe,
  CheckCircle, AlertCircle, Calendar, DollarSign, Briefcase, Target,
  Award, Sparkles, Star, Heart, ThumbsUp, Cpu
} from "lucide-react"

interface Feature {
  text: string
  icon: any
  color: string
  gradient: string
}

const features: Feature[] = [
  { text: "نظام نقطة بيع سريع وسهل الاستخدام", icon: ShoppingCart, color: "#FF6B6B", gradient: "from-red-500 to-pink-500" },
  { text: "دعم أنواع الأسعار (جملة ومفرد)", icon: DollarSign, color: "#4ECDC4", gradient: "from-teal-500 to-cyan-500" },
  { text: "إمكانية البيع النقدي والآجل", icon: CreditCard, color: "#45B7D1", gradient: "from-blue-500 to-indigo-500" },
  { text: "دعم البيع بالدينار والدولار", icon: Globe, color: "#FFA07A", gradient: "from-orange-500 to-amber-500" },
  { text: "نظام خصومات مرن على الفواتير", icon: Target, color: "#98D8C8", gradient: "from-green-500 to-emerald-500" },
  { text: "طباعة فواتير بتصميم احترافي", icon: Printer, color: "#F7DC6F", gradient: "from-yellow-500 to-lime-500" },
  { text: "إلغاء وتعديل المبيعات", icon: Settings, color: "#BB8FCE", gradient: "from-purple-500 to-violet-500" },
  { text: "ربط المبيعات بحسابات العملاء", icon: Users, color: "#85C1E2", gradient: "from-sky-500 to-blue-500" },
  { text: "توليد باركود لكل فاتورة بيع", icon: Sparkles, color: "#F8B739", gradient: "from-amber-500 to-orange-500" },
  { text: "تسجيل المشتريات من الموردين", icon: Package, color: "#52BE80", gradient: "from-emerald-500 to-green-500" },
  { text: "تصنيف المشتريات (محلي، استيراد)", icon: Briefcase, color: "#5DADE2", gradient: "from-indigo-500 to-blue-500" },
  { text: "دعم الدفع للمشتريات", icon: CheckCircle, color: "#48C9B0", gradient: "from-teal-500 to-green-500" },
  { text: "ربط المشتريات بحسابات الموردين", icon: Users, color: "#AF7AC5", gradient: "from-violet-500 to-purple-500" },
  { text: "إضافة المنتجات للمخزون تلقائياً", icon: Zap, color: "#F39C12", gradient: "from-yellow-500 to-orange-500" },
  { text: "إدارة مخازن متعددة بتفاصيل كاملة", icon: Warehouse, color: "#3498DB", gradient: "from-blue-500 to-cyan-500" },
  { text: "نظام جرد دوري شامل للمخازن", icon: FileText, color: "#E74C3C", gradient: "from-red-500 to-rose-500" },
  { text: "نقل البضائع بين المخازن", icon: TrendingUp, color: "#1ABC9C", gradient: "from-green-500 to-teal-500" },
  { text: "تنبيهات نقص المخزون التلقائية", icon: Bell, color: "#E67E22", gradient: "from-orange-500 to-red-500" },
  { text: "متابعة الكميات والأسعار", icon: Eye, color: "#9B59B6", gradient: "from-purple-500 to-pink-500" },
  { text: "وحدات قياس متعددة", icon: Award, color: "#16A085", gradient: "from-teal-500 to-emerald-500" },
  { text: "نظام قبض وصرف", icon: CreditCard, color: "#2980B9", gradient: "from-blue-500 to-indigo-500" },
  { text: "إدارة الحسابات الآجلة", icon: Calendar, color: "#8E44AD", gradient: "from-violet-500 to-purple-500" },
  { text: "دعم العمليات بالعملتين", icon: DollarSign, color: "#27AE60", gradient: "from-green-500 to-lime-500" },
  { text: "تحديث سعر الصرف ديناميكياً", icon: TrendingUp, color: "#D35400", gradient: "from-orange-500 to-amber-500" },
  { text: "تسجيل جميع الحركات المالية", icon: FileText, color: "#C0392B", gradient: "from-red-500 to-orange-500" },
  { text: "تقارير شاملة للمبيعات", icon: BarChart3, color: "#2ECC71", gradient: "from-emerald-500 to-green-500" },
  { text: "تقارير الأرباح والخسائر", icon: TrendingUp, color: "#3498DB", gradient: "from-sky-500 to-blue-500" },
  { text: "تقارير حسابات العملاء", icon: Users, color: "#9B59B6", gradient: "from-purple-500 to-violet-500" },
  { text: "تقارير حركة المخزون", icon: Package, color: "#1ABC9C", gradient: "from-teal-500 to-cyan-500" },
  { text: "إحصائيات مرئية", icon: BarChart3, color: "#E74C3C", gradient: "from-rose-500 to-red-500" },
  { text: "نظام صلاحيات مرن", icon: Shield, color: "#34495E", gradient: "from-slate-500 to-gray-500" },
  { text: "تحكم دقيق في الصلاحيات", icon: Lock, color: "#E67E22", gradient: "from-orange-500 to-amber-500" },
  { text: "سجل كامل لنشاطات المستخدمين", icon: FileText, color: "#16A085", gradient: "from-green-500 to-teal-500" },
  { text: "تسجيل دخول آمن ومشفر", icon: Shield, color: "#2980B9", gradient: "from-blue-500 to-indigo-500" },
  { text: "دعم OAuth (Google, Microsoft, GitHub)", icon: Globe, color: "#8E44AD", gradient: "from-violet-500 to-purple-500" },
  { text: "إرسال تنبيهات واتساب تلقائياً", icon: Smartphone, color: "#25D366", gradient: "from-green-500 to-emerald-500" },
  { text: "إدارة رسائل التذكير", icon: Bell, color: "#27AE60", gradient: "from-emerald-500 to-teal-500" },
  { text: "مراقبة حالة الرسائل", icon: Eye, color: "#3498DB", gradient: "from-sky-500 to-blue-500" },
  { text: "أكثر من 15 ثيم مختلف", icon: Sparkles, color: "#9B59B6", gradient: "from-purple-500 to-pink-500" },
  { text: "دعم الوضع الليلي والنهاري", icon: Star, color: "#F39C12", gradient: "from-yellow-500 to-orange-500" },
  { text: "تخصيص الخطوط العربية", icon: FileText, color: "#1ABC9C", gradient: "from-teal-500 to-cyan-500" },
  { text: "إعدادات طباعة مخصصة", icon: Printer, color: "#E74C3C", gradient: "from-red-500 to-rose-500" },
  { text: "حفظ الإعدادات للمستخدم", icon: Download, color: "#2ECC71", gradient: "from-green-500 to-emerald-500" },
  { text: "إشعارات فورية لنقص المخزون", icon: AlertCircle, color: "#E67E22", gradient: "from-orange-500 to-red-500" },
  { text: "تنبيهات الديون المستحقة", icon: Bell, color: "#C0392B", gradient: "from-rose-500 to-red-500" },
  { text: "إشعارات الأنشطة المهمة", icon: Star, color: "#3498DB", gradient: "from-blue-500 to-indigo-500" },
  { text: "لوحة إشعارات مخصصة", icon: Settings, color: "#9B59B6", gradient: "from-violet-500 to-purple-500" },
  { text: "تشفير كلمات المرور", icon: Lock, color: "#34495E", gradient: "from-gray-500 to-slate-500" },
  { text: "سجل كامل للعمليات", icon: FileText, color: "#16A085", gradient: "from-teal-500 to-green-500" },
  { text: "حماية من محاولات الاختراق", icon: Shield, color: "#E74C3C", gradient: "from-red-500 to-rose-500" },
  { text: "نظام أمان متعدد الطبقات", icon: Cpu, color: "#2980B9", gradient: "from-indigo-500 to-blue-500" },
  { text: "واجهة عربية سهلة الاستخدام", icon: Globe, color: "#27AE60", gradient: "from-green-500 to-emerald-500" },
  { text: "تصميم متجاوب مع الأجهزة", icon: Smartphone, color: "#8E44AD", gradient: "from-purple-500 to-violet-500" },
  { text: "اختصارات لوحة المفاتيح", icon: Zap, color: "#F39C12", gradient: "from-yellow-500 to-orange-500" },
  { text: "بحث ذكي وسريع", icon: Search, color: "#3498DB", gradient: "from-sky-500 to-blue-500" },
  { text: "تنقل سلس بين الصفحات", icon: TrendingUp, color: "#1ABC9C", gradient: "from-teal-500 to-cyan-500" },
  { text: "طباعة فواتير احترافية", icon: Printer, color: "#E67E22", gradient: "from-orange-500 to-amber-500" },
  { text: "طباعة تقارير المخزون", icon: FileText, color: "#9B59B6", gradient: "from-purple-500 to-pink-500" },
  { text: "تصدير البيانات بصيغ متعددة", icon: Upload, color: "#2ECC71", gradient: "from-emerald-500 to-green-500" },
  { text: "باركود و QR Code", icon: Sparkles, color: "#E74C3C", gradient: "from-rose-500 to-red-500" },
  { text: "نسخ احتياطي للبيانات", icon: Download, color: "#3498DB", gradient: "from-blue-500 to-indigo-500" },
  { text: "استيراد وتصدير البيانات", icon: Upload, color: "#16A085", gradient: "from-green-500 to-teal-500" },
  { text: "تصفير النظام مع حفظ الإعدادات", icon: Settings, color: "#C0392B", gradient: "from-red-500 to-orange-500" },
  { text: "مزامنة تلقائية مع قاعدة البيانات", icon: Zap, color: "#27AE60", gradient: "from-emerald-500 to-lime-500" },
]

export default function Book3D({ className = "" }: { className?: string }) {
  const [currentPage, setCurrentPage] = useState(0)
  const [isFlipping, setIsFlipping] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isFlipping) {
        setIsFlipping(true)
        setTimeout(() => {
          setCurrentPage((prev) => (prev + 1) % features.length)
          setIsFlipping(false)
        }, 1000)
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [isFlipping])

  const currentFeature = features[currentPage]
  const nextFeature = features[(currentPage + 1) % features.length]
  const Icon = currentFeature.icon
  const NextIcon = nextFeature.icon

  return (
    <div className={`relative w-full h-[450px] flex items-center justify-center ${className}`}>
      {/* Book base shadow */}
      <div className="absolute w-[500px] h-8 bg-black/20 blur-3xl" style={{ bottom: '20px' }} />

      {/* Book container */}
      <div 
        className="relative w-[600px] h-[400px]"
        style={{
          perspective: '2000px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Book spine and back cover */}
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          {/* Back cover */}
          <div 
            className="absolute top-0 right-0 w-[300px] h-full rounded-r-lg"
            style={{
              background: 'linear-gradient(135deg, #8B4513 0%, #654321 100%)',
              transform: 'rotateY(0deg)',
              transformOrigin: 'left',
              boxShadow: 'inset -5px 0 10px rgba(0,0,0,0.3)',
            }}
          >
            {/* Book title on spine */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-200 font-bold text-sm opacity-70"
                 style={{ writingMode: 'vertical-rl' }}>
              AL-LamiSoft
            </div>
          </div>

          {/* Spine */}
          <div 
            className="absolute top-0 left-[300px] w-[20px] h-full"
            style={{
              background: 'linear-gradient(90deg, #654321 0%, #4a3214 50%, #654321 100%)',
              transform: 'rotateY(-90deg)',
              transformOrigin: 'left',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
            }}
          />

          {/* Front cover (left page - static) */}
          <div 
            className="absolute top-0 left-0 w-[300px] h-full rounded-l-lg overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #f5f5dc 0%, #e8e8d0 100%)',
              boxShadow: 'inset 5px 0 15px rgba(0,0,0,0.1), -5px 0 20px rgba(0,0,0,0.3)',
            }}
          >
            {/* Paper texture */}
            <div className="absolute inset-0 opacity-10"
                 style={{
                   backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
                 }}
            />

            {/* Left page content */}
            <div className="relative h-full flex flex-col items-center justify-center p-8 gap-6">
              <motion.div
                className={`bg-gradient-to-br ${nextFeature.gradient} p-6 rounded-2xl shadow-lg`}
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
                <NextIcon className="w-16 h-16 text-white" strokeWidth={2} />
              </motion.div>
              <p className="text-lg font-bold text-center leading-relaxed text-gray-800">
                {nextFeature.text}
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
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-400">
              {((currentPage + 1) * 2) - 1}
            </div>
          </div>

          {/* Right page (flipping page) */}
          <motion.div 
            className="absolute top-0 left-[300px] w-[300px] h-full origin-left"
            style={{
              transformStyle: 'preserve-3d',
            }}
            animate={{
              rotateY: isFlipping ? -180 : 0,
            }}
            transition={{
              duration: 1,
              ease: "easeInOut",
            }}
          >
            {/* Front of flipping page */}
            <div 
              className="absolute inset-0 rounded-r-lg overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
                boxShadow: 'inset -5px 0 15px rgba(0,0,0,0.1), 5px 0 20px rgba(0,0,0,0.2)',
              }}
            >
              {/* Paper texture */}
              <div className="absolute inset-0 opacity-10"
                   style={{
                     backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
                   }}
              />

              {/* Right page content */}
              <div className="relative h-full flex flex-col items-center justify-center p-8 gap-6">
                <motion.div
                  className={`bg-gradient-to-br ${currentFeature.gradient} p-6 rounded-2xl shadow-lg`}
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
                  <Icon className="w-16 h-16 text-white" strokeWidth={2} />
                </motion.div>
                <p className="text-lg font-bold text-center leading-relaxed text-gray-800">
                  {currentFeature.text}
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
                {(currentPage + 1) * 2}
              </div>
            </div>

            {/* Back of flipping page */}
            <div 
              className="absolute inset-0 rounded-r-lg overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: 'linear-gradient(135deg, #f5f5dc 0%, #e8e8d0 100%)',
                boxShadow: 'inset 5px 0 15px rgba(0,0,0,0.1)',
              }}
            >
              {/* Paper texture */}
              <div className="absolute inset-0 opacity-10"
                   style={{
                     backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
                   }}
              />

              {/* Back page preview (next feature) */}
              <div className="relative h-full flex flex-col items-center justify-center p-8 gap-6 scale-x-[-1]">
                <motion.div
                  className={`bg-gradient-to-br ${nextFeature.gradient} p-6 rounded-2xl shadow-lg`}
                >
                  <NextIcon className="w-16 h-16 text-white" strokeWidth={2} />
                </motion.div>
                <p className="text-lg font-bold text-center leading-relaxed text-gray-800">
                  {nextFeature.text}
                </p>
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
                {((currentPage + 2) * 2) - 1}
              </div>
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
                  background: isActive ? currentFeature.color : '#ccc',
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
