"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCustomers, type Customer } from "@/lib/supabase-operations"
import { createPayment } from "@/lib/payments-operations"
import { logAction } from "@/lib/system-log-operations"
import { toast } from "sonner"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"

const createFormSchema = (lang: string) =>
  z.object({
    customer_id: z.string().min(1, { message: t("selectCustomerRequired", lang) }),
    transaction_type: z.enum(["قبض", "صرف"]),
    currency_type: z.enum(["IQD", "USD"]),
    amount: z.string().min(1, { message: t("paymentEnterAmountRequired", lang) }),
    notes: z.string().optional(),
  })

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function PaymentModal({ open, onOpenChange, onSuccess }: PaymentModalProps) {
  const { currentLanguage } = useSettings()
  const lang = currentLanguage.code
  const [isLoading, setIsLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectOpen, setSelectOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const formSchema = createFormSchema(lang)

  const form = useForm<z.infer<ReturnType<typeof createFormSchema>>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_id: "",
      transaction_type: "قبض",
      currency_type: "IQD",
      amount: "",
      notes: "",
    },
  })

  useEffect(() => {
    if (open) {
      loadCustomers()
      form.reset()
      setSearchQuery("")
      setSelectOpen(false)
    }
  }, [open])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSelectOpen(false)
      }
    }
    if (selectOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [selectOpen])

  async function loadCustomers() {
    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (error) {
      toast.error(t("paymentFailedLoadCustomers", lang))
    }
  }

  const filteredCustomers = customers.filter((customer) =>
    customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone_number?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  async function onSubmit(values: z.infer<ReturnType<typeof createFormSchema>>) {
    try {
      setIsLoading(true)

      const amount = parseFloat(values.amount)
      if (isNaN(amount) || amount <= 0) {
        toast.error(t("paymentEnterValidAmount", lang))
        return
      }

      const selectedCustomer = customers.find(c => c.id === values.customer_id)
      
      const result = await createPayment({
        customer_id: values.customer_id,
        amount_iqd: values.currency_type === "IQD" ? amount : 0,
        amount_usd: values.currency_type === "USD" ? amount : 0,
        currency_type: values.currency_type,
        transaction_type: values.transaction_type,
        notes: values.notes || "",
        pay_date: new Date().toISOString(),
      })

      if (!result.success) {
        toast.error(result.error || t("paymentSaveFailed", lang))
        return
      }

      await logAction(
        "إضافة",
        `تمت عملية إضافة دفعة ${values.transaction_type === 'قبض' ? 'قبض' : 'دفع'} بمبلغ ${amount} ${values.currency_type} للزبون: ${selectedCustomer?.customer_name || 'غير معروف'}`,
        "الصندوق",
        undefined,
        undefined,
        {
          customer_name: selectedCustomer?.customer_name,
          amount: amount,
          currency_type: values.currency_type,
          transaction_type: values.transaction_type,
          notes: values.notes
        }
      )

      toast.success(t("paymentSavedSuccess", lang))
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      toast.error(t("paymentSaveError", lang))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t("paymentRecordNewTitle", lang)}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            {}
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentSelectCustomerLabel", lang)} *</FormLabel>
                  <div className="relative" ref={dropdownRef}>
                    <Input
                      placeholder={t("searchForCustomer", lang)}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setSelectOpen(true)
                      }}
                      onFocus={() => setSelectOpen(true)}
                      className="w-full"
                    />
                    {selectOpen && filteredCustomers.length > 0 && (
                      <div 
                        className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-[300px] overflow-y-auto"
                      >
                        {filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              field.onChange(customer.id)
                              setSelectOpen(false)
                              setSearchQuery("")
                            }}
                            className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex flex-col"
                          >
                            <span>{customer.customer_name}</span>
                            {customer.phone_number && (
                              <span className="text-xs text-muted-foreground">
                                {customer.phone_number}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectOpen && filteredCustomers.length === 0 && searchQuery && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          {t("saleCustomerNotFound", lang)}
                        </div>
                      </div>
                    )}
                    {field.value && (
                      <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                        <span className="font-medium">{t("paymentSelectedCustomerLabel", lang)}</span>{" "}
                        {customers.find(c => c.id === field.value)?.customer_name}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {}
            <FormField
              control={form.control}
              name="currency_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("currencyType", lang)} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("paymentSelectCurrencyPlaceholder", lang)} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="IQD">{t("paymentCurrencyIQDLabel", lang)}</SelectItem>
                      <SelectItem value="USD">{t("paymentCurrencyUSDLabel", lang)}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {}
            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentTransactionTypeLabel", lang)} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("paymentSelectTransactionTypePlaceholder", lang)} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="قبض">{t("paymentTransactionReceiveLabel", lang)}</SelectItem>
                      <SelectItem value="صرف">{t("paymentTransactionPayLabel", lang)}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentAmountLabel", lang)} *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t("paymentAmountPlaceholder", lang)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("notes", lang)}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("paymentNotesPlaceholder", lang)}
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? t("saving", lang) : t("paymentRecordButton", lang)}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="flex-1"
              >
                {t("cancel", lang)}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
