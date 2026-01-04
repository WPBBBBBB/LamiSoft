import { supabase } from "./supabase"

export interface SearchResult {
  id: string
  number: string
  type: 'purchase' | 'sale'
  displayText: string
  date: string
  customerName?: string
  supplierName?: string
  totalIQD?: number
  totalUSD?: number
}

export interface CustomerSearchResult {
  id: string
  customer_name: string
  type: string
  phone_number?: string
  address?: string
  balanceiqd: number
  balanceusd: number
  displayText: string
}

export interface CustomerActivity {
  id: string
  type: 'sale' | 'purchase' | 'payment'
  date: string
  number?: string
  amountIQD: number
  amountUSD: number
  description: string
  paymentType?: string
  notes?: string
}

export interface CustomerProfileDetails {
  customer: {
    id: string
    customer_name: string
    type: string
    phone_number?: string
    address?: string
    notes?: string
    balanceiqd: number
    balanceusd: number
    created_at: string
  }
  sales: Array<{
    id: string
    numberofsale: string
    datetime: string
    totalsaleiqd: number
    totalsaleusd: number
    paytype: string
    details?: string
  }>
  purchases: Array<{
    id: string
    numberofpurchase: string
    datetime: string
    totalpurchaseiqd: number
    totalpurchaseusd: number
    typeofpayment: string
    details?: string
  }>
  payments: Array<{
    id: string
    pay_date: string
    amount_iqd: number
    amount_usd: number
    currency_type: string
    transaction_type: string
    paymenttype?: string
    notes?: string
    salesmainid?: string
    purchasemainid?: string
  }>
  totalSalesIQD: number
  totalSalesUSD: number
  totalPurchasesIQD: number
  totalPurchasesUSD: number
  totalPaymentsIQD: number
  totalPaymentsUSD: number
}

export interface ProductSearchResult {
  id: string
  productcode: string
  productname: string
  displayText: string
  totalQuantity: number
  unit?: string
  sellpriceiqd: number
  sellpriceusd: number
  storesCount: number
}

export interface ProductInventoryDetails {
  id: string
  productcode: string
  productname: string
  refnumber?: string
  unit?: string
  totalQuantity: number
  sellpriceiqd: number
  sellpriceusd: number
  stores: Array<{
    id: string
    storename: string
    quantity: number
    sellpriceiqd: number
    sellpriceusd: number
    minstocklevel: number
    reorderquantity: number
    monitorenabled: boolean
    lowstocknotify: boolean
  }>
}

export interface PurchaseDetails {
  id: string
  numberofpurchase: string
  nameofsupplier: string
  datetime: string
  totalpurchaseiqd: number
  totalpurchaseusd: number
  typeofbuy: string
  typeofpayment: string
  currencytype: string
  details?: string
  products: Array<{
    id: string
    nameofproduct: string
    quantity: number
    unit: string
    purchasesinglepriceiqd: number
    purchasesinglepriceusd: number
    purchasetotalpriceiqd: number
    purchasetotalpriceusd: number
  }>
}

export interface SaleDetails {
  id: string
  numberofsale: string
  customername: string
  datetime: string
  totalsaleiqd: number
  totalsaleusd: number
  pricetype: string
  paytype: string
  currencytype: string
  details?: string
  discountenabled: boolean
  discountiqd?: number
  discountusd?: number
  finaltotaliqd: number
  finaltotalusd: number
  products: Array<{
    id: string
    productname: string
    quantity: number
    unitpriceiqd: number
    unitpriceusd: number
    totalpriceiqd: number
    totalpriceusd: number
    notes?: string
  }>
}

export async function searchInvoices(searchQuery: string): Promise<SearchResult[]> {
  if (!searchQuery || searchQuery.trim().length < 1) {
    return []
  }

  const results: SearchResult[] = []

  try {
    const { data: purchases, error: purchaseError } = await supabase
      .from('tb_purchasemain')
      .select('id, numberofpurchase, nameofsupplier, datetime, totalpurchaseiqd, totalpurchaseusd')
      .ilike('numberofpurchase', `%${searchQuery}%`)
      .order('datetime', { ascending: false })
      .limit(10)

    if (!purchaseError && purchases) {
      purchases.forEach(p => {
        results.push({
          id: p.id,
          number: p.numberofpurchase,
          type: 'purchase',
          displayText: `${p.numberofpurchase} - قائمة شراء`,
          date: p.datetime,
          supplierName: p.nameofsupplier,
          totalIQD: p.totalpurchaseiqd,
          totalUSD: p.totalpurchaseusd
        })
      })
    }

    const { data: sales, error: saleError } = await supabase
      .from('tb_salesmain')
      .select('id, numberofsale, customername, datetime, totalsaleiqd, totalsaleusd')
      .ilike('numberofsale', `%${searchQuery}%`)
      .order('datetime', { ascending: false })
      .limit(10)

    if (!saleError && sales) {
      sales.forEach(s => {
        results.push({
          id: s.id,
          number: s.numberofsale,
          type: 'sale',
          displayText: `${s.numberofsale} - قائمة بيع`,
          date: s.datetime,
          customerName: s.customername,
          totalIQD: s.totalsaleiqd,
          totalUSD: s.totalsaleusd
        })
      })
    }

    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return results
  } catch (error) {
    return []
  }
}

