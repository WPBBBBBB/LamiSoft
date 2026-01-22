"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Send, Users, Settings, MessageSquare, Image as ImageIcon, CheckCircle2, XCircle, Clock, TrendingUp, LayoutDashboard } from "lucide-react"
import { useRouter } from "next/navigation"
import { useReminderAuth } from "@/contexts/reminder-auth-context"

export default function ReminderDashboardPage() {
  const router = useRouter()
  const { user } = useReminderAuth()
  const [stats, setStats] = useState({
    totalSent: 0,
    successRate: 0,
    failed: 0,
    pending: 0,
    todaySent: 0,
    activeUsers: 0,
  })

  const [recentActivity, setRecentActivity] = useState<{ time: string; message: string; success: boolean }[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const sessionToken = localStorage.getItem("reminder_session_token") || sessionStorage.getItem("reminder_session_token")
        if (!sessionToken) return

        const resp = await fetch("/api/reminder-dashboard/stats", {
          method: "GET",
          headers: {
            "x-reminder-session-token": sessionToken,
          },
        })

        const data = await resp.json()
        if (!resp.ok) {
          console.error("Failed to load reminder dashboard stats:", data)
          return
        }

        const s = data?.stats || {}
        setStats({
          totalSent: Number(s.totalSent || 0),
          successRate: Number(s.successRate || 0),
          failed: Number(s.totalFailed || 0),
          pending: 0,
          todaySent: Number(s.todaySent || 0),
          activeUsers: Number(s.activeUsers || 0),
        })

        const ra = Array.isArray(data?.recentActivity) ? data.recentActivity : []
        setRecentActivity(
          ra.map((r: any) => {
            const createdAt = r?.created_at ? new Date(r.created_at) : null
            const time = createdAt ? createdAt.toLocaleString("ar-IQ") : ""
            const op = String(r?.operation || "")
            const phone = String(r?.phone || "")
            const ok = Boolean(r?.success)
            const err = r?.error_message ? String(r.error_message) : ""

            const typeLabel = op === "send_media" ? "صورة" : "رسالة"
            const message = ok
              ? `تم إرسال ${typeLabel} إلى ${phone}`
              : `فشل إرسال ${typeLabel} إلى ${phone}${err ? `: ${err}` : ""}`

            return { time, message, success: ok }
          })
        )
      } catch (e) {
        console.error("Error loading reminder dashboard stats:", e)
      }
    }

    load()
  }, [])

  const quickActions = [
    {
      icon: Send,
      title: "إرسال رسائل تذكير",
      description: "إرسال رسائل نصية للعملاء",
      color: "bg-blue-500",
      path: "/reminder/send",
    },
    {
      icon: ImageIcon,
      title: "حملة إعلانية",
      description: "إرسال صور ومواد تسويقية",
      color: "bg-purple-500",
      path: "/reminder/send",
    },
    {
      icon: Users,
      title: "إدارة المستخدمين",
      description: "إضافة وتعديل المستخدمين",
      color: "bg-green-500",
      path: "/reminder/users",
    },
    {
      icon: Settings,
      title: "الإعدادات",
      description: "تخصيص القوالب والإعدادات",
      color: "bg-orange-500",
      path: "/reminder/settings",
    },
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">مرحباً، {user?.full_name} 👋</h1>
          <p className="text-muted-foreground mt-1">
            نظرة عامة على نشاط نظام التذكير التلقائي
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("ar-IQ", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الرسائل المرسلة</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600">+{stats.todaySent}</span> اليوم
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">معدل النجاح</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${stats.successRate}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">الرسائل الفاشلة</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                من أصل {stats.totalSent} رسالة
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">المستخدمون النشطون</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                في النظام حالياً
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              إجراءات سريعة
            </CardTitle>
            <CardDescription>
              الوصول السريع للمهام الأكثر استخداماً
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, idx) => {
                const Icon = action.icon
                return (
                  <motion.div
                    key={action.title}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + idx * 0.1 }}
                  >
                    <Card
                      className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 group"
                      onClick={() => router.push(action.path)}
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center space-y-3">
                          <div className={`p-3 rounded-full ${action.color} group-hover:scale-110 transition-transform`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{action.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {action.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              النشاط الأخير
            </CardTitle>
            <CardDescription>
              آخر العمليات المنفذة في النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + idx * 0.1 }}
                  className="flex items-start gap-3 pb-4 border-b last:border-b-0 last:pb-0"
                >
                  <div className={`p-2 rounded-full ${activity.success ? "bg-green-100" : "bg-red-100"}`}>
                    {activity.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* CTA Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
      >
        <Card className="bg-linear-to-r from-primary/10 via-primary/5 to-background border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">جاهز للبدء؟</h3>
                <p className="text-sm text-muted-foreground">
                  قم بإرسال رسائل التذكير للعملاء الآن بضغطة زر واحدة
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => router.push("/reminder/send")}
                className="gap-2"
              >
                <Send className="h-5 w-5" />
                ابدأ الإرسال
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
