"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
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
import { ArrowRight, Upload, X } from "lucide-react"
import { getCustomer, updateCustomer, uploadCustomerImage, deleteCustomerImage } from "@/lib/supabase-operations"
import { toast } from "sonner"

const formSchema = z.object({
  customer_name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
  type: z.enum(["زبون", "مجهز", "موظف"]),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string
  
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [existingImageUrl, setExistingImageUrl] = useState<string>("")

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: "",
      type: "زبون",
      phone_number: "",
      address: "",
      notes: "",
    },
  })

  useEffect(() => {
    loadCustomerData()
  }, [customerId])

  async function loadCustomerData() {
    try {
      setIsLoadingData(true)
      const customer = await getCustomer(customerId)
      
      if (customer) {
        form.reset({
          customer_name: customer.customer_name,
          type: customer.type,
          phone_number: customer.phone_number || "",
          address: customer.address || "",
          notes: customer.notes || "",
        })
        
        if (customer.image_url) {
          setExistingImageUrl(customer.image_url)
          setImagePreview(customer.image_url)
        }
      }
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء تحميل البيانات")
      router.push("/customers")
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = async () => {
    if (existingImageUrl) {
      try {
        await deleteCustomerImage(existingImageUrl)
      } catch (error) {
        console.error("Error deleting image:", error)
      }
    }
    setImageFile(null)
    setImagePreview("")
    setExistingImageUrl("")
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)

      let imageUrl = existingImageUrl

      if (imageFile) {
        // حذف الصورة القديمة إذا كانت موجودة
        if (existingImageUrl) {
          await deleteCustomerImage(existingImageUrl)
        }
        imageUrl = await uploadCustomerImage(imageFile)
      }

      await updateCustomer(customerId, {
        customer_name: values.customer_name,
        type: values.type,
        phone_number: values.phone_number || "",
        address: values.address || "",
        notes: values.notes || "",
        image_url: imageUrl || "",
      })

      toast.success("تم تحديث الزبون بنجاح")
      router.push("/customers")
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error("حدث خطأ أثناء تحديث الزبون")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
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
      <div className="container mx-auto p-6 space-y-6" style={{ maxWidth: "800px" }}>
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold" style={{ color: "var(--theme-text)" }}>
              تعديل بيانات الزبون
            </h1>
            <p className="text-muted-foreground mt-1">
              قم بتحديث معلومات الزبون
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            title="رجوع"
            className="shrink-0"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* صورة العميل */}
              <div className="space-y-2">
                <FormLabel>صورة العميل (اختياري)</FormLabel>
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload">
                      <Button type="button" variant="outline" asChild>
                        <span className="cursor-pointer gap-2">
                          <Upload className="h-4 w-4" />
                          اختر صورة
                        </span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>

              {/* اسم الزبون */}
              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الزبون *</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسم الزبون" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* نوع الشخص */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الشخص *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="زبون">زبون</SelectItem>
                        <SelectItem value="مجهز">مجهز</SelectItem>
                        <SelectItem value="موظف">موظف</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* رقم الهاتف */}
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input placeholder="07XXXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* العنوان */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العنوان</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل العنوان" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ملاحظات */}
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
                        rows={4}
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
                  {isLoading ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  )
}