export async function getPurchaseDetails(purchaseId: string): Promise<PurchaseDetails | null> {
  try {
    const { data: purchase, error: mainError } = await supabase
      .from('tb_purchasemain')
      .select('*')
      .eq('id', purchaseId)
      .single()

    if (mainError || !purchase) {
      return null
    }

    const { data: products } = await supabase
      .from('tb_purchaseproductsdetails')
      .select('*')
      .eq('purchasemainid', purchaseId)
      .order('addeddate', { ascending: true })

    return {
      id: purchase.id,
      numberofpurchase: purchase.numberofpurchase,
      nameofsupplier: purchase.nameofsupplier,
      datetime: purchase.datetime,
      totalpurchaseiqd: purchase.totalpurchaseiqd,
      totalpurchaseusd: purchase.totalpurchaseusd,
      typeofbuy: purchase.typeofbuy,
      typeofpayment: purchase.typeofpayment,
      currencytype: purchase.currencytype,
      details: purchase.details,
      products: products || []
    }
  } catch (error) {
    return null
  }
}

export async function getSaleDetails(saleId: string): Promise<SaleDetails | null> {
  try {
    const { data: sale, error: mainError } = await supabase
      .from('tb_salesmain')
      .select('*')
      .eq('id', saleId)
      .single()

    if (mainError || !sale) {
      return null
    }

    const { data: products } = await supabase
      .from('tb_salesdetails')
      .select('*')
      .eq('salemainid', saleId)
      .order('addeddate', { ascending: true })

    return {
      id: sale.id,
      numberofsale: sale.numberofsale,
      customername: sale.customername,
      datetime: sale.datetime,
      totalsaleiqd: sale.totalsaleiqd,
      totalsaleusd: sale.totalsaleusd,
      pricetype: sale.pricetype,
      paytype: sale.paytype,
      currencytype: sale.currencytype,
      details: sale.details,
      discountenabled: sale.discountenabled,
      discountiqd: sale.discountiqd,
      discountusd: sale.discountusd,
      finaltotaliqd: sale.finaltotaliqd,
      finaltotalusd: sale.finaltotalusd,
      products: products || []
    }
  } catch (error) {
    return null
  }
}

