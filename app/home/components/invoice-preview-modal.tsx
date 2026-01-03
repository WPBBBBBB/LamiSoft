"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { FileText, ShoppingCart, Calendar, User, DollarSign, Package, Loader2 } from "lucide-react"
import { getPurchaseDetails, getSaleDetails, type SearchResult, type PurchaseDetails, type SaleDetails } from "@/lib/search-operations"

interface InvoicePreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: SearchResult
}

export function InvoicePreviewModal({ open, onOpenChange, invoice }: InvoicePreviewModalProps) {
  const [loading, setLoading] = useState(true)
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null)
  const [saleDetails, setSaleDetails] = useState<SaleDetails | null>(null)

  useEffect(() => {
    if (open && invoice) {
      loadDetails()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice])

  const loadDetails = async () => {
    setLoading(true)
    try {
      if (invoice.type === 'purchase') {
        const details = await getPurchaseDetails(invoice.id)
        setPurchaseDetails(details)
        setSaleDetails(null)
      } else {
        const details = await getSaleDetails(invoice.id)
        setSaleDetails(details)
        setPurchaseDetails(null)
      }
    } catch (error) {
      console.error('Error loading invoice details:', error)
    } finally {
      setLoading(false)
    }
  }

  const isPurchase = invoice.type === 'purchase'
  const details = isPurchase ? purchaseDetails : saleDetails

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {isPurchase ? (
              <ShoppingCart className="h-6 w-6 text-danger" />
            ) : (
              <FileText className="h-6 w-6 text-success" />
            )}
            <span>{invoice.displayText}</span>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">التاريخ:</span>
                    <span className="font-medium" dir="ltr" style={{ textAlign: 'right' }}>
                      {new Date(details.datetime).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {isPurchase ? 'المورد:' : 'الزبون:'}
                    </span>
                    <span className="font-medium">
                      {isPurchase ? (purchaseDetails as PurchaseDetails).nameofsupplier : (saleDetails as SaleDetails).customername}
                    </span>
                  </div>

                  {isPurchase && purchaseDetails && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">نوع الشراء:</span>
                        <Badge variant="outline">{purchaseDetails.typeofbuy}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">نوع الدفع:</span>
                        <Badge variant={purchaseDetails.typeofpayment === 'نقدي' ? 'default' : 'secondary'}>
                          {purchaseDetails.typeofpayment}
                        </Badge>
                      </div>
                    </>
                  )}

                  {!isPurchase && saleDetails && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">نوع القائمة:</span>
                        <Badge variant="outline">{saleDetails.pricetype}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">نوع الدفع:</span>
                        <Badge variant={saleDetails.paytype === 'نقدي' ? 'default' : 'secondary'}>
                          {saleDetails.paytype}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>

                {}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">العملة:</span>
                    <Badge>{isPurchase ? purchaseDetails?.currencytype : saleDetails?.currencytype}</Badge>
                  </div>

                  {isPurchase && purchaseDetails && (
                    <>
                      {purchaseDetails.totalpurchaseiqd > 0 && (
                        <div className="text-left">
                          <div className="text-xs text-muted-foreground">الإجمالي (دينار)</div>
                          <div className="text-xl font-bold" style={{ color: 'var(--theme-primary)' }} dir="ltr">
                            {purchaseDetails.totalpurchaseiqd.toLocaleString('en-US')} د.ع
                          </div>
                        </div>
                      )}
                      {purchaseDetails.totalpurchaseusd > 0 && (
                        <div className="text-left">
                          <div className="text-xs text-muted-foreground">الإجمالي (دولار)</div>
                          <div className="text-xl font-bold text-green-600" dir="ltr">
                            ${purchaseDetails.totalpurchaseusd.toLocaleString('en-US')}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {!isPurchase && saleDetails && (
                    <>
                      {saleDetails.discountenabled && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">الخصم: </span>
                          <span className="text-orange-600 font-medium" dir="ltr">
                            {(saleDetails.discountiqd || 0) > 0 && `${(saleDetails.discountiqd || 0).toLocaleString('en-US')} د.ع`}
                            {(saleDetails.discountusd || 0) > 0 && ` $${(saleDetails.discountusd || 0).toLocaleString('en-US')}`}
                          </span>
                        </div>
                      )}
                      {saleDetails.finaltotaliqd > 0 && (
                        <div className="text-left">
                          <div className="text-xs text-muted-foreground">المجموع النهائي (دينار)</div>
                          <div className="text-xl font-bold" style={{ color: 'var(--theme-success)' }} dir="ltr">
                            {saleDetails.finaltotaliqd.toLocaleString('en-US')} د.ع
                          </div>
                        </div>
                      )}
                      {saleDetails.finaltotalusd > 0 && (
                        <div className="text-left">
                          <div className="text-xs text-muted-foreground">المجموع النهائي (دولار)</div>
                          <div className="text-xl font-bold text-green-600" dir="ltr">
                            ${saleDetails.finaltotalusd.toLocaleString('en-US')}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {details.details && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">ملاحظات:</div>
                  <div className="text-sm">{details.details}</div>
                </div>
              )}

              <Separator />

              {}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">المنتجات</h3>
                  <Badge variant="secondary">{details.products.length}</Badge>
                </div>

                <div className="space-y-2">
                  {details.products.map((product, index) => (
                    <div 
                      key={product.id}
                      className="p-4 bg-card border rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                              #{index + 1}
                            </span>
                            <span className="font-medium">
                              {isPurchase 
                                ? (product as Record<string, unknown>).nameofproduct as string
                                : (product as Record<string, unknown>).productname as string}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">الكمية: </span>
                              <span className="font-medium" dir="ltr">
                                {product.quantity.toLocaleString('en-US')} {((product as Record<string, unknown>).unit as string) || ''}
                              </span>
                            </div>

                            {isPurchase && (
                              <>
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">سعر الشراء: </span>
                                  <div className="flex gap-3 mt-1">
                                    <span className="font-medium" dir="ltr">
                                      {((product as Record<string, unknown>).purchasesinglepriceiqd as number).toLocaleString('en-US')} د.ع
                                    </span>
                                    <span className="text-muted-foreground">|</span>
                                    <span className="font-medium" dir="ltr">
                                      ${((product as Record<string, unknown>).purchasesinglepriceusd as number).toLocaleString('en-US')}
                                    </span>
                                  </div>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">سعر البيع: </span>
                                  <div className="flex gap-3 mt-1">
                                    <span className="font-medium text-success" dir="ltr">
                                      {((product as Record<string, unknown>).sellsinglepriceiqd as number).toLocaleString('en-US')} د.ع
                                    </span>
                                    <span className="text-muted-foreground">|</span>
                                    <span className="font-medium text-success" dir="ltr">
                                      ${((product as Record<string, unknown>).sellsinglepriceusd as number).toLocaleString('en-US')}
                                    </span>
                                  </div>
                                </div>
                              </>
                            )}

                            {!isPurchase && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">سعر الوحدة: </span>
                                <div className="flex gap-3 mt-1">
                                  <span className="font-medium" dir="ltr">
                                    {((product as Record<string, unknown>).unitpriceiqd as number).toLocaleString('en-US')} د.ع
                                  </span>
                                  <span className="text-muted-foreground">|</span>
                                  <span className="font-medium" dir="ltr">
                                    ${((product as Record<string, unknown>).unitpriceusd as number).toLocaleString('en-US')}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="text-xs text-muted-foreground mb-1">الأجمالي</div>
                          <div className="space-y-1">
                            {isPurchase ? (
                              <>
                                <div className="font-bold" style={{ color: 'var(--theme-primary)' }} dir="ltr">
                                  {((product as Record<string, unknown>).purchasetotalpriceiqd as number).toLocaleString('en-US')} د.ع
                                </div>
                                <div className="text-sm font-semibold text-green-600" dir="ltr">
                                  ${((product as Record<string, unknown>).purchasetotalpriceusd as number).toLocaleString('en-US')}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-bold" style={{ color: 'var(--theme-success)' }} dir="ltr">
                                  {((product as Record<string, unknown>).totalpriceiqd as number).toLocaleString('en-US')} د.ع
                                </div>
                                <div className="text-sm font-semibold text-green-600" dir="ltr">
                                  ${((product as Record<string, unknown>).totalpriceusd as number).toLocaleString('en-US')}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {((product as Record<string, unknown>).notes as string) && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          📝 {(product as Record<string, unknown>).notes as string}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
