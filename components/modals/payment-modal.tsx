"use client"

import { useState, useEffect } from "react"
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
import { getCustomers, createPayment, type Customer } from "@/lib/supabase-operations"
import { toast } from "sonner"
import { Search } from "lucide-react"

const formSchema = z.object({
  customer_id: z.string().min(1, { message: "يرجى اختيار الزبون" }),
  transaction_type: z.enum(["قبض", "ايداع", "سحب", "صرف", "قرض"]),
  currency_type: z.enum(["IQD", "USD"]),
  amount: z.string().min(1, { message: "يرجى إدخال المبلغ" }),
  notes: z.string().optional(),
})

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function PaymentModal({ open, onOpenChange, onSuccess }: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const form = useForm<z.infer<typeof formSchema>>({
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
    }
  }, [open])

  async function loadCustomers() {
    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء تحميل العملاء")
    }
  }

  const filteredCustomers = customers.filter((customer) =>
    customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone_number?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)

      const amount = parseFloat(values.amount)
      if (isNaN(amount) || amount <= 0) {
        toast.error("يرجى إدخال مبلغ صحيح")
        return
      }

      await createPayment({
        customer_id: values.customer_id,
        amount_iqd: values.currency_type === "IQD" ? amount : 0,
        amount_usd: values.currency_type === "USD" ? amount : 0,
        currency_type: values.currency_type,
        transaction_type: values.transaction_type,
        notes: values.notes || "",
        pay_date: new Date().toISOString(),
      })

      toast.success("تم تسجيل الدفعة بنجاح")
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء تسجيل الدفعة")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">تسجيل دفعة جديدة</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            {/* اختيار الزبون */}
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اختيار الزبون *</FormLabel>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="ابحث عن زبون..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الزبون" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCustomers.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            لا يوجد عملاء
                          </div>
                        ) : (
                          filteredCustomers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              <div className="flex flex-col">
                                <span>{customer.customer_name}</span>
                                {customer.phone_number && (
                                  <span className="text-xs text-muted-foreground">
                                    {customer.phone_number}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* نوع الدفعة */}
            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الدفعة *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الدفعة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="قبض">قبض</SelectItem>
                      <SelectItem value="ايداع">ايداع</SelectItem>
                      <SelectItem value="سحب">سحب</SelectItem>
                      <SelectItem value="صرف">صرف</SelectItem>
                      <SelectItem value="قرض">قرض</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* نوع العملة */}
            <FormField
              control={form.control}
              name="currency_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع العملة *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العملة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="IQD">دينار عراقي (IQD)</SelectItem>
                      <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* المبلغ */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المبلغ *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* الملاحظات */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="أدخل أي ملاحظات..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* الأزرار */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "جاري الحفظ..." : "تسجيل الدفعة"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