export async function searchCustomers(searchQuery: string): Promise<CustomerSearchResult[]> {
  if (!searchQuery || searchQuery.trim().length < 2) {
    return []
  }

  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, customer_name, type, phone_number, address, balanceiqd, balanceusd')
      .or(`customer_name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
      .order('customer_name', { ascending: true })
      .limit(15)

    if (error) {
      return []
    }

    if (!customers || customers.length === 0) {
      return []
    }

    return customers.map(c => ({
      id: c.id,
      customer_name: c.customer_name,
      type: c.type,
      phone_number: c.phone_number,
      address: c.address,
      balanceiqd: c.balanceiqd || 0,
      balanceusd: c.balanceusd || 0,
      displayText: `${c.customer_name} - ${c.type}${c.phone_number ? ' - ' + c.phone_number : ''}`
    }))
  } catch (error) {
    return []
  }
}

export async function searchProducts(searchQuery: string): Promise<ProductSearchResult[]> {
  if (!searchQuery || searchQuery.trim().length < 1) {
    return []
  }

  try {
    const { data: products, error } = await supabase
      .from('tb_inventory')
      .select('id, productcode, productname, quantity, unit, sellpriceiqd, sellpriceusd, storeid')
      .or(`productcode.ilike.%${searchQuery}%,productname.ilike.%${searchQuery}%`)
      .order('productname', { ascending: true })
      .limit(20)

    if (error || !products) {
      return []
    }

    const groupedProducts = new Map<string, ProductSearchResult>()
    
    products.forEach(p => {
      const key = p.productcode
      if (groupedProducts.has(key)) {
        const existing = groupedProducts.get(key)!
        existing.totalQuantity += p.quantity
        existing.storesCount += 1
      } else {
        groupedProducts.set(key, {
          id: p.id,
          productcode: p.productcode,
          productname: p.productname,
          displayText: `${p.productcode} - ${p.productname}`,
          totalQuantity: p.quantity,
          unit: p.unit,
          sellpriceiqd: p.sellpriceiqd,
          sellpriceusd: p.sellpriceusd,
          storesCount: 1
        })
      }
    })

    return Array.from(groupedProducts.values())
  } catch (error) {
    return []
  }
}

export async function getProductInventoryDetails(productCode: string): Promise<ProductInventoryDetails | null> {
  try {
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('tb_inventory')
      .select('*')
      .eq('productcode', productCode)

    if (inventoryError) {
      return null
    }

    if (!inventoryItems || inventoryItems.length === 0) {
      return null
    }

    const storeIds = [...new Set(inventoryItems.map(item => item.storeid))]
    const { data: stores } = await supabase
      .from('tb_store')
      .select('id, storename')
      .in('id', storeIds)

    const storesMap = new Map()
    if (stores) {
      stores.forEach(store => {
        storesMap.set(store.id, store.storename)
      })
    }

    const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0)

    const storesList = inventoryItems.map(item => ({
      id: item.storeid,
      storename: storesMap.get(item.storeid) || 'مخزن غير محدد',
      quantity: item.quantity,
      sellpriceiqd: item.sellpriceiqd,
      sellpriceusd: item.sellpriceusd,
      minstocklevel: item.minstocklevel || 0,
      reorderquantity: item.reorderquantity || 0,
      monitorenabled: item.monitorenabled || false,
      lowstocknotify: item.lowstocknotify || false
    }))

    return {
      id: inventoryItems[0].id,
      productcode: inventoryItems[0].productcode,
      productname: inventoryItems[0].productname,
      refnumber: inventoryItems[0].refnumber,
      unit: inventoryItems[0].unit,
      totalQuantity,
      sellpriceiqd: inventoryItems[0].sellpriceiqd,
      sellpriceusd: inventoryItems[0].sellpriceusd,
      stores: storesList
    }
  } catch (error) {
    return null
  }
}

/**
 * البحث عن قائمة بيع بالباركود
 */
export async function searchSaleByBarcode(barcode: string): Promise<SearchResult | null> {
  if (!barcode || barcode.trim().length === 0) {
    return null
  }

  try {
    const { data: sale, error } = await supabase
      .from('tb_salesmain')
      .select('id, numberofsale, customername, datetime, totalsaleiqd, totalsaleusd')
      .eq('barcode', barcode.trim())
      .maybeSingle()

    if (error) {
      return null
    }

    if (!sale) {
      return null
    }

    return {
      id: sale.id,
      number: sale.numberofsale,
      type: 'sale',
      displayText: `${sale.numberofsale} - قائمة بيع`,
      date: sale.datetime,
      customerName: sale.customername,
      totalIQD: sale.totalsaleiqd,
      totalUSD: sale.totalsaleusd
    }
  } catch (error) {
    return null
  }
}

export async function getCustomerProfileDetails(customerId: string): Promise<CustomerProfileDetails | null> {
  try {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      return null
    }

    const { data: sales } = await supabase
      .from('tb_salesmain')
      .select('id, numberofsale, datetime, totalsaleiqd, totalsaleusd, paytype, details')
      .eq('customername', customer.customer_name)
      .order('datetime', { ascending: false })

    let purchases: CustomerProfileDetails["purchases"] = []
    if (customer.type === 'مجهز') {
      const { data: purchasesData } = await supabase
        .from('tb_purchasemain')
        .select('id, numberofpurchase, datetime, totalpurchaseiqd, totalpurchaseusd, typeofpayment, details')
        .eq('nameofsupplier', customer.customer_name)
        .order('datetime', { ascending: false })

      purchases = purchasesData || []
    }

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .or(`customer_id.eq.${customerId},supplierid.eq.${customerId}`)
      .order('pay_date', { ascending: false })

    const totalSalesIQD = (sales || []).reduce((sum, s) => sum + (s.totalsaleiqd || 0), 0)
    const totalSalesUSD = (sales || []).reduce((sum, s) => sum + (s.totalsaleusd || 0), 0)
    const totalPurchasesIQD = purchases.reduce((sum, p) => sum + (p.totalpurchaseiqd || 0), 0)
    const totalPurchasesUSD = purchases.reduce((sum, p) => sum + (p.totalpurchaseusd || 0), 0)
    const totalPaymentsIQD = (payments || []).reduce((sum, p) => sum + (p.amount_iqd || 0), 0)
    const totalPaymentsUSD = (payments || []).reduce((sum, p) => sum + (p.amount_usd || 0), 0)

    return {
      customer: {
        id: customer.id,
        customer_name: customer.customer_name,
        type: customer.type,
        phone_number: customer.phone_number,
        address: customer.address,
        notes: customer.notes,
        balanceiqd: customer.balanceiqd || 0,
        balanceusd: customer.balanceusd || 0,
        created_at: customer.created_at
      },
      sales: sales || [],
      purchases,
      payments: payments || [],
      totalSalesIQD,
      totalSalesUSD,
      totalPurchasesIQD,
      totalPurchasesUSD,
      totalPaymentsIQD,
      totalPaymentsUSD
    }
  } catch (error) {
    return null
  }
}
