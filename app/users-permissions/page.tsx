"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Edit,
  Trash2,
  Printer,
  FileText,
  Search,
  X,
  RefreshCw,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { getUsersWithPermissions, deleteUser, deleteUsers, type UserWithPermissions } from "@/lib/users-operations"
import { toast } from "sonner"

export default function UsersPermissionsPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserWithPermissions[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      setIsLoading(true)
      const data = await getUsersWithPermissions()
      setUsers(data)
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء تحميل البيانات")
    } finally {
      setIsLoading(false)
    }
  }

  // Filter users based on search
  const filteredUsers = users.filter((user) =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.address?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle select all
  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id))
    }
  }

  // Handle individual selection
  const handleSelectUser = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter((uId) => uId !== id))
    } else {
      setSelectedUsers([...selectedUsers, id])
    }
  }

  // Handle refresh
  const handleRefresh = () => {
    loadUsers()
    toast.success("تم تحديث البيانات")
  }

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery("")
  }

  // Handle delete single user
  const handleDeleteClick = (id: string) => {
    setUserToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return

    try {
      await deleteUser(userToDelete)
      toast.success("تم حذف المستخدم بنجاح")
      setDeleteConfirmOpen(false)
      setUserToDelete(null)
      loadUsers()
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء الحذف")
    }
  }

  // Handle delete multiple users
  const handleDeleteSelected = async () => {
    if (selectedUsers.length === 0) {
      toast.error("يرجى تحديد مستخدمين للحذف")
      return
    }

    try {
      await deleteUsers(selectedUsers)
      toast.success("تم حذف " + selectedUsers.length + " مستخدم بنجاح")
      setSelectedUsers([])
      loadUsers()
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء الحذف")
    }
  }

  // Toggle password visibility
  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }))
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  // Get permission badge color
  const getPermissionColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "مدير":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "محاسب":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "مستخدم":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <Card className="p-6">
            <p className="text-center text-muted-foreground">جاري التحميل...</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with back button */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            title="رجوع"
            className="shrink-0"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
              المستخدمين والصلاحيات
            </h1>
            <p className="text-muted-foreground mt-1">
              إدارة المستخدمين وصلاحيات النظام
            </p>
          </div>
        </div>

        <Card className="p-6">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Link href="/users-permissions/add">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة
              </Button>
            </Link>
            <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
          </div>

          {/* File button, search, and clear */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Button variant="secondary" className="gap-2">
              <FileText className="h-4 w-4" />
              الملف
            </Button>
            <div className="flex-1 flex gap-2" style={{ minWidth: "300px" }}>
              <div className="relative flex-1">
                <Search className="absolute right-3 top-[50%] -translate-y-[50%] h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="ابحث عن مستخدم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleClearSearch}
                title="تنظيف"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-center w-[60px]">#</TableHead>
                  <TableHead className="text-center w-[50px]">
                    <Checkbox
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-right">الاسم الكامل</TableHead>
                  <TableHead className="text-right">رقم الهاتف</TableHead>
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-center">العمر</TableHead>
                  <TableHead className="text-center">نوع الصلاحية</TableHead>
                  <TableHead className="text-right">اسم المستخدم</TableHead>
                  <TableHead className="text-right">كلمة المرور</TableHead>
                  <TableHead className="text-right">تاريخ الإضافة</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                      لا توجد بيانات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user, index) => (
                    <TableRow
                      key={user.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="text-center font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => handleSelectUser(user.id)}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {user.full_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.phone_number || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.address || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.age || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getPermissionColor(user.permission_type)}>
                          {user.permission_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {user.username}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {showPasswords[user.id] ? user.password : "••••••••"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => togglePasswordVisibility(user.id)}
                          >
                            {showPasswords[user.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/users-permissions/edit/${user.id}`)}
                            title="تعديل"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(user.id)}
                            title="حذف"
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
          </div>

          {/* Footer with total and refresh */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              إجمالي المستخدمين: <span className="font-bold">{filteredUsers.length}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
              تحديث
            </Button>
          </div>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد الحذف</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                إلغاء
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                حذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
