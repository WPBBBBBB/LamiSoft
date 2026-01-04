"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  FileText, 
  ShoppingCart, 
  DollarSign, 
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react"
import { getCustomerProfileDetails, type CustomerSearchResult, type CustomerProfileDetails } from "@/lib/search-operations"

interface CustomerProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: CustomerSearchResult
}

export function CustomerProfileModal({ open, onOpenChange, customer }: CustomerProfileModalProps) {
  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState<CustomerProfileDetails | null>(null)

  useEffect(() => {
    if (open && customer) {
      loadDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer])

  const loadDetails = async () => {
    setLoading(true)
    try {
      const profileDetails = await getCustomerProfileDetails(customer.id)
      setDetails(profileDetails)
    } catch (error) {
      } finally {
      setLoading(false)
    }
  }

  const getAllActivities = () => {
    if (!details) return []
    
    const activities: {
      id: string
      type: 'sale' | 'purchase' | 'payment'
      date: string
      number?: string
      amountIQD: number
      amountUSD: number
      description: string
      notes?: string
      paymentType?: string
    }[] = []

    details.sales.forEach(sale => {
      activities.push({
        id: sale.id,
        type: 'sale',
        date: sale.datetime,
        number: sale.numberofsale,
        amountIQD: sale.totalsaleiqd,
        amountUSD: sale.totalsaleusd,
        description: `قائمة بيع - ${sale.paytype}`,
        notes: sale.details
      })
    })

    details.purchases.forEach(purchase => {
      activities.push({
        id: purchase.id,
        type: 'purchase',
        date: purchase.datetime,
        number: purchase.numberofpurchase,
        amountIQD: purchase.totalpurchaseiqd,
        amountUSD: purchase.totalpurchaseusd,
        description: `قائمة شراء - ${purchase.typeofpayment}`,
        notes: purchase.details
      })
    })

    details.payments.forEach(payment => {
      activities.push({
        id: payment.id,
        type: 'payment',
        date: payment.pay_date,
        amountIQD: payment.amount_iqd,
        amountUSD: payment.amount_usd,
        description: `${payment.transaction_type} - ${payment.currency_type}`,
        paymentType: payment.paymenttype,
        notes: payment.notes
      })
    })

    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="h-6 w-6 text-warning" />
            <span>{customer.customer_name}</span>
            <Badge variant="outline">{customer.type}</Badge>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : details ? (
          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="space-y-6 p-1">
              {}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {}
                <Card className="p-4">
                  <div className="space-y-3">
                    {details.customer.phone_number && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm" dir="ltr">{details.customer.phone_number}</span>
                      </div>
                    )}
                    {details.customer.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{details.customer.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        {new Date(details.customer.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: '2-digit', 
                          day: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                </Card>

                {}
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground mb-2">الرصيد الحالي</div>
                  <div className="space-y-1">
                    <div 
                      className="text-xl font-bold" 
                      style={{ color: details.customer.balanceiqd >= 0 ? 'var(--theme-success)' : 'var(--theme-danger)' }}
                      dir="ltr"
                    >
                      {details.customer.balanceiqd.toLocaleString('en-US')} د.ع
                    </div>
                    <div 
                      className="text-sm font-semibold" 
                      style={{ color: details.customer.balanceusd >= 0 ? 'var(--theme-success)' : 'var(--theme-danger)' }}
                      dir="ltr"
                    >
                      ${details.customer.balanceusd.toLocaleString('en-US')}
                    </div>
                  </div>
                </Card>

                {}
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground mb-2">النشاط</div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-xl font-bold text-success" dir="ltr">{details.sales.length}</div>
                      <div className="text-xs text-muted-foreground">مبيعات</div>
                    </div>
                    {details.customer.type === 'مجهز' && (
                      <div>
                        <div className="text-xl font-bold text-danger" dir="ltr">{details.purchases.length}</div>
                        <div className="text-xs text-muted-foreground">مشتريات</div>
                      </div>
                    )}
                    <div className={details.customer.type === 'مجهز' ? 'col-span-2' : 'col-span-1'}>
                      <div className="text-xl font-bold text-info" dir="ltr">{details.payments.length}</div>
                      <div className="text-xs text-muted-foreground">دفعات</div>
                    </div>
                  </div>
                </Card>
              </div>

              {}
              {details.customer.notes && (
                <Card className="p-4 bg-muted/30">
                  <div className="text-sm font-semibold mb-2">ملاحظات:</div>
                  <div className="text-sm text-muted-foreground">{details.customer.notes}</div>
                </Card>
              )}

              <Separator />

              {}
              <Tabs defaultValue="activity" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="activity">
                    <Activity className="h-4 w-4 ml-2" />
                    جميع الأنشطة
                  </TabsTrigger>
                  <TabsTrigger value="sales">
                    <FileText className="h-4 w-4 ml-2" />
                    المبيعات ({details.sales.length})
                  </TabsTrigger>
                  {details.customer.type === 'مجهز' && (
                    <TabsTrigger value="purchases">
                      <ShoppingCart className="h-4 w-4 ml-2" />
                      المشتريات ({details.purchases.length})
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="payments">
                    <DollarSign className="h-4 w-4 ml-2" />
                    الدفعات ({details.payments.length})
                  </TabsTrigger>
                </TabsList>

                {}
                <TabsContent value="activity" className="space-y-3 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Card className="p-4">
                      <div className="text-sm text-muted-foreground mb-1">إجمالي المبيعات</div>
                      <div className="space-y-1">
                        <div className="font-bold text-success" dir="ltr">
                          {details.totalSalesIQD.toLocaleString('en-US')} د.ع
                        </div>
                        <div className="text-sm text-success" dir="ltr">
                          ${details.totalSalesUSD.toLocaleString('en-US')}
                        </div>
                      </div>
                    </Card>
                    {details.customer.type === 'مجهز' && (
                      <Card className="p-4">
                        <div className="text-sm text-muted-foreground mb-1">إجمالي المشتريات</div>
                        <div className="space-y-1">
                          <div className="font-bold text-danger" dir="ltr">
                            {details.totalPurchasesIQD.toLocaleString('en-US')} د.ع
                          </div>
                          <div className="text-sm text-danger" dir="ltr">
                            ${details.totalPurchasesUSD.toLocaleString('en-US')}
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>

                  <div className="space-y-2">
                    {getAllActivities().map((activity, index) => (
                      <Card key={`${activity.type}-${activity.id}-${index}`} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-1">
                            {activity.type === 'sale' && <FileText className="h-5 w-5 text-success" />}
                            {activity.type === 'purchase' && <ShoppingCart className="h-5 w-5 text-danger" />}
                            {activity.type === 'payment' && (
                              activity.paymentType === 'قبض' ? 
                                <TrendingUp className="h-5 w-5 text-success" /> : 
                                <TrendingDown className="h-5 w-5 text-danger" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-semibold">
                                  {activity.number && <span>{activity.number} - </span>}
                                  {activity.description}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1" dir="ltr">
                                  {new Date(activity.date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                                {activity.notes && (
                                  <div className="text-sm text-muted-foreground mt-2">{activity.notes}</div>
                                )}
                              </div>
                              <div className="text-left">
                                <div className="font-bold" dir="ltr">
                                  {activity.amountIQD.toLocaleString('en-US')} د.ع
                                </div>
                                {activity.amountUSD !== 0 && (
                                  <div className="text-sm text-muted-foreground" dir="ltr">
                                    ${activity.amountUSD.toLocaleString('en-US')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {getAllActivities().length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      لا توجد أنشطة بعد
                    </div>
                  )}
                </TabsContent>

                {}
                <TabsContent value="sales" className="space-y-3 mt-4">
                  <Card className="p-4 bg-muted/30">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-success" dir="ltr">
                          {details.totalSalesIQD.toLocaleString('en-US')}
                        </div>
                        <div className="text-xs text-muted-foreground">إجمالي (د.ع)</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-success" dir="ltr">
                          ${details.totalSalesUSD.toLocaleString('en-US')}
                        </div>
                        <div className="text-xs text-muted-foreground">إجمالي (USD)</div>
                      </div>
                    </div>
                  </Card>

                  {details.sales.map(sale => (
                    <Card key={sale.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold">{sale.numberofsale}</div>
                          <div className="text-sm text-muted-foreground mt-1">{sale.paytype}</div>
                          <div className="text-xs text-muted-foreground mt-1" dir="ltr">
                            {new Date(sale.datetime).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </div>
                          {sale.details && (
                            <div className="text-sm text-muted-foreground mt-2">{sale.details}</div>
                          )}
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-success" dir="ltr">
                            {sale.totalsaleiqd.toLocaleString('en-US')} د.ع
                          </div>
                          <div className="text-sm text-muted-foreground" dir="ltr">
                            ${sale.totalsaleusd.toLocaleString('en-US')}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {details.sales.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      لا توجد مبيعات بعد
                    </div>
                  )}
                </TabsContent>

                {}
                {details.customer.type === 'مجهز' && (
                  <TabsContent value="purchases" className="space-y-3 mt-4">
                    <Card className="p-4 bg-muted/30">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-danger" dir="ltr">
                            {details.totalPurchasesIQD.toLocaleString('en-US')}
                          </div>
                          <div className="text-xs text-muted-foreground">إجمالي (د.ع)</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-danger" dir="ltr">
                            ${details.totalPurchasesUSD.toLocaleString('en-US')}
                          </div>
                          <div className="text-xs text-muted-foreground">إجمالي (USD)</div>
                        </div>
                      </div>
                    </Card>

                    {details.purchases.map(purchase => (
                      <Card key={purchase.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold">{purchase.numberofpurchase}</div>
                            <div className="text-sm text-muted-foreground mt-1">{purchase.typeofpayment}</div>
                            <div className="text-xs text-muted-foreground mt-1" dir="ltr">
                              {new Date(purchase.datetime).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              })}
                            </div>
                            {purchase.details && (
                              <div className="text-sm text-muted-foreground mt-2">{purchase.details}</div>
                            )}
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-danger" dir="ltr">
                              {purchase.totalpurchaseiqd.toLocaleString('en-US')} د.ع
                            </div>
                            <div className="text-sm text-muted-foreground" dir="ltr">
                              ${purchase.totalpurchaseusd.toLocaleString('en-US')}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}

                    {details.purchases.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        لا توجد مشتريات بعد
                      </div>
                    )}
                  </TabsContent>
                )}

                {}
                <TabsContent value="payments" className="space-y-3 mt-4">
                  <Card className="p-4 bg-muted/30">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-info" dir="ltr">
                          {details.totalPaymentsIQD.toLocaleString('en-US')}
                        </div>
                        <div className="text-xs text-muted-foreground">إجمالي (د.ع)</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-info" dir="ltr">
                          ${details.totalPaymentsUSD.toLocaleString('en-US')}
                        </div>
                        <div className="text-xs text-muted-foreground">إجمالي (USD)</div>
                      </div>
                    </div>
                  </Card>

                  {details.payments.map(payment => (
                    <Card key={payment.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-1">
                          {payment.paymenttype === 'قبض' ? 
                            <TrendingUp className="h-5 w-5 text-success" /> : 
                            <TrendingDown className="h-5 w-5 text-danger" />
                          }
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold">
                                {payment.transaction_type}
                                {payment.paymenttype && ` - ${payment.paymenttype}`}
                              </div>
                              <div className="text-sm">
                                <Badge variant="outline">{payment.currency_type}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1" dir="ltr">
                                {new Date(payment.pay_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              {payment.notes && (
                                <div className="text-sm text-muted-foreground mt-2">{payment.notes}</div>
                              )}
                            </div>
                            <div className="text-left">
                              <div className="font-bold" dir="ltr">
                                {payment.amount_iqd.toLocaleString('en-US')} د.ع
                              </div>
                              {payment.amount_usd !== 0 && (
                                <div className="text-sm text-muted-foreground" dir="ltr">
                                  ${payment.amount_usd.toLocaleString('en-US')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {details.payments.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      لا توجد دفعات بعد
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            حدث خطأ في تحميل التفاصيل
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
