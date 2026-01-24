"use client"
import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"

const features = [
  "نظام نقطة بيع سريع وسهل الاستخدام",
  "دعم أنواع الأسعار (جملة ومفرد)",
  "إمكانية البيع النقدي والآجل",
  "دعم البيع بالدينار العراقي والدولار الأمريكي",
  "نظام خصومات مرن على الفواتير",
  "طباعة فواتير البيع بتصميم احترافي",
  "إمكانية إلغاء وتعديل المبيعات",
  "ربط المبيعات بحسابات العملاء تلقائياً",
  "توليد باركود تلقائي لكل فاتورة بيع",
  "تسجيل المشتريات من الموردين",
  "تصنيف المشتريات (محلي، استيراد، إعادة)",
  "دعم الدفع النقدي والآجل للمشتريات",
  "ربط المشتريات بحسابات الموردين",
  "إضافة المنتجات للمخزون تلقائياً عند الشراء",
  "إدارة مخازن متعددة بتفاصيل كاملة",
  "نظام جرد دوري شامل للمخازن",
  "نقل البضائع بين المخازن",
  "تنبيهات نقص المخزون التلقائية",
  "متابعة الكميات والأسعار لكل منتج",
  "دعم وحدات قياس متعددة (كارتون، قطعة، لتر، كغم)",
  "نظام قبض وصرف للعملاء والموردين",
  "إدارة الحسابات الآجلة (الديون)",
  "دعم العمليات بالدينار العراقي والدولار",
  "تحديث سعر الصرف ديناميكياً",
  "تسجيل جميع الحركات المالية",
  "تقارير شاملة للمبيعات والمشتريات",
  "تقارير الأرباح والخسائر",
  "تقارير حسابات العملاء والموردين",
  "تقارير حركة المخزون والنقل بين المخازن",
  "إحصائيات مرئية على الشاشة الرئيسية",
  "نظام صلاحيات مرن (مدير، محاسب، موظف)",
  "تحكم دقيق في صلاحيات كل مستخدم",
  "سجل كامل لنشاطات المستخدمين (System Log)",
  "تسجيل الدخول بأمان مع تشفير كلمات المرور",
  "دعم تسجيل الدخول بـ Google, Microsoft, GitHub",
  "إرسال تنبيهات للعملاء عبر واتساب تلقائياً",
  "إدارة رسائل التذكير للديون المستحقة",
  "مراقبة حالة الرسائل المرسلة",
  "أكثر من 15 ثيم (سمة) مختلفة",
  "دعم الوضع الليلي والنهاري",
  "تخصيص الخطوط (10+ خطوط عربية)",
  "إعدادات طباعة قابلة للتخصيص",
  "حفظ الإعدادات للمستخدم",
  "إشعارات فورية لنقص المخزون",
  "تنبيهات الديون المستحقة",
  "إشعارات الأنشطة المهمة",
  "لوحة إشعارات قابلة للتخصيص",
  "تشفير كلمات المرور بخوارزميات آمنة",
  "سجل كامل لجميع العمليات",
  "حماية من محاولات الاختراق",
  "نظام أمان متعدد الطبقات",
  "واجهة عربية كاملة سهلة الاستخدام",
  "تصميم عصري ومتجاوب مع جميع الأجهزة",
  "اختصارات لوحة المفاتيح للعمليات السريعة",
  "بحث ذكي وسريع في البيانات",
  "تنقل سلس بين الصفحات",
  "طباعة فواتير احترافية",
  "طباعة تقارير المخزون",
  "تصدير البيانات بصيغ متعددة",
  "باركود و QR Code للمنتجات والفواتير",
  "نسخ احتياطي للبيانات",
  "استيراد وتصدير البيانات",
  "تصفير النظام مع حفظ الإعدادات",
  "مزامنة تلقائية مع قاعدة البيانات",
]

export default function FeaturesStack({ className = "" }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % features.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const visibleFeatures = useMemo(() => {
    const visible = []
    for (let i = 0; i < 5; i++) {
      visible.push((currentIndex + i) % features.length)
    }
    return visible
  }, [currentIndex])

  return (
    <div className={`relative w-full h-[400px] flex items-center justify-center ${className}`}>
      {/* Background glow effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ background: "var(--theme-primary)" }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Features stack */}
      <div className="relative w-full max-w-2xl h-full flex flex-col items-center justify-center">
        <AnimatePresence mode="popLayout">
          {visibleFeatures.map((featureIndex, stackIndex) => {
            const isCenter = stackIndex === 2
            const opacity = isCenter ? 1 : 0.3 - stackIndex * 0.1
            const scale = isCenter ? 1 : 0.85 - stackIndex * 0.05
            const yOffset = (stackIndex - 2) * 60
            const blur = isCenter ? 0 : Math.abs(stackIndex - 2) * 2

            return (
              <motion.div
                key={`${featureIndex}-${stackIndex}`}
                className="absolute w-full px-8"
                initial={{
                  opacity: 0,
                  y: 300,
                  scale: 0.8,
                }}
                animate={{
                  opacity,
                  y: yOffset,
                  scale,
                  filter: `blur(${blur}px)`,
                }}
                exit={{
                  opacity: 0,
                  y: -300,
                  scale: 0.8,
                }}
                transition={{
                  duration: 0.5,
                  ease: "easeInOut",
                }}
              >
                <motion.div
                  className={`
                    p-6 rounded-xl border-2 text-center
                    ${isCenter 
                      ? 'bg-linear-to-br from-card via-card to-card/80 border-primary shadow-2xl' 
                      : 'bg-card/40 border-border/30'
                    }
                  `}
                  animate={isCenter ? {
                    boxShadow: [
                      "0 0 20px rgba(var(--theme-primary-rgb, 187, 134, 252), 0.3)",
                      "0 0 40px rgba(var(--theme-primary-rgb, 187, 134, 252), 0.5)",
                      "0 0 20px rgba(var(--theme-primary-rgb, 187, 134, 252), 0.3)",
                    ]
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <motion.div
                    className="flex items-center gap-3 justify-center"
                    animate={isCenter ? {
                      scale: [1, 1.02, 1],
                    } : {}}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ background: "var(--theme-primary)" }}
                      animate={isCenter ? {
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5],
                      } : {}}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    <p
                      className={`
                        font-semibold transition-all
                        ${isCenter ? 'text-lg md:text-xl' : 'text-sm md:text-base'}
                      `}
                      style={isCenter ? { color: "var(--theme-primary)" } : {}}
                    >
                      {features[featureIndex]}
                    </p>
                  </motion.div>
                </motion.div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
