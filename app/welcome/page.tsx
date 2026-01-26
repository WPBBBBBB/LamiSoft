"use client"
import { useRef, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, useScroll, useTransform, useInView } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, CheckCircle, BarChart3, ShoppingCart, Package, Bell, Users, Shield, Sparkles, Send, Instagram, Phone } from "lucide-react"
import Book3D from "@/components/welcome/Book3D"
import ScrollReveal from "@/components/welcome/ScrollReveal"
import Logo from "@/components/welcome/Logo"
import SettingsMenu from "@/components/welcome/SettingsMenu"
import ChatBot from "@/components/welcome/ChatBot"
import { useSettings } from "@/components/providers/settings-provider"
import { t } from "@/lib/translations"

export default function WelcomePage() {
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const featuresRef = useRef<HTMLDivElement | null>(null)
  const servicesRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })
  
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [1, 0.8, 0.6, 0.4])

  const scrollTo = (el?: HTMLElement | null) => {
    el?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Scroll Progress Indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 z-50 origin-left"
        style={{ 
          scaleX: scrollYProgress,
          background: "var(--theme-primary)"
        }}
      />
      
      {/* Animated Background Gradient */}
      <motion.div
        className="fixed inset-0 -z-10 opacity-30 pointer-events-none"
        style={{ y: backgroundY }}
      >
        <div className="absolute inset-0 bg-linear-to-b from-primary/10 via-transparent to-primary/5" />
      </motion.div>
      <motion.header 
        className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Logo className="scale-75" />
            <Separator orientation="vertical" className="h-6" />
            <Badge variant="secondary" className="text-xs">{t('alLamiSoft', currentLanguage.code)}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => scrollTo(featuresRef.current)}>
              {t('features', currentLanguage.code)}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => scrollTo(servicesRef.current)}>
              {t('services', currentLanguage.code)}
            </Button>
            <Button onClick={() => router.push("/login")} className="gap-2">
              {t('login', currentLanguage.code)}
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <SettingsMenu />
          </div>
        </div>
      </motion.header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 lg:py-24 relative">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <motion.div 
              className="space-y-6 relative z-10"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.h1 
                className="text-4xl font-bold tracking-tight lg:text-6xl" 
                style={{ color: "var(--theme-primary)" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                {t('welcomeTitle', currentLanguage.code)}
              </motion.h1>
              
              <motion.p 
                className="text-lg text-muted-foreground leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                {t('welcomeSubtitle', currentLanguage.code)}
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                <Button size="lg" onClick={() => router.push("/login")} className="gap-2 group">
                  {t('startNow', currentLanguage.code)}
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => scrollTo(featuresRef.current)} className="gap-2">
                  {t('learnMore', currentLanguage.code)}
                </Button>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="pt-2"
              >
                <Button 
                  size="lg" 
                  variant="secondary" 
                  onClick={() => router.push("/reminder-login")} 
                  className="gap-2 w-full sm:w-auto group"
                >
                  <Bell className="h-4 w-4 transition-transform group-hover:rotate-12" />
                  {t('autoReminderStart', currentLanguage.code)}
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
              className="relative"
            >
              <Card className="p-6 backdrop-blur-sm bg-card/50 overflow-hidden relative">
                <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-primary/5" />
                <Book3D className="w-full relative z-10" />
                <motion.div 
                  className="text-center space-y-2 mt-4 relative z-10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                >
                  <p className="text-xl font-semibold">{t('professionalManagementSystem', currentLanguage.code)}</p>
                  <p className="text-sm text-muted-foreground">{t('forPOSAndPurchases', currentLanguage.code)}</p>
                </motion.div>
              </Card>
            </motion.div>
          </div>
          
          {/* Floating Elements */}
          <motion.div
            className="absolute top-20 right-10 w-20 h-20 rounded-full blur-3xl opacity-30"
            style={{ background: "var(--theme-primary)" }}
            animate={{
              y: [0, -20, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-20 left-10 w-32 h-32 rounded-full blur-3xl opacity-20"
            style={{ background: "var(--theme-primary)" }}
            animate={{
              y: [0, 20, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
        </section>

        {/* Features Section */}
        <section ref={featuresRef} className="container mx-auto px-4 py-16 bg-muted/50 relative overflow-hidden">
          {/* Background Decorations */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          
          <ScrollReveal>
            <div className="text-center mb-12 relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Badge className="mb-4" variant="secondary">{t('advancedFeatures', currentLanguage.code)}</Badge>
              </motion.div>
              <h2 className="text-3xl font-bold mb-4">{t('systemFeatures', currentLanguage.code)}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('systemFeaturesDesc', currentLanguage.code)}
              </p>
            </div>
          </ScrollReveal>
          
          <div className="grid md:grid-cols-3 gap-6 relative z-10">
            {[
              { icon: CheckCircle, titleKey: "offlineFirst", descKey: "offlineFirstDesc", delay: 0 },
              { icon: BarChart3, titleKey: "advancedReports", descKey: "advancedReportsDesc", delay: 0.1 },
              { icon: Shield, titleKey: "permissionsControl", descKey: "permissionsControlDesc", delay: 0.2 },
            ].map((feature, idx) => {
              const Icon = feature.icon
              return (
                <ScrollReveal key={idx} delay={feature.delay} direction="up">
                  <motion.div
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="h-full backdrop-blur-sm bg-card/80 border-2 hover:border-primary/50 transition-colors">
                      <CardHeader>
                        <motion.div 
                          className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <Icon className="h-6 w-6" style={{ color: "var(--theme-primary)" }} />
                        </motion.div>
                        <CardTitle>{t(feature.titleKey, currentLanguage.code)}</CardTitle>
                        <CardDescription>{t(feature.descKey, currentLanguage.code)}</CardDescription>
                      </CardHeader>
                    </Card>
                  </motion.div>
                </ScrollReveal>
              )
            })}
          </div>
        </section>

        {/* Services Section */}
        <section ref={servicesRef} className="container mx-auto px-4 py-16 relative">
          <ScrollReveal>
            <div className="text-center mb-12">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                whileInView={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, type: "spring" }}
                viewport={{ once: true }}
              >
                <Badge className="mb-4" variant="outline">{t('integratedServices', currentLanguage.code)}</Badge>
              </motion.div>
              <h2 className="text-3xl font-bold mb-4">{t('availableServices', currentLanguage.code)}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('availableServicesDesc', currentLanguage.code)}
              </p>
            </div>
          </ScrollReveal>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: ShoppingCart, titleKey: "pointOfSale", descKey: "pointOfSaleDesc", delay: 0 },
              { icon: Package, titleKey: "inventoryManagement", descKey: "inventoryManagementDesc", delay: 0.1 },
              { icon: BarChart3, titleKey: "reportsService", descKey: "reportsServiceDesc", delay: 0.2 },
              { icon: Bell, titleKey: "notificationsService", descKey: "notificationsServiceDesc", delay: 0.3 },
            ].map((service, idx) => {
              const Icon = service.icon
              return (
                <ScrollReveal key={idx} delay={service.delay} direction="up">
                  <motion.div
                    whileHover={{ 
                      y: -10,
                      transition: { duration: 0.3 }
                    }}
                  >
                    <Card className="h-full group hover:shadow-xl transition-all duration-300 backdrop-blur-sm bg-card/80">
                      <CardHeader>
                        <motion.div
                          className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <Icon className="h-6 w-6" style={{ color: "var(--theme-primary)" }} />
                        </motion.div>
                        <CardTitle className="text-lg">{t(service.titleKey, currentLanguage.code)}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{t(service.descKey, currentLanguage.code)}</CardDescription>
                      </CardContent>
                    </Card>
                  </motion.div>
                </ScrollReveal>
              )
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16">
          <ScrollReveal>
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 overflow-hidden relative" style={{ borderColor: "var(--theme-primary)" }}>
                {/* Animated Background */}
                <motion.div
                  className="absolute inset-0 opacity-10"
                  style={{ background: "var(--theme-primary)" }}
                  animate={{
                    backgroundPosition: ["0% 0%", "100% 100%"],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                />
                
                <CardHeader className="text-center pb-4 relative z-10">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                  >
                    <CardTitle className="text-2xl mb-2">{t('readyToTry', currentLanguage.code)}</CardTitle>
                    <CardDescription className="text-base">
                      {t('readyToTryDesc', currentLanguage.code)}
                    </CardDescription>
                  </motion.div>
                </CardHeader>
                <CardContent className="flex justify-center gap-4 relative z-10">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button size="lg" onClick={() => router.push("/login")} className="gap-2 group">
                      {t('login', currentLanguage.code)}
                      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button size="lg" variant="outline" onClick={() => scrollTo(featuresRef.current)}>
                      {t('moreInfo', currentLanguage.code)}
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </ScrollReveal>
        </section>

        {/* Footer */}
        <footer className="border-t py-8 bg-muted/30">
          <div className="w-full px-4 md:px-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-end">
              {/* Left spacer (desktop) */}
              <div className="hidden md:block" />

              {/* Copyright - Center */}
              <motion.div 
                className="text-center md:justify-self-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <p className="text-sm text-muted-foreground">
                  © 2026 {t('alLamiSoft', currentLanguage.code)}. {t('allRightsReserved', currentLanguage.code)}.
                </p>
              </motion.div>

              {/* Developer/Contact - Far Right */}
              <motion.div 
                className="text-right space-y-3 justify-self-end"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--theme-primary)" }}>
                  {t('developedBy', currentLanguage.code)}
                </p>
                
                <a 
                  href="tel:07849704946"
                  className="flex items-center justify-end gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">{t('phoneNumber', currentLanguage.code)}: 07849704946</span>
                  <Phone className="h-4 w-4" />
                </a>
                
                <div className="flex items-center justify-end gap-3">
                  <motion.a
                    href="https://t.me/WIIBI"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 rounded-full flex items-center justify-center bg-primary/10 hover:bg-primary/20 transition-colors"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    title="تلغرام"
                  >
                    <Send className="h-4 w-4" style={{ color: "var(--theme-primary)" }} />
                  </motion.a>
                  <motion.a
                    href="https://www.instagram.com/pr_mhdi/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 rounded-full flex items-center justify-center bg-primary/10 hover:bg-primary/20 transition-colors"
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    whileTap={{ scale: 0.95 }}
                    title={t('instagram', currentLanguage.code)}
                  >
                    <Instagram className="h-4 w-4" style={{ color: "var(--theme-primary)" }} />
                  </motion.a>
                  <span className="text-xs text-muted-foreground">{t('contactMe', currentLanguage.code)}</span>
                </div>
              </motion.div>
            </div>
          </div>
        </footer>
      </main>
      
      {/* AI Chatbot */}
      <ChatBot />
    </div>
  )
}
