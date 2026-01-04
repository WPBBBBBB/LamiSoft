"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, FileText, ShoppingCart, Package, User, UserPlus, ScanLine, Filter, Clock, X, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { searchSaleByBarcode, type SearchResult, type ProductSearchResult, type CustomerSearchResult } from "@/lib/search-operations"
import { 
  saveSearchHistory, 
  getSearchHistory, 
  deleteSearchHistoryItem, 
  clearSearchHistory,
  type SearchHistory 
} from "@/lib/search-history-operations"
import { useAuth } from "@/contexts/auth-context"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import { InvoicePreviewModal } from "./invoice-preview-modal"
import { ProductInventoryModal } from "./product-inventory-modal"
import { CustomerProfileModal } from "./customer-profile-modal"
import { BarcodeScannerModal } from "./barcode-scanner-modal"
import { toast } from "sonner"
import { useDebounce } from "@/lib/hooks"

export function SearchBar() {
  const router = useRouter()
  const { currentLanguage } = useSettings()
  const { currentUser } = useAuth()
  const [searchValue, setSearchValue] = useState("")
  const debouncedSearchValue = useDebounce(searchValue, 300)
  const [searchFilter, setSearchFilter] = useState<string>("all")
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[]>([])
  const [invoiceResults, setInvoiceResults] = useState<SearchResult[]>([])
  const [productResults, setProductResults] = useState<ProductSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<SearchResult | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null)
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)
  const [showProductPreview, setShowProductPreview] = useState(false)
  const [showCustomerProfile, setShowCustomerProfile] = useState(false)
  const [searchPerformed, setSearchPerformed] = useState(false)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  // تحميل تاريخ البحث عند تحميل الصفحة
  useEffect(() => {
    if (currentUser?.id) {
      loadSearchHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  const loadSearchHistory = async () => {
    if (!currentUser?.id) return
    const history = await getSearchHistory(currentUser.id, 10)
    setSearchHistory(history)
  }

  const handleDeleteHistoryItem = async (id: string) => {
    const success = await deleteSearchHistoryItem(id)
    if (success) {
      setSearchHistory(prev => prev.filter(item => item.id !== id))
      toast.success(t("تم حذف عملية البحث"))
    }
  }

  const handleClearAllHistory = async () => {
    if (!currentUser?.id) return
    const success = await clearSearchHistory(currentUser.id)
    if (success) {
      setSearchHistory([])
      toast.success(t("تم حذف جميع عمليات البحث"))
    }
  }

  // البحث باستخدام PostgreSQL Full-Text Search
  const performFullTextSearch = async (query: string, filter: string) => {
    try {
      const response = await fetch(`/api/fulltext-search?q=${encodeURIComponent(query)}&filter=${filter}`)
      
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      return data
    } catch (error) {
      return null
    }
  }

  useEffect(() => {
    if (debouncedSearchValue.trim().length < 2) {
      setCustomerResults([])
      setInvoiceResults([])
      setProductResults([])
      setShowHistory(true)
      setShowSearchResults(false)
      return
    }
    setSearchLoading(true)
    setSearchPerformed(false)
    setShowHistory(false)
    setShowSearchResults(true)
    
    const performSearch = async () => {
      try {
        // البحث باستخدام PostgreSQL Full-Text Search
        const fullTextResults = await performFullTextSearch(debouncedSearchValue, searchFilter)

        if (fullTextResults) {
          // استخدام نتائج PostgreSQL Full-Text Search
          setInvoiceResults(fullTextResults.invoices || [])
          setProductResults(fullTextResults.products || [])
          setCustomerResults(fullTextResults.customers || [])
          
          // حفظ في التاريخ بعد نجاح البحث
          if (currentUser?.id && debouncedSearchValue.trim()) {
            saveSearchHistory(currentUser.id, debouncedSearchValue, searchFilter).then(() => {
              loadSearchHistory()
            })
          }
        } else {
          // Fallback: استخدام البحث التقليدي من Supabase
          const { searchInvoices, searchProducts, searchCustomers } = await import('@/lib/search-operations')
          
          if (searchFilter === 'all' || searchFilter === 'invoices') {
            const invoices = await searchInvoices(debouncedSearchValue)
            setInvoiceResults(invoices)
          } else {
            setInvoiceResults([])
          }

          if (searchFilter === 'all' || searchFilter === 'products') {
            const products = await searchProducts(debouncedSearchValue)
            setProductResults(products)
          } else {
            setProductResults([])
          }

          if (searchFilter === 'all' || searchFilter === 'customers') {
            const customers = await searchCustomers(debouncedSearchValue)
            setCustomerResults(customers)
          } else {
            setCustomerResults([])
          }
        }
        
        setSearchPerformed(true)
      } catch (err) {
        setCustomerResults([])
        setInvoiceResults([])
        setProductResults([])
        setSearchPerformed(true)
      } finally {
        setSearchLoading(false)
      }
    }
    
    performSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchValue, searchFilter])

  const handleInvoiceClick = (invoice: SearchResult) => {
    setSelectedInvoice(invoice)
    setShowInvoicePreview(true)
    setSearchValue("")
    setInvoiceResults([])
    setProductResults([])
    setCustomerResults([])
    setShowSearchResults(false)
    setShowHistory(false)
  }

  const handleProductClick = (product: ProductSearchResult) => {
    setSelectedProduct(product)
    setShowProductPreview(true)
    setSearchValue("")
    setInvoiceResults([])
    setProductResults([])
    setCustomerResults([])
    setShowSearchResults(false)
    setShowHistory(false)
  }

  const handleCustomerClick = (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer)
    setShowCustomerProfile(true)
    setSearchValue("")
    setInvoiceResults([])
    setProductResults([])
    setCustomerResults([])
    setShowSearchResults(false)
    setShowHistory(false)
  }

  const handleBarcodeScanned = async (code: string) => {
    toast.loading('جاري البحث عن القائمة...')
    
    try {
      let barcodeToSearch = code
      
      // إذا كان QR Code بصيغة SALE-S-00001-2000013788160
      if (code.startsWith('SALE-')) {
        const parts = code.split('-')
        // الباركود هو آخر جزء
        barcodeToSearch = parts[parts.length - 1]
        }
      
      const result = await searchSaleByBarcode(barcodeToSearch)
      toast.dismiss()
      
      if (result) {
        toast.success('تم العثور على القائمة!')
        setSelectedInvoice(result)
        setShowInvoicePreview(true)
      } else {
        toast.error(`لم يتم العثور على قائمة بهذا الرمز: ${code}`)
      }
    } catch (error) {
      toast.dismiss()
      toast.error('حدث خطأ في البحث')
      }
  }

  return (
    <>
      <div className="w-full space-y-4">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 theme-icon" />
            
            {/* زر الفلتر داخل مربع البحث */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-10 top-1/2 -translate-y-1/2 h-8 px-2 text-xs gap-1"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              style={{ 
                color: searchFilter !== 'all' ? 'var(--theme-primary)' : 'inherit',
                fontWeight: searchFilter !== 'all' ? '600' : 'normal'
              }}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>
                {searchFilter === 'all' ? 'الكل' :
                 searchFilter === 'invoices' ? 'القوائم' :
                 searchFilter === 'products' ? 'المنتجات' : 'الزبائن'}
              </span>
            </Button>

            <Input
              type="text"
              placeholder="البحث عن قوائم، زبائن، منتجات..."
              className="h-12 pr-32 pl-12 text-base"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onFocus={() => {
                if (!searchValue.trim()) {
                  setShowHistory(true)
                } else {
                  setShowSearchResults(true)
                }
              }}
              onBlur={() => {
                // تأخير بسيط للسماح بالنقر على عناصر القائمة
                setTimeout(() => {
                  setShowFilterMenu(false)
                  setShowSearchResults(false)
                  setShowHistory(false)
                }, 200)
              }}
            />
            
            {/* زر مسح الباركود */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setShowBarcodeScanner(true)}
              title="مسح باركود"
            >
              <ScanLine className="h-5 w-5" style={{ color: 'var(--theme-primary)' }} />
            </Button>

            {/* قائمة الفلتر المنسدلة */}
            {showFilterMenu && (
              <div className="absolute right-0 top-full z-30 bg-card border rounded-lg shadow-lg mt-1 w-40 overflow-hidden">
                <div 
                  className={`px-3 py-2 cursor-pointer hover:bg-accent transition-colors ${searchFilter === 'all' ? 'bg-accent font-semibold' : ''}`}
                  onClick={() => {
                    setSearchFilter('all')
                    setShowFilterMenu(false)
                  }}
                >
                  <span className="text-sm">الكل</span>
                </div>
                <div 
                  className={`px-3 py-2 cursor-pointer hover:bg-accent transition-colors ${searchFilter === 'invoices' ? 'bg-accent font-semibold' : ''}`}
                  onClick={() => {
                    setSearchFilter('invoices')
                    setShowFilterMenu(false)
                  }}
                >
                  <span className="text-sm">القوائم</span>
                </div>
                <div 
                  className={`px-3 py-2 cursor-pointer hover:bg-accent transition-colors ${searchFilter === 'products' ? 'bg-accent font-semibold' : ''}`}
                  onClick={() => {
                    setSearchFilter('products')
                    setShowFilterMenu(false)
                  }}
                >
                  <span className="text-sm">المنتجات</span>
                </div>
                <div 
                  className={`px-3 py-2 cursor-pointer hover:bg-accent transition-colors ${searchFilter === 'customers' ? 'bg-accent font-semibold' : ''}`}
                  onClick={() => {
                    setSearchFilter('customers')
                    setShowFilterMenu(false)
                  }}
                >
                  <span className="text-sm">الزبائن</span>
                </div>
              </div>
            )}
            
            {/* تاريخ البحث */}
            {showHistory && searchHistory.length > 0 && !searchValue.trim() && (
              <div className="absolute left-0 right-0 top-full z-20 bg-card border rounded-lg shadow-lg mt-2 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>عمليات البحث الأخيرة</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllHistory}
                    className="h-7 text-xs text-danger hover:text-danger"
                  >
                    <Trash2 className="h-3 w-3 ml-1" />
                    مسح الكل
                  </Button>
                </div>
                {searchHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 hover:bg-accent cursor-pointer flex items-center justify-between border-b last:border-0 transition-colors group"
                    onClick={() => {
                      setSearchValue(item.search_query)
                      setShowHistory(false)
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.search_query}</span>
                      {item.search_type && item.search_type !== 'all' && (
                        <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                          {item.search_type === 'invoices' ? 'القوائم' : 
                           item.search_type === 'products' ? 'المنتجات' : 
                           item.search_type === 'customers' ? 'الزبائن' : 'الكل'}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteHistoryItem(item.id)
                      }}
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-danger" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* نتائج البحث */}
            {searchValue.trim() && showSearchResults && (
              <div className="absolute left-0 right-0 top-full z-20 bg-card border rounded-lg shadow-lg mt-2 max-h-96 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-center text-muted-foreground">{t('searching', currentLanguage.code)}</div>
                ) : (
                  <div>
                    {}
                    {invoiceResults.length > 0 && (
                      <div className="border-b">
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                          القوائم ({invoiceResults.length})
                        </div>
                        {invoiceResults.map(invoice => (
                          <div 
                            key={invoice.id}
                            onClick={() => handleInvoiceClick(invoice)}
                            className="p-3 hover:bg-accent cursor-pointer flex items-center gap-3 border-b last:border-0 transition-colors"
                          >
                            <div className="shrink-0">
                              {invoice.type === 'purchase' ? (
                                <ShoppingCart className="h-5 w-5 text-danger" />
                              ) : (
                                <FileText className="h-5 w-5 text-success" />
                              )}
                            </div>
                            <div className="flex-1 text-right">
                              <div className="font-medium">{invoice.displayText}</div>
                              <div className="text-xs text-muted-foreground mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>
                                {invoice.type === 'purchase' ? invoice.supplierName : invoice.customerName}
                                <span className="mx-2">•</span>
                                {new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                              </div>
                            </div>
                            <div className="text-left text-sm" dir="ltr">
                              {invoice.totalIQD ? (
                                <div className="font-semibold" style={{ color: 'var(--theme-primary)' }}>
                                  {invoice.totalIQD.toLocaleString('en-US')} د.ع
                                </div>
                              ) : null}
                              {invoice.totalUSD ? (
                                <div className="text-xs text-muted-foreground">
                                  ${invoice.totalUSD.toLocaleString('en-US')}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {}
                    {customerResults.length > 0 && (
                      <div className="border-b">
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                          الأشخاص ({customerResults.length})
                        </div>
                        {customerResults.map(cust => (
                          <div 
                            key={cust.id}
                            onClick={() => handleCustomerClick(cust)}
                            className="p-3 hover:bg-accent cursor-pointer flex items-center gap-3 border-b last:border-0 transition-colors"
                          >
                            <div className="shrink-0">
                              <User className="h-5 w-5 text-warning" />
                            </div>
                            <div className="flex-1 text-right">
                              <div className="font-medium">{cust.customer_name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {cust.type}
                                {cust.phone_number && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span dir="ltr">{cust.phone_number}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {(cust.balanceiqd !== 0 || cust.balanceusd !== 0) && (
                              <div className="text-left text-sm">
                                {cust.balanceiqd !== 0 && (
                                  <div className="font-semibold" style={{ color: cust.balanceiqd > 0 ? 'var(--theme-success)' : 'var(--theme-danger)' }} dir="ltr">
                                    {cust.balanceiqd.toLocaleString('en-US')} د.ع
                                  </div>
                                )}
                                {cust.balanceusd !== 0 && (
                                  <div className="text-xs" style={{ color: cust.balanceusd > 0 ? 'var(--theme-success)' : 'var(--theme-danger)' }} dir="ltr">
                                    ${cust.balanceusd.toLocaleString('en-US')}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {}
                    {productResults.length > 0 && (
                      <div className="border-b">
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                          المنتجات ({productResults.length})
                        </div>
                        {productResults.map(product => (
                          <div 
                            key={product.id}
                            onClick={() => handleProductClick(product)}
                            className="p-3 hover:bg-accent cursor-pointer flex items-center gap-3 border-b last:border-0 transition-colors"
                          >
                            <div className="shrink-0">
                              <Package className="h-5 w-5 text-info" />
                            </div>
                            <div className="flex-1 text-right">
                              <div className="font-medium">{product.displayText}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                الكمية الإجمالية: 
                                <span className="font-semibold mx-1" dir="ltr">
                                  {product.totalQuantity.toLocaleString('en-US')}
                                </span>
                                {product.unit}
                                <span className="mx-2">•</span>
                                في {product.storesCount} مخزن
                              </div>
                            </div>
                            <div className="text-left text-sm">
                              <div className="font-semibold" style={{ color: 'var(--theme-primary)' }} dir="ltr">
                                {product.sellpriceiqd.toLocaleString('en-US')} د.ع
                              </div>
                              <div className="text-xs text-muted-foreground" dir="ltr">
                                ${product.sellpriceusd.toLocaleString('en-US')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {}
                    {searchPerformed && invoiceResults.length === 0 && customerResults.length === 0 && productResults.length === 0 && (
                      <div className="p-6 text-center space-y-4">
                        <div className="text-muted-foreground">
                          <div className="text-base font-semibold mb-2">
                            لا توجد بيانات حول &ldquo;{searchValue}&rdquo;
                          </div>
                          <div className="text-sm">
                            هل تود إضافته؟
                          </div>
                        </div>
                        <Button
                          onClick={() => router.push('/customers/add')}
                          className="gap-2"
                          variant="outline"
                        >
                          <UserPlus className="h-4 w-4" />
                          إضافة زبون جديد
                          <kbd className="mr-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            <span className="text-xs">Alt</span>+<span className="text-xs">Shift</span>+N
                          </kbd>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {}
      {selectedInvoice && (
        <InvoicePreviewModal
          open={showInvoicePreview}
          onOpenChange={setShowInvoicePreview}
          invoice={selectedInvoice}
        />
      )}

      {}
      {selectedProduct && (
        <ProductInventoryModal
          open={showProductPreview}
          onOpenChange={setShowProductPreview}
          product={selectedProduct}
        />
      )}

      {}
      {selectedCustomer && (
        <CustomerProfileModal
          open={showCustomerProfile}
          onOpenChange={setShowCustomerProfile}
          customer={selectedCustomer}
        />
      )}

      {/* Modal ماسح الباركود */}
      <BarcodeScannerModal
        open={showBarcodeScanner}
        onOpenChange={setShowBarcodeScanner}
        onBarcodeScanned={handleBarcodeScanned}
      />
    </>
  )
}
