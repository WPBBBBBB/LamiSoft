import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { SearchResult, ProductSearchResult, CustomerSearchResult } from '@/lib/search-operations'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const filter = searchParams.get('filter') || 'all'

    if (!query || query.trim().length < 1) {
      return NextResponse.json({
        products: [],
        customers: [],
        invoices: [],
      })
    }

    const results: {
      products: ProductSearchResult[]
      customers: CustomerSearchResult[]
      invoices: SearchResult[]
    } = {
      products: [],
      customers: [],
      invoices: [],
    }

    // البحث في المنتجات باستخدام PostgreSQL Full-Text Search
    if (filter === 'all' || filter === 'products') {
      try {
        // استخدام textSearch للبحث السريع مع الفهارس
        const searchPattern = `%${query}%`
        const { data: products } = await supabase
          .from('products_with_total_quantity')
          .select('id,productcode,productname,total_quantity,unit,sellpriceiqd,sellpriceusd,stores_count')
          .or(`productname.ilike.${searchPattern},productcode.ilike.${searchPattern}`)
          .limit(20)

        if (products) {
          results.products = products.map(p => ({
            id: p.id,
            productcode: p.productcode,
            productname: p.productname,
            displayText: `${p.productname} - ${p.productcode}`,
            totalQuantity: p.total_quantity || 0,
            unit: p.unit,
            sellpriceiqd: p.sellpriceiqd || 0,
            sellpriceusd: p.sellpriceusd || 0,
            storesCount: p.stores_count || 0,
          }))
        }
      } catch (error) {
        }
    }

    // البحث في الزبائن
    if (filter === 'all' || filter === 'customers') {
      try {
        const searchPattern = `%${query}%`
        const { data: customers } = await supabase
          .from('customers')
          .select('id,customer_name,type,phone_number,address,balanceiqd,balanceusd')
          .or(`customer_name.ilike.${searchPattern},phone_number.ilike.${searchPattern}`)
          .limit(20)

        if (customers) {
          results.customers = customers.map(c => ({
            id: c.id,
            customer_name: c.customer_name,
            type: c.type,
            phone_number: c.phone_number,
            address: c.address,
            balanceiqd: c.balanceiqd || 0,
            balanceusd: c.balanceusd || 0,
            displayText: `${c.customer_name} - ${c.phone_number || ''}`,
          }))
        }
      } catch (error) {
        }
    }

    // البحث في القوائم
    if (filter === 'all' || filter === 'invoices') {
      try {
        const searchPattern = `%${query}%`
        
        // البحث في قوائم البيع (مع تحديد الأعمدة فقط)
        const { data: sales } = await supabase
          .from('tb_salesmain')
          .select('id,numberofsale,datetime,totalsaleiqd,totalsaleusd,customers(customer_name)')
          .ilike('numberofsale', searchPattern)
          .order('datetime', { ascending: false })
          .limit(10)

        // البحث في قوائم الشراء (مع تحديد الأعمدة فقط)
        const { data: purchases } = await supabase
          .from('tb_purchasemain')
          .select('id,numberofpurchase,datetime,totalpurchaseiqd,totalpurchaseusd,customers(customer_name)')
          .ilike('numberofpurchase', searchPattern)
          .order('datetime', { ascending: false })
          .limit(10)

        const invoices: SearchResult[] = []

        if (sales) {
          sales.forEach(sale => {
            invoices.push({
              id: sale.id,
              number: sale.numberofsale,
              type: 'sale',
              displayText: `قائمة بيع ${sale.numberofsale}`,
              date: sale.datetime,
              customerName: (sale.customers as unknown as { customer_name: string } | null)?.customer_name || '',
              totalIQD: sale.totalsaleiqd || 0,
              totalUSD: sale.totalsaleusd || 0,
            })
          })
        }

        if (purchases) {
          purchases.forEach(purchase => {
            invoices.push({
              id: purchase.id,
              number: purchase.numberofpurchase,
              type: 'purchase',
              displayText: `قائمة شراء ${purchase.numberofpurchase}`,
              date: purchase.datetime,
              supplierName: (purchase.customers as unknown as { customer_name: string } | null)?.customer_name || '',
              totalIQD: purchase.totalpurchaseiqd || 0,
              totalUSD: purchase.totalpurchaseusd || 0,
            })
          })
        }

        // ترتيب القوائم حسب التاريخ
        results.invoices = invoices.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      } catch (error) {
        }
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    )
  }
}
