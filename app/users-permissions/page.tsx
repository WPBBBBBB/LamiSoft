"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
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
import { PermissionGuard } from "@/components/permission-guard"

export default function UsersPermissionsPage() {
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const lang = currentLanguage.code
  const [users, setUsers] = useState<UserWithPermissions[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      setIsLoading(true)
      const data = await getUsersWithPermissions()
      setUsers(data)
    } catch (error) {
      toast.error(t('errorLoadingData', lang))
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUsers = users.filter((user) =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.address?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id))
    }
  }

  const handleSelectUser = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter((uId) => uId !== id))
    } else {
      setSelectedUsers([...selectedUsers, id])
    }
  }

  const handleRefresh = () => {
    loadUsers()
    toast.success(t('dataRefreshed', lang))
  }

  const handleClearSearch = () => {
    setSearchQuery("")
  }

  const handleDeleteClick = (id: string) => {
    setUserToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return

    try {
      await deleteUser(userToDelete)
      toast.success(t('userDeletedSuccess', currentLanguage.code))
      setDeleteConfirmOpen(false)
      setUserToDelete(null)
      loadUsers()
    } catch (error) {
      toast.error(t('deleteErrorOccurred', lang))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedUsers.length === 0) {
      toast.error(t('selectUsersToDelete', lang))
      return
    }

    try {
      await deleteUsers(selectedUsers)
      toast.success(t('usersDeletedSuccess', lang).replace('{count}', String(selectedUsers.length)))
      setSelectedUsers([])
      loadUsers()
    } catch (error) {
      toast.error(t('deleteErrorOccurred', lang))
    }
  }

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

  const getPermissionLabel = (type: string) => {
    switch (type) {
      case "مدير":
        return t('roleManager', lang)
      case "محاسب":
        return t('roleAccountant', lang)
      case "موظف":
        return t('roleEmployee', lang)
      case "مستخدم":
        return t('user', lang)
      default:
        return type
    }
  }

  const handleExportReport = async (autoPrint: boolean = false) => {
    if (selectedUsers.length === 0) {
      toast.error(t('selectUsersToPrint', lang))
      return
    }

    try {
      toast.loading(t('preparingReport', lang))
      
      const userRes = await fetch("/api/auth/user").catch(() => null)
      const userData = userRes ? await userRes.json().catch(() => null) : null
      const user = userData?.data?.user
      const generatedBy = user?.user_metadata?.full_name || user?.email || t('unknownUser', lang)

      const usersToReport = users.filter(u => selectedUsers.includes(u.id))
      
      if (usersToReport.length === 0) {
        toast.dismiss()
        toast.error(t('noSelectedUsersDataFound', lang))
        return
      }

      const reportItems = usersToReport.map(u => ({
          id: u.id,
          full_name: u.full_name,
          username: u.username,
          phone_number: u.phone_number || "",
          address: u.address || "",
          age: u.age || 0,
          permission_type: u.permission_type,
          created_at: u.created_at
      }))

      const payload = {
        generatedBy,
        date: new Date().toISOString(),
        items: reportItems,
        count: reportItems.length
      }

      const jsonString = JSON.stringify(payload)
      const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const storageKey = `usersReportPayload:${token}`
      localStorage.setItem(storageKey, jsonString)

      toast.dismiss()
      toast.success(autoPrint ? t('openingPrintWindow', lang) : t('reportPrepared', lang))

      window.location.href = `/report/users?token=${token}&back=/users-permissions${autoPrint ? '&print=true' : ''}`
      
    } catch (error) {
      console.error("Error exporting report:", error)
      toast.dismiss()
      toast.error(t('unexpectedError', lang))
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <Card className="p-6">
            <p className="text-center text-muted-foreground">{t('loading', lang)}</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard requiredRole="مدير">
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        {}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            title={t('back', lang)}
            className="shrink-0"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold" style={{ color: "var(--theme-primary)" }}>
              {t('usersAndPermissions', currentLanguage.code)}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('manageUsersPermissions', currentLanguage.code)}
            </p>
          </div>
        </div>

        <Card className="p-6">
          {}
          <div className="flex flex-wrap gap-3 mb-6">
            <Link href="/users-permissions/add">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('add', lang)}
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="gap-2"
              disabled={selectedUsers.length === 0}
              onClick={() => handleExportReport(true)}
            >
              <Printer className="h-4 w-4" />
              {t('print', lang)}
            </Button>
          </div>

          {}
          <div className="flex flex-wrap gap-3 mb-4">
            <Button 
              variant="secondary" 
              className="gap-2"
              disabled={selectedUsers.length === 0}
              onClick={() => handleExportReport(false)}
            >
              <FileText className="h-4 w-4" />
              {t('file', lang)}
            </Button>
            <div className="flex-1 flex gap-2" style={{ minWidth: "300px" }}>
              <div className="relative flex-1">
                <Search className="absolute right-3 top-[50%] -translate-y-[50%] h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('searchUser', currentLanguage.code)}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleClearSearch}
                title={t('cleanSearch', lang)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {}
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
                  <TableHead className="text-right">{t('fullName', lang)}</TableHead>
                  <TableHead className="text-right">{t('phoneNumber', lang)}</TableHead>
                  <TableHead className="text-right">{t('address', lang)}</TableHead>
                  <TableHead className="text-center">{t('age', lang)}</TableHead>
                  <TableHead className="text-center">{t('permissionType', lang)}</TableHead>
                  <TableHead className="text-right">{t('createdAt', lang)}</TableHead>
                  <TableHead className="text-center">{t('actions', lang)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {t('noData', lang)}
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
                          {getPermissionLabel(user.permission_type)}
                        </Badge>
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
                            title={t('edit', lang)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(user.id)}
                            title={t('delete', lang)}
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

          {}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t('totalUsersCount', lang)}: <span className="font-bold">{filteredUsers.length}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
              {t('refresh', lang)}
            </Button>
          </div>
        </Card>

        {}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('confirmDeleteTitle', lang)}</DialogTitle>
              <DialogDescription>
                {t('confirmDeleteUser', lang)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                {t('cancel', lang)}
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                {t('delete', lang)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </PermissionGuard>
  )
}
