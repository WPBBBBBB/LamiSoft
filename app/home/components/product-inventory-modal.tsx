"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Package, Warehouse, DollarSign, AlertTriangle, Loader2, TrendingDown } from "lucide-react"
import { getProductInventoryDetails, type ProductSearchResult, type ProductInventoryDetails } from "@/lib/search-operations"
import { Card } from "@/components/ui/card"

interface ProductInventoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductSearchResult
}

export function ProductInventoryModal({ open, onOpenChange, product }: ProductInventoryModalProps) {
  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState<ProductInventoryDetails | null>(null)

  useEffect(() => {
    if (open && product) {
      loadDetails()
    }
  }, [open, product])

  const loadDetails = async () => {
    setLoading(true)
    try {
      const productDetails = await getProductInventoryDetails(product.productcode)
      setDetails(productDetails)
    } catch (error) {
      console.error('Error loading product details:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Package className="h-6 w-6 text-info" />
            <span>{product.displayText}</span>
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
                  <div className="text-sm text-muted-foreground mb-1">رمز المنتج</div>
                  <div className="text-xl font-bold font-mono" dir="ltr">
                    {details.productcode}
                  </div>
                  {details.refnumber && (
                    <div className="text-xs text-muted-foreground mt-1" dir="ltr">
                      Ref: {details.refnumber}
                    </div>
                  )}
                </Card>

                {}
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">الكمية الإجمالية</div>
                  <div className="text-xl font-bold" style={{ color: 'var(--theme-primary)' }}>
                    <span dir="ltr">{details.totalQuantity.toLocaleString('en-US')}</span> {details.unit || 'قطعة'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    موزعة على {details.stores.length} مخزن
                  </div>
                </Card>

                {}
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">سعر البيع</div>
                  <div className="space-y-1">
                    <div className="font-bold" style={{ color: 'var(--theme-success)' }} dir="ltr">
                      {details.sellpriceiqd.toLocaleString('en-US')} د.ع
                    </div>
                    <div className="text-sm font-semibold text-green-600" dir="ltr">
                      ${details.sellpriceusd.toLocaleString('en-US')}
                    </div>
                  </div>
                </Card>
              </div>

              <Separator />

              {}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Warehouse className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">توزيع المخازن</h3>
                  <Badge variant="secondary">{details.stores.length}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {details.stores.map((store) => {
                    const isLowStock = store.monitorenabled && store.quantity <= store.minstocklevel
                    
                    return (
                      <Card 
                        key={store.id}
                        className={`p-4 transition-all ${isLowStock ? 'border-orange-500 bg-orange-50/50' : ''}`}
                      >
                        {}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Warehouse className="h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold">{store.storename}</span>
                          </div>
                          {isLowStock && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              مخزون منخفض
                            </Badge>
                          )}
                        </div>

                        {}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">الكمية المتاحة:</span>
                            <span className="text-lg font-bold" dir="ltr">
                              {store.quantity.toLocaleString('en-US')} {details.unit || 'قطعة'}
                            </span>
                          </div>

                          {}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">سعر البيع:</span>
                            <div className="text-right">
                              <div className="font-semibold" style={{ color: 'var(--theme-success)' }} dir="ltr">
                                {store.sellpriceiqd.toLocaleString('en-US')} د.ع
                              </div>
                              <div className="text-xs text-green-600" dir="ltr">
                                ${store.sellpriceusd.toLocaleString('en-US')}
                              </div>
                            </div>
                          </div>

                          {}
                          {store.monitorenabled && (
                            <div className="pt-3 border-t space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">الحد الأدنى:</span>
                                <span className="font-medium" dir="ltr">
                                  {store.minstocklevel.toLocaleString('en-US')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">كمية إعادة الطلب:</span>
                                <span className="font-medium" dir="ltr">
                                  {store.reorderquantity.toLocaleString('en-US')}
                                </span>
                              </div>
                              {store.lowstocknotify && (
                                <Badge variant="outline" className="w-full justify-center">
                                  <TrendingDown className="h-3 w-3 ml-1" />
                                  تنبيهات المخزون مفعلة
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {}
                        {store.monitorenabled && (
                          <div className="mt-3">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${
                                  isLowStock ? 'bg-orange-500' : 'bg-green-500'
                                }`}
                                style={{ 
                                  width: `${Math.min((store.quantity / (store.minstocklevel * 2)) * 100, 100)}%` 
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </div>

              {}
              <Card className="p-4 bg-muted/30">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--theme-primary)' }} dir="ltr">
                      {details.stores.length}
                    </div>
                    <div className="text-xs text-muted-foreground">إجمالي المخازن</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--theme-success)' }} dir="ltr">
                      {details.totalQuantity.toLocaleString('en-US')}
                    </div>
                    <div className="text-xs text-muted-foreground">إجمالي الكمية</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600" dir="ltr">
                      {details.stores.filter(s => s.monitorenabled && s.quantity <= s.minstocklevel).length}
                    </div>
                    <div className="text-xs text-muted-foreground">مخازن منخفضة</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600" dir="ltr">
                      {details.stores.filter(s => s.monitorenabled).length}
                    </div>
                    <div className="text-xs text-muted-foreground">مخازن مراقبة</div>
                  </div>
                </div>
              </Card>
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
