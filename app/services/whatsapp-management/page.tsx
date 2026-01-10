"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Send, Image as ImageIcon, Megaphone, Eye, FileText, X, RefreshCw, Edit, Upload, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { PermissionGuard } from "@/components/permission-guard"
import { useSettings } from "@/components/providers/settings-provider"
import { t } from "@/lib/translations"

interface Customer {
  id: string
  customer_name: string
  phone_number: string
  last_payment_date: string | null
  last_payment_iqd: number
  last_payment_usd: number
  balanceiqd: number
  balanceusd: number
}

export default function WhatsappManagementPage() {
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const lang = currentLanguage.code

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [messagePreview, setMessagePreview] = useState({
    title: "",
    body: ""
  })
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [sendErrors, setSendErrors] = useState<Array<{customer: string, error: string}>>([])
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingCustomers, setPendingCustomers] = useState<Customer[]>([])
  const [showMediaDialog, setShowMediaDialog] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('')
  const [imageDescription, setImageDescription] = useState('')
  const [isSendingMedia, setIsSendingMedia] = useState(false)

  useEffect(() => {
    loadMessagePreview()
    loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      setIsLoading(true)
      const response = await fetch("/api/whatsapp-customers")
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
        toast.success(t("whatsappCustomersLoaded", lang).replace("{count}", String(data.length)))
      } else {
        toast.error(t("whatsappCustomersLoadFailed", lang))
      }
    } catch {
      toast.error(t("whatsappCustomersLoadError", lang))
    } finally {
      setIsLoading(false)
    }
  }

  async function loadMessagePreview() {
    try {
      const response = await fetch("/api/whatsapp-settings")
      if (response.ok) {
        const data = await response.json()
        setMessagePreview({
          title: data.normal_message_title || "",
          body: data.normal_message_body || ""
        })
      }
    } catch {
      }
  }

  function handleSelectAll() {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredCustomers.map(c => c.id))
    }
  }

  function handleSelectOne(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  function handleClearSearch() {
    setSearchQuery("")
  }

  async function handleRefresh() {
    await loadCustomers()
    toast.success(t("whatsappDataRefreshed", lang))
  }

  async function handleSendMessages() {
    if (selectedIds.length === 0) {
      toast.error(t("whatsappSelectAtLeastOneCustomer", lang))
      return
    }

    const selectedCustomers = customers.filter(c => selectedIds.includes(c.id))
    setPendingCustomers(selectedCustomers)
    setShowConfirmDialog(true)
  }

  async function confirmSendMessages() {
    setShowConfirmDialog(false)

    try {
      setIsSending(true)
      toast.info(t("whatsappSendingMessagesInfo", lang))

      const response = await fetch("/api/whatsapp-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customers: pendingCustomers,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.failed === 0) {
          toast.success(t("whatsappMessagesSentSuccess", lang).replace("{count}", String(result.success)))
        } else {
          toast.warning(
            t("whatsappMessagesSentWithFailures", lang)
              .replace("{success}", String(result.success))
              .replace("{failed}", String(result.failed))
          )
        }
        
        if (result.errors && result.errors.length > 0) {
          setSendErrors(result.errors)
          setShowErrorDialog(true)
        }
        
        setSelectedIds([])
      } else {
        toast.error(t("whatsappSendMessagesFailed", lang))
      }
    } catch {
      toast.error(t("whatsappSendMessagesError", lang))
    } finally {
      setIsSending(false)
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error(t("whatsappChooseImageOnly", lang))
      return
    }

    setSelectedImage(file)
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function clearImageSelection() {
    setSelectedImage(null)
    setImagePreviewUrl('')
    setImageDescription('')
  }

  async function handleSendMedia() {
    if (!selectedImage) {
      toast.error(t("whatsappSelectImage", lang))
      return
    }

    if (selectedIds.length === 0) {
      toast.error(t("whatsappSelectCustomers", lang))
      return
    }

    const selectedCustomers = customers.filter(c => selectedIds.includes(c.id))

    try {
      setIsSendingMedia(true)
      toast.info(t("whatsappSendingMediaInfo", lang))

      const reader = new FileReader()
      reader.readAsDataURL(selectedImage)
      
      reader.onloadend = async () => {
        const base64Image = reader.result as string

        const response = await fetch("/api/whatsapp-send-media", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customers: selectedCustomers,
            image: base64Image,
            caption: imageDescription,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          
          if (result.failed === 0) {
            toast.success(t("whatsappImageSentSuccess", lang).replace("{count}", String(result.success)))
          } else {
            toast.warning(
              t("whatsappImageSentWithFailures", lang)
                .replace("{success}", String(result.success))
                .replace("{failed}", String(result.failed))
            )
          }
          
          if (result.errors && result.errors.length > 0) {
            setSendErrors(result.errors)
            setShowErrorDialog(true)
          }
          
          setSelectedIds([])
          setShowMediaDialog(false)
          clearImageSelection()
        } else {
          let errorMessage = t("whatsappSendImageFailed", lang)
          let errorDetails = ""
          
          try {
            const responseText = await response.text()
            if (responseText && responseText.trim()) {
              try {
                const errorData = JSON.parse(responseText)
                
                errorMessage = errorData.error || 
                               errorData.message || 
                               errorData.msg || 
                               errorData.detail ||
                               errorData.description ||
                               (typeof errorData === 'string' ? errorData : null) ||
                               errorMessage
                
                errorDetails = JSON.stringify(errorData, null, 2)
                } catch {
                errorMessage = responseText.substring(0, 200)
                errorDetails = responseText
              }
            } else {
              errorMessage = t("whatsappHttpError", lang)
                .replace("{status}", String(response.status))
                .replace("{statusText}", String(response.statusText))
              errorDetails = `HTTP ${response.status} - ${response.statusText}\n${t("whatsappServerReturnedNoContent", lang)}`
            }
          } catch (e) {
            errorMessage = t("whatsappHttpErrorShort", lang)
              .replace("{status}", String(response.status))
              .replace("{statusText}", String(response.statusText))
            errorDetails = `HTTP ${response.status} - ${response.statusText}\n${t("whatsappReadError", lang)}: ${e}`
          }
          
          toast.error(errorMessage)
          
          setSendErrors([{
            customer: t("whatsappErrorDetailsCustomer", lang),
            error: `${errorMessage}\n\n${t("whatsappDetailsLabel", lang)}\n${errorDetails}`
          }])
          setShowErrorDialog(true)
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t("whatsappUnexpectedError", lang)
      
      toast.error(t("whatsappSendImageErrorWithMessage", lang).replace("{error}", String(errorMsg)))
      
      setSendErrors([{
        customer: t("whatsappSystem", lang),
        error: errorMsg
      }])
      setShowErrorDialog(true)
    } finally {
      setIsSendingMedia(false)
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone_number.includes(searchQuery)
  )

  const totalCustomers = filteredCustomers.length
  const totalBalanceIQD = filteredCustomers.reduce((sum, c) => sum + c.balanceiqd, 0)
  const totalBalanceUSD = filteredCustomers.reduce((sum, c) => sum + c.balanceusd, 0)

  const handleExportReport = async () => {
    try {
      toast.loading(t("whatsappPreparingReport", lang))
      
      const { data: { user } } = await fetch("/api/auth/user").then(res => res.json()).catch(() => ({ data: { user: null } }))
      const generatedBy = user?.user_metadata?.full_name || user?.email || t("unknownUser", lang)

      const payload = {
        generatedBy,
        date: new Date().toISOString(),
        items: filteredCustomers,
        totalBalanceIQD,
        totalBalanceUSD,
        count: totalCustomers
      }

      const jsonString = JSON.stringify(payload)
      const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const storageKey = `whatsappReportPayload:${token}`
      localStorage.setItem(storageKey, jsonString)

      toast.dismiss()
      toast.success(t("whatsappReportPrepared", lang))

      window.location.href = `/report/whatsapp?token=${token}&back=/services/whatsapp-management`
    } catch (error) {
      console.error("Error exporting report:", error)
      toast.dismiss()
      toast.error(t("whatsappReportExportError", lang))
    }
  }

  return (
    <PermissionGuard requiredPermission="view_services">
    <div className="h-full p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("whatsappMessagesManagementTitle", lang)}</h1>
        <p className="text-muted-foreground mt-2">
          {t("whatsappMessagesManagementDescription", lang)}
        </p>
      </div>

      {}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Button 
          className="gap-2"
          onClick={handleSendMessages}
          disabled={isSending || selectedIds.length === 0}
        >
          <Send className="h-4 w-4" />
          {isSending
            ? t("whatsappSending", lang)
            : t("whatsappSendMessageWithCount", lang).replace("{count}", String(selectedIds.length))}
        </Button>

        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => {
            if (selectedIds.length === 0) {
              toast.error(t("whatsappSelectAtLeastOneCustomer", lang))
              return
            }
            setShowMediaDialog(true)
          }}
          disabled={selectedIds.length === 0}
        >
          <ImageIcon className="h-4 w-4" />
          {t("whatsappSendMediaWithCount", lang).replace("{count}", String(selectedIds.length))}
        </Button>

        <Button variant="outline" className="gap-2">
          <Megaphone className="h-4 w-4" />
          {t("whatsappAdCampaign", lang)}
        </Button>

        {}
        <div className="mr-auto">
          <Button
            variant="secondary"
            className="gap-2 bg-primary/10 hover:bg-primary/20"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-4 w-4" />
            {t("whatsappPreviewDefaultMessage", lang)}
          </Button>
        </div>
      </div>

      {}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleExportReport}
          >
            <FileText className="h-4 w-4" />
          </Button>

          <div className="flex-1 min-w-[200px] max-w-md flex gap-2">
            <Input
              placeholder={t("whatsappSearchNameOrPhonePlaceholder", lang)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={handleSelectAll}
          >
            {selectedIds.length === filteredCustomers.length
              ? t("deselectAll", lang)
              : t("selectAll", lang)}
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
            {t("refresh", lang)}
          </Button>
        </div>
      </Card>

      {}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] text-right">{t("rowNumber", lang)}</TableHead>
                <TableHead className="text-right">{t("customerName", lang)}</TableHead>
                <TableHead className="text-right">{t("phoneNumber", lang)}</TableHead>
                <TableHead className="text-right">{t("whatsappVarLastPaymentDate", lang)}</TableHead>
                <TableHead className="text-right">{t("whatsappLastPaymentIQD", lang)}</TableHead>
                <TableHead className="text-right">{t("whatsappLastPaymentUSD", lang)}</TableHead>
                <TableHead className="text-right">{t("whatsappCurrentBalanceIQD", lang)}</TableHead>
                <TableHead className="text-right">{t("whatsappCurrentBalanceUSD", lang)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t("loading", lang)}
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t("noResults", lang)}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer, index) => (
                    <TableRow key={customer.id}>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span>{index + 1}</span>
                          <Checkbox
                            checked={selectedIds.includes(customer.id)}
                            onCheckedChange={() => handleSelectOne(customer.id)}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-right">{customer.customer_name}</TableCell>
                      <TableCell className="text-right" dir="ltr">{customer.phone_number || '-'}</TableCell>
                      <TableCell className="text-right" dir="ltr">
                        {customer.last_payment_date 
                          ? new Date(customer.last_payment_date).toLocaleDateString('en-US')
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right" dir="ltr">
                        {customer.last_payment_iqd > 0 
                          ? `${customer.last_payment_iqd.toLocaleString('en-US')} IQD` 
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right" dir="ltr">
                        {customer.last_payment_usd > 0 
                          ? `$${customer.last_payment_usd.toLocaleString('en-US')}` 
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="font-semibold text-right" dir="ltr">
                        {customer.balanceiqd.toLocaleString('en-US')} IQD
                      </TableCell>
                      <TableCell className="font-semibold text-right" dir="ltr">
                        ${customer.balanceusd.toLocaleString('en-US')}
                      </TableCell>
                    </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {}
        <div className="border-t p-4 bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("totalCustomers", lang)}:</p>
              <p className="text-2xl font-bold">{totalCustomers}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("whatsappTotalDueAmountsIQD", lang)}</p>
              <p className="text-2xl font-bold text-orange-600">
                {totalBalanceIQD.toLocaleString('en-US')} IQD
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("whatsappTotalDueAmountsUSD", lang)}</p>
              <p className="text-2xl font-bold text-green-600">
                ${totalBalanceUSD.toLocaleString('en-US')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("whatsappErrorsDetailsTitle", lang).replace("{count}", String(sendErrors.length))}
            </DialogTitle>
            <DialogDescription>
              {t("whatsappErrorsDetailsDescription", lang)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {sendErrors.map((error, index) => (
              <Card key={index} className="p-3 bg-destructive/10">
                <p className="font-semibold">{error.customer}</p>
                <p className="text-sm text-muted-foreground">{error.error}</p>
              </Card>
            ))}
          </div>

          <Button onClick={() => setShowErrorDialog(false)} className="w-full">
            {t("close", lang)}
          </Button>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("whatsappDefaultMessagePreviewTitle", lang)}</DialogTitle>
            <DialogDescription>
              {t("whatsappDefaultMessagePreviewDescription", lang)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="p-6 bg-muted/50">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("whatsappPreviewTitle", lang)}</p>
                  <p className="text-lg font-semibold">{messagePreview.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("whatsappPreviewBody", lang)}</p>
                  <p className="whitespace-pre-wrap">{messagePreview.body}</p>
                </div>
              </div>
            </Card>

            <Button
              className="w-full gap-2"
              onClick={() => {
                setShowPreview(false)
                router.push("/settings/whatsapp/edit-message?type=normal")
              }}
            >
              <Edit className="h-4 w-4" />
              {t("whatsappEditMessage", lang)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Send className="h-6 w-6 text-primary" />
              {t("whatsappConfirmSendMessagesTitle", lang)}
            </DialogTitle>
            <DialogDescription>
              {t("whatsappConfirmSendMessagesDescription", lang)}
            </DialogDescription>
          </DialogHeader>

          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("whatsappCustomersCountLabel", lang)}</span>
                <span className="text-2xl font-bold text-primary">{pendingCustomers.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("whatsappMessagesCountLabel", lang)}</span>
                <span className="text-xl font-semibold">{pendingCustomers.length}</span>
              </div>
            </div>
          </Card>

          {pendingCustomers.length > 0 && (
            <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">{t("whatsappSelectedCustomersLabel", lang)}</p>
              {pendingCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  <span className="font-medium">{customer.customer_name}</span>
                  <span className="text-muted-foreground">({customer.phone_number})</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowConfirmDialog(false)
                setPendingCustomers([])
              }}
            >
              {t("cancel", lang)}
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={confirmSendMessages}
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t("whatsappSending", lang)}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t("whatsappConfirmSend", lang)}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={showMediaDialog} onOpenChange={(open) => {
        setShowMediaDialog(open)
        if (!open) clearImageSelection()
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <ImageIcon className="h-6 w-6 text-primary" />
              {t("whatsappSendImageDialogTitle", lang)}
            </DialogTitle>
            <DialogDescription>
              {t("whatsappSendImageDialogDescription", lang)}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(90vh-180px)] overflow-y-auto">
            {}
            <Card className="p-3 bg-primary/5 border-primary/20 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("whatsappSelectedCustomersCountLabel", lang)}</span>
                <span className="text-lg font-bold text-primary">{selectedIds.length}</span>
              </div>
            </Card>

            {!selectedImage ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("whatsappChooseImageLabel", lang)}</label>
                <label htmlFor="image-upload" className="block">
                  <Card className="p-8 border-2 border-dashed hover:border-primary/50 cursor-pointer transition-colors">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <Upload className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{t("whatsappClickToChooseImage", lang)}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("whatsappImageFormatsSupported", lang)}
                        </p>
                      </div>
                    </div>
                  </Card>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">{t("whatsappSelectedImageLabel", lang)}</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearImageSelection}
                    className="gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    {t("remove", lang)}
                  </Button>
                </div>
                
                <Card className="p-4 bg-muted/50">
                  <div className="flex items-start gap-4">
                    {imagePreviewUrl && (
                      <div className="relative w-48 h-48 shrink-0 rounded-lg overflow-hidden border-2 border-primary/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imagePreviewUrl}
                          alt={t("whatsappImagePreviewAlt", lang)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("whatsappFileNameLabel", lang)}</p>
                        <p className="font-medium">{selectedImage.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("whatsappFileSizeLabel", lang)}</p>
                        <p className="font-medium">{(selectedImage.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("whatsappImageDescriptionOptionalLabel", lang)}</label>
                  <Textarea
                    placeholder={t("whatsappImageDescriptionPlaceholder", lang)}
                    value={imageDescription}
                    onChange={(e) => setImageDescription(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowMediaDialog(false)}
              disabled={isSendingMedia}
            >
              {t("cancel", lang)}
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSendMedia}
              disabled={!selectedImage || isSendingMedia}
            >
              {isSendingMedia ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t("whatsappSending", lang)}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t("whatsappSendImageButton", lang)}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGuard>
  )
}