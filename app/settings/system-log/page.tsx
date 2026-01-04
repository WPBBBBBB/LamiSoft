"use client"

import { useState, useEffect } from "react"
import { PermissionGuard } from "@/components/permission-guard"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  Trash2,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { toast } from "sonner"
import {
  getSystemLogs,
  deleteSystemLogs,
  deleteAllSystemLogs,
  SystemLog,
} from "@/lib/system-log-operations"
import { supabase } from "@/lib/supabase"

export default function SystemLogPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [viewingDetails, setViewingDetails] = useState<string | null>(null)
  const [viewingOldValue, setViewingOldValue] = useState<string | null>(null)
  const [viewingUserName, setViewingUserName] = useState<string | null>(null)
  
  const pageSize = 30
  const totalPages = Math.ceil(totalCount / pageSize)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const { data, count } = await getSystemLogs(currentPage, pageSize, {
        search: searchQuery || undefined,
      })
      setLogs(data)
      setTotalCount(count)
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string }
      
      if (err?.message?.includes('relation "tb_systemlog" does not exist')) {
        toast.error("جدول السجلات غير موجود. الرجاء إنشاء الجدول في Supabase أولاً")
      } else if (err?.code === 'PGRST116') {
        toast.error("الجدول غير موجود. راجع ملف SYSTEM_LOG_SQL.sql")
      } else if (err?.message) {
        toast.error(`خطأ: ${err.message}`)
      } else {
        toast.error("فشل في تحميل السجلات. تأكد من إنشاء جدول tb_systemlog في Supabase")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchLogs()
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    setCurrentPage(1)
    setTimeout(() => {
      fetchLogs()
    }, 100)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(logs.map(log => log.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id])
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error("الرجاء تحديد سجل واحد على الأقل")
      return
    }

    try {
      await deleteSystemLogs(selectedIds)
      toast.success(`تم حذف ${selectedIds.length} سجل بنجاح`)
      setSelectedIds([])
      fetchLogs()
    } catch (error: unknown) {
      const err = error as { message?: string }
      toast.error(err?.message || "فشل في حذف السجلات")
    }
  }

  const handleDeleteAll = async () => {
    if (!passwordInput) {
      toast.error("الرجاء إدخال كلمة المرور")
      return
    }

    try {
      const savedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser')
      if (!savedUser) {
        toast.error("لم يتم العثور على بيانات المستخدم")
        return
      }

      const userData = JSON.parse(savedUser)
      
      if (userData.password !== passwordInput) {
        toast.error("كلمة المرور غير صحيحة")
        return
      }

      await deleteAllSystemLogs()
      toast.success("تم حذف جميع السجلات بنجاح")
      setShowDeleteAllDialog(false)
      setPasswordInput("")
      fetchLogs()
    } catch (error: unknown) {
      const err = error as { message?: string }
      toast.error(err?.message || "فشل في حذف جميع السجلات")
    }
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date)
  }

  return (
    <PermissionGuard requiredRole="مدير">
    <div className="p-6 space-y-4">
      {}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">سجل حركات النظام</h1>
      </div>

      {}
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          onClick={handleDeleteSelected}
          disabled={selectedIds.length === 0}
        >
          <Trash2 className="h-4 w-4 ml-2" />
          حذف المحدد ({selectedIds.length})
        </Button>
        <Button
          variant="destructive"
          onClick={() => setShowDeleteAllDialog(true)}
        >
          <Trash2 className="h-4 w-4 ml-2" />
          تنظيف الكل
        </Button>
      </div>

      {}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            placeholder="بحث في السجلات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button
          variant="ghost"
          onClick={handleClearSearch}
        >
          <X className="h-4 w-4 ml-2" />
          تنظيف
        </Button>
        <Button
          variant="default"
          onClick={handleSearch}
        >
          <RefreshCw className="h-4 w-4 ml-2" />
          بحث
        </Button>
        <Button
          variant="outline"
          onClick={fetchLogs}
        >
          <RefreshCw className="h-4 w-4 ml-2" />
          تحديث
        </Button>
      </div>

      {}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">#</TableHead>
              <TableHead className="w-[50px] text-center">
                <Checkbox
                  checked={selectedIds.length === logs.length && logs.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>مسؤول الحركة</TableHead>
              <TableHead>نوع الحركة</TableHead>
              <TableHead>الجدول المتأثر</TableHead>
              <TableHead>تفاصيل</TableHead>
              <TableHead>القيمة السابقة</TableHead>
              <TableHead>تاريخ الحدث</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  لا توجد سجلات
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log, index) => (
                <TableRow key={log.id}>
                  <TableCell className="text-center">
                    {(currentPage - 1) * pageSize + index + 1}
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={selectedIds.includes(log.id)}
                      onCheckedChange={(checked) => 
                        handleSelectRow(log.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {log.user_name && log.user_name.length > 10 ? (
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-20">{log.user_name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setViewingUserName(log.user_name || null)}
                          title="معاينة"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </Button>
                      </div>
                    ) : (
                      log.user_name || "غير معروف"
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="px-3 py-2 rounded bg-primary/10 text-primary text-sm">
                      {log.action_type}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.ref_table && log.ref_id 
                      ? `${log.ref_table} (ID: ${log.ref_id})`
                      : log.ref_table || "-"
                    }
                  </TableCell>
                  <TableCell>
                    {log.description && log.description.length > 15 ? (
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[100px]">{log.description}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setViewingDetails(log.description || null)}
                          title="معاينة"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </Button>
                      </div>
                    ) : (
                      log.description || "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {log.old_value && log.old_value.length > 15 ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs truncate max-w-[100px]">{log.old_value}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setViewingOldValue(log.old_value || null)}
                          title="معاينة"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </Button>
                      </div>
                    ) : log.old_value ? (
                      <code className="text-xs">{log.old_value}</code>
                    ) : "-"}
                  </TableCell>
                  <TableCell dir="ltr" className="text-right">
                    {formatDate(log.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          عدد الحركات: <span className="font-semibold">{totalCount}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <span className="text-sm px-4">
            صفحة {currentPage} من {totalPages || 1}
          </span>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف جميع السجلات</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <span className="block">
                  هذه العملية ستحذف جميع سجلات النظام ولا يمكن التراجع عنها.
                  الرجاء إدخال كلمة المرور الخاصة بك للتأكيد.
                </span>
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPasswordInput("")}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف الكل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {}
      <AlertDialog open={viewingDetails !== null} onOpenChange={(open) => !open && setViewingDetails(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>تفاصيل الحركة</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="py-4">
                <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-foreground">
                  {viewingDetails}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setViewingDetails(null)}>
              إغلاق
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {}
      <AlertDialog open={viewingOldValue !== null} onOpenChange={(open) => !open && setViewingOldValue(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>القيمة السابقة</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="py-4">
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-xs overflow-auto whitespace-pre-wrap text-foreground">
                    {(() => {
                      try {
                        const parsed = JSON.parse(viewingOldValue || "{}")
                        return JSON.stringify(parsed, null, 2)
                      } catch {
                        return viewingOldValue
                      }
                    })()}
                  </pre>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setViewingOldValue(null)}>
              إغلاق
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {}
      <AlertDialog open={viewingUserName !== null} onOpenChange={(open) => !open && setViewingUserName(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>مسؤول الحركة</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="py-4">
                <div className="bg-muted p-4 rounded-lg text-center">
                  <p className="text-lg font-semibold text-foreground">{viewingUserName}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setViewingUserName(null)}>
              إغلاق
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </PermissionGuard>
  )
}
