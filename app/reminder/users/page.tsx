"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Users as UsersIcon, Plus, Trash2, Search, Edit, Save } from "lucide-react"
import { toast } from "sonner"
import { useReminderAuth } from "@/contexts/reminder-auth-context"

interface User {
  id: string
  username: string
  full_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

function getReminderSessionToken(): string {
  if (typeof window === "undefined") return ""
  return (
    localStorage.getItem("reminder_session_token") ||
    sessionStorage.getItem("reminder_session_token") ||
    ""
  )
}

function toDateOnly(value: string): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toISOString().split("T")[0]
}

export default function ReminderUsersPage() {
  const { user: currentUser } = useReminderAuth()

  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // New user form
  const [newFullName, setNewFullName] = useState("")
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [editPassword, setEditPassword] = useState("")

  useEffect(() => {
    void loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apiFetch = async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const sessionToken = getReminderSessionToken()
    const res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        "Content-Type": "application/json",
        "x-reminder-session-token": sessionToken,
      },
    })

    const data = (await res.json().catch(() => ({}))) as T & { error?: string; details?: string }
    if (!res.ok) {
      const msg = (data as { error?: string; details?: string } | null)?.error ||
        (data as { error?: string; details?: string } | null)?.details ||
        "حدث خطأ غير معروف"
      throw new Error(String(msg))
    }
    return data as T
  }

  async function loadUsers() {
    try {
      setIsLoading(true)
      const data = await apiFetch<{ success: boolean; users: User[] }>("/api/reminder-users", {
        method: "GET",
      })
      setUsers(Array.isArray(data.users) ? data.users : [])
      setSelectedUsers([])
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : "فشل جلب المستخدمين")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map((u) => u.id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId])
    } else {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId))
    }
  }

  const handleAddUser = async () => {
    if (!newFullName.trim() || !newUsername.trim() || !newPassword) {
      toast.error("يرجى ملء جميع الحقول")
      return
    }

    try {
      setIsLoading(true)
      const data = await apiFetch<{ success: boolean; user: User }>("/api/reminder-users", {
        method: "POST",
        body: JSON.stringify({
          full_name: newFullName,
          username: newUsername,
          password: newPassword,
          is_active: true,
        }),
      })

      setUsers([data.user, ...users])
      setNewFullName("")
      setNewUsername("")
      setNewPassword("")
      setIsAddDialogOpen(false)
      toast.success("تمت إضافة المستخدم بنجاح")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل إضافة المستخدم")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditUser = async () => {
    if (!editingUser) return

    try {
      setIsLoading(true)
      const payload: { full_name: string; username: string; password?: string } = {
        full_name: editingUser.full_name,
        username: editingUser.username,
      }
      if (editPassword.trim().length > 0) payload.password = editPassword

      const data = await apiFetch<{ success: boolean; user: User }>(
        `/api/reminder-users/${editingUser.id}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      )

      setUsers(users.map(u => (u.id === data.user.id ? data.user : u)))
      setEditingUser(null)
      setEditPassword("")
      setIsEditDialogOpen(false)
      toast.success("تم تحديث المستخدم بنجاح")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل تحديث المستخدم")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (currentUser?.id && userId === currentUser.id) {
      toast.error("لا يمكنك حذف حسابك الحالي")
      return
    }

    try {
      setIsLoading(true)
      await apiFetch<{ success: boolean }>(`/api/reminder-users/${userId}`, {
        method: "DELETE",
      })
      setUsers(users.filter((u) => u.id !== userId))
      setSelectedUsers(selectedUsers.filter((id) => id !== userId))
      toast.success("تم حذف المستخدم بنجاح")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل حذف المستخدم")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedUsers.length === 0) {
      toast.error("يرجى اختيار مستخدمين للحذف")
      return
    }

    if (currentUser?.id && selectedUsers.includes(currentUser.id)) {
      toast.error("لا يمكنك حذف حسابك الحالي")
      return
    }

    try {
      setIsLoading(true)
      const idsToDelete = [...selectedUsers]
      const results = await Promise.all(
        idsToDelete.map(async (id) => {
          try {
            await apiFetch<{ success: boolean }>(`/api/reminder-users/${id}`, {
              method: "DELETE",
            })
            return { id, success: true as const }
          } catch (e) {
            return { id, success: false as const, error: e instanceof Error ? e.message : String(e) }
          }
        })
      )

      const okCount = results.filter(r => r.success).length
      const failCount = results.length - okCount

      if (okCount > 0) {
        setUsers(users.filter((u) => !idsToDelete.includes(u.id)))
        setSelectedUsers([])
      }

      if (failCount === 0) {
        toast.success(`تم حذف ${okCount} مستخدم`)
      } else {
        toast.error(`تم حذف ${okCount} مستخدم، وفشل ${failCount}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const openEditDialog = (user: User) => {
    setEditingUser({ ...user })
    setEditPassword("")
    setIsEditDialogOpen(true)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <UsersIcon className="h-8 w-8" style={{ color: "var(--theme-primary)" }} />
          إدارة المستخدمين
        </h1>
        <p className="text-muted-foreground mt-2">إضافة وحذف وتعديل مستخدمي نظام التذكير</p>
      </motion.div>

      {/* Actions Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-3"
      >
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={isLoading}>
              <Plus className="h-4 w-4" />
              إضافة مستخدم
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة مستخدم جديد</DialogTitle>
              <DialogDescription>أدخل بيانات المستخدم الجديد</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="newFullName">الاسم الكامل</Label>
                <Input
                  id="newFullName"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="أدخل الاسم الكامل"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newUsername">اسم المستخدم</Label>
                <Input
                  id="newUsername"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="text-right"
                />
              </div>
              <Button onClick={handleAddUser} className="w-full gap-2" disabled={isLoading}>
                <Save className="h-4 w-4" />
                حفظ
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="destructive" onClick={handleDeleteSelected} className="gap-2" disabled={isLoading}>
          <Trash2 className="h-4 w-4" />
          حذف المحدد ({selectedUsers.length})
        </Button>
      </motion.div>

      {/* Search Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث عن مستخدم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 text-right"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={
                        filteredUsers.length > 0 &&
                        selectedUsers.length === filteredUsers.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-right">عداد</TableHead>
                  <TableHead className="text-right">الاسم الكامل</TableHead>
                  <TableHead className="text-right">اسم المستخدم</TableHead>
                  <TableHead className="text-right">كلمة المرور</TableHead>
                  <TableHead className="text-right">تاريخ الإضافة</TableHead>
                  <TableHead className="text-right">تاريخ آخر تعديل</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      لا توجد نتائج
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) =>
                            handleSelectUser(user.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell className="font-mono">••••••••</TableCell>
                      <TableCell>{toDateOnly(user.created_at)}</TableCell>
                      <TableCell>{toDateOnly(user.updated_at)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                            className="h-8 w-8 p-0"
                            disabled={isLoading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل المستخدم</DialogTitle>
            <DialogDescription>تحديث بيانات المستخدم</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="editFullName">الاسم الكامل</Label>
                <Input
                  id="editFullName"
                  value={editingUser.full_name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, full_name: e.target.value })
                  }
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editUsername">اسم المستخدم</Label>
                <Input
                  id="editUsername"
                  value={editingUser.username}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, username: e.target.value })
                  }
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPassword">كلمة المرور الجديدة (اختياري)</Label>
                <Input
                  id="editPassword"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="اترك فارغاً للإبقاء على القديمة"
                  className="text-right"
                />
              </div>
              <Button onClick={handleEditUser} className="w-full gap-2" disabled={isLoading}>
                <Save className="h-4 w-4" />
                حفظ التعديلات
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
