"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import * as React from "react"
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
import { ArrowRight, Upload, X, Check, ChevronsUpDown } from "lucide-react"
import { createCustomer, uploadCustomerImage } from "@/lib/supabase-operations"
import { logAction } from "@/lib/system-log-operations"
import { toast } from "sonner"
import { iraqLocations } from "@/lib/iraq-locations"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"

export default function AddCustomerPage() {
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const lang = currentLanguage.code
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [openAddress, setOpenAddress] = useState(false)
  const [searchAddress, setSearchAddress] = useState("")
  const [addressCount, setAddressCount] = useState<number | null>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  const formSchema = React.useMemo(
    () =>
      z.object({
        customer_name: z.string().min(2, { message: t("nameMin2Chars", lang) }),
        type: z.enum(["زبون", "مجهز", "موظف"]),
        phone_number: z
          .string()
          .refine((val) => !val || val.length === 11, {
            message: t("phoneMustBe11Digits", lang),
          })
          .refine((val) => !val || val.startsWith("07"), {
            message: t("invalidPhoneFormat", lang),
          })
          .optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
        initial_balance_iqd: z.string().optional(),
        initial_balance_usd: z.string().optional(),
      }),
    [lang]
  )

  const type = searchParams.get('type') as "زبون" | "مجهز" | "موظف" | null
  const returnTo = searchParams.get('returnTo')
  const prefillName = searchParams.get('name')

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: prefillName || "",
      type: type || "زبون",
      phone_number: "07",
      address: "",
      notes: "",
      initial_balance_iqd: "0",
      initial_balance_usd: "0",
    },
  })

  useEffect(() => {
    if (openAddress && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [openAddress])

  const fetchAddressCount = async (address: string) => {
    if (!address) {
      setAddressCount(null)
      return
    }

    try {
      const { supabase } = await import("@/lib/supabase")
      const { count, error } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("address", address)

      if (error) {
        setAddressCount(null)
      } else {
        setAddressCount(count || 0)
      }
    } catch {
      setAddressCount(null)
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

  const removeImage = () => {
    setImageFile(null)
    setImagePreview("")
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)

      let imageUrl = ""
      if (imageFile) {
        imageUrl = await uploadCustomerImage(imageFile)
      }

      const newCustomer = await createCustomer({
        customer_name: values.customer_name,
        type: values.type,
        phone_number: values.phone_number || "",
        address: values.address || "",
        notes: values.notes || "",
        image_url: imageUrl,
      })

      try {
        await logAction(
          "إضافة زبون",
          `تمت عملية اضافة زبون جديد: ${values.customer_name} الى النظام`,
          "customers",
          undefined,
          undefined,
          {
            customer_name: values.customer_name,
            type: values.type,
            phone_number: values.phone_number || "",
          }
        )
      } catch {
        // Silent fail
      }

      toast.success(t("customerAddedSuccess", lang))
      
      if (returnTo) {
        router.push(`${returnTo}?newSupplierId=${newCustomer.id}`)
      } else {
        router.push("/customers")
        router.refresh()
      }
    } catch {
      toast.error(t("customerAddError", lang))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-6" style={{ maxWidth: "800px" }}>
        {}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold" style={{ color: "var(--theme-text)" }}>
              {t("addNewCustomerTitle", lang)}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("addNewCustomerDescription", lang)}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            title={t("back", lang)}
            className="shrink-0"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {}
              <div className="space-y-2">
                <FormLabel>{t("customerImageOptionalLabel", lang)}</FormLabel>
                {imagePreview ? (
                  <div className="relative inline-block">
                    <Image
                      src={imagePreview}
                      alt={t("uploadImage", lang)}
                      width={128}
                      height={128}
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
                      <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        asChild
                      >
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          {t("uploadPhoto", lang)}
                        </span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customerNameLabel", lang)} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("enterCustomerName", lang)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("type", lang)} *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectTypePlaceholder", lang)} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="زبون">{t("customerTypeCustomer", lang)}</SelectItem>
                        <SelectItem value="مجهز">{t("customerTypeSupplier", lang)}</SelectItem>
                        <SelectItem value="موظف">{t("customerTypeEmployee", lang)}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("phoneNumber", lang)} ({t("optional", lang)})
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="07XXXXXXXXX"
                        maxLength={11}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      {t("address", lang)} ({t("optional", lang)})
                    </FormLabel>
                    <Popover open={openAddress} onOpenChange={setOpenAddress}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value || t("selectAddress", lang)}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput
                            ref={searchInputRef}
                            placeholder={t("searchAddressPlaceholder", lang)}
                            value={searchAddress}
                            onValueChange={setSearchAddress}
                          />
                          <CommandList>
                            <CommandEmpty>{t("noResults", lang)}</CommandEmpty>
                            <CommandGroup>
                              {iraqLocations
                                .filter((location) =>
                                  location.toLowerCase().includes(searchAddress.toLowerCase())
                                )
                                .map((location) => (
                                  <CommandItem
                                    key={location}
                                    value={location}
                                    onSelect={() => {
                                      form.setValue("address", location)
                                      setOpenAddress(false)
                                      fetchAddressCount(location)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        location === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {location}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {addressCount !== null && addressCount > 0 && field.value && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm text-muted-foreground cursor-help">
                              {t("customersAtAddress", lang).replace("{count}", String(addressCount))}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("customersAtAddressHint", lang)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("notes", lang)} ({t("optional", lang)})
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t("enterAdditionalNotes", lang)}
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                >
                  {t("cancel", lang)}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? t("addingCustomer", lang) : t("addCustomerButton", lang)}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  )
}