import { supabase } from "./supabase"

// ============================================================
// Types & Interfaces
// ============================================================

export interface Supplier {
  id: string
  name: string
  type: string
  balanceiqd: number
  balanceusd: number
}

export interface PurchaseMain {
  id?: string
  purchasestoreid: string
  typeofbuy: "إعادة" | "محلي" | "استيراد"
  typeofpayment: "نقدي" | "آجل"
  nameofsupplier: string
  supplierid: string
  currency?: "دينار" | "دولار"
  numberofpurchase: string
  details?: string
  datetime: string
  amountreceivediqd: number
  amountreceivedusd: number
  totalpurchaseiqd: number
  totalpurchaseusd: number
}

export interface PurchaseProductDetail {
  id?: string
  purchasemainid?: string
  productcode1: string
  nameofproduct: string
  quantity: number
  unit: "كارتون" | "قطعة" | "لتر" | "كغم"
  purchasesinglepriceiqd: number
  purchasesinglepriceusd: number
  sellsinglepriceiqd: number
  sellsinglepriceusd: number
  details?: string
}

export interface Payment {
  id?: string
  paymentamountiqd: number
  paymentamountusd: number
  paymenttype: "قبض" | "صرف"
  supplierid: string
  customerid?: string
  purchasemainid?: string
  note?: string
  pay_date: string
}

// ============================================================
// Get Suppliers (المجهزين)
// ============================================================

// جلب جميع المجهزين مع أرصدتهم (من جدول customers مباشرة)
export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("id, customer_name, type, balanceiqd, balanceusd")
      .eq("type", "مجهز")
      .order("customer_name")

    if (error) throw error
    
    console.log('Raw suppliers data from DB:', data)
    
    // تحويل البيانات للشكل المطلوب
    return (data || []).map(item => ({
      id: item.id,
      name: item.customer_name,
      type: item.type,
      balanceiqd: item.balanceiqd || 0,
      balanceusd: item.balanceusd || 0
    }))
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    throw error
  }
}

// ============================================================
// Get Supplier by ID
// ============================================================

export async function getSupplierById(
  supplierId: string
): Promise<Supplier | null> {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("id, customer_name, type, balanceiqd, balanceusd")
      .eq("id", supplierId)
      .single()

    if (error) throw error
    
    console.log('Raw supplier data from DB:', data)
    
    if (!data) return null
    
    return {
      id: data.id,
      name: data.customer_name,
      type: data.type,
      balanceiqd: data.balanceiqd || 0,
      balanceusd: data.balanceusd || 0
    }
  } catch (error) {
    console.error("Error fetching supplier:", error)
    return null
  }
}

// ============================================================
// Create Purchase (إضافة قائمة شراء كاملة)
// ============================================================

export async function createPurchase(
  purchaseMain: PurchaseMain,
  products: PurchaseProductDetail[],
  storeId: string,
  typeOfPayment: "نقدي" | "آجل",
  currencyType: "دينار" | "دولار"
): Promise<{ success: boolean; purchaseId?: string; error?: string }> {
  try {
    // 1) إدخال السجل الرئيسي
    const { data: mainData, error: mainError } = await supabase
      .from("tb_purchasemain")
      .insert([purchaseMain])
      .select()
      .single()

    if (mainError) throw mainError

    const purchaseMainId = mainData.id

    // 2) إدخال تفاصيل المنتجات (استبعاد tempId)
    const productsWithMainId = products.map((p) => {
      const { tempId, ...productData } = p as any
      return {
        ...productData,
        purchasemainid: purchaseMainId,
      }
    })

    const { error: detailsError } = await supabase
      .from("tb_purchaseproductsdetails")
      .insert(productsWithMainId)

    if (detailsError) throw detailsError

    // 3) إضافة المواد إلى المخزن
    for (const product of products) {
      await addOrUpdateInventory(
        storeId,
        product.productcode1,
        product.nameofproduct,
        product.quantity,
        product.unit,
        product.sellsinglepriceiqd,
        product.sellsinglepriceusd
      )
    }

    // 4) تحديث رصيد المجهز (فقط إذا كان نوع الدفع آجل)
    if (typeOfPayment === "آجل") {
      // حساب المبلغ المتبقي بعد خصم المبلغ الواصل
      const remainingIQD = purchaseMain.totalpurchaseiqd - purchaseMain.amountreceivediqd
      const remainingUSD = purchaseMain.totalpurchaseusd - purchaseMain.amountreceivedusd
      
      // تحديث الرصيد حسب نوع العملة المختار فقط (بالسالب - دين علينا للمجهز)
      const balanceIQD = currencyType === "دينار" ? -remainingIQD : 0
      const balanceUSD = currencyType === "دولار" ? -remainingUSD : 0
      
      await updateSupplierBalance(
        purchaseMain.supplierid,
        balanceIQD,
        balanceUSD
      )
      
      // 5) تسجيل الدفعة الواصلة إن وجدت
      if (purchaseMain.amountreceivediqd > 0 || purchaseMain.amountreceivedusd > 0) {
        const paymentNote = `دفعة واصلة لقائمة شراء ${purchaseMain.numberofpurchase} - ${purchaseMain.nameofsupplier}`
        
        const { error: paymentError } = await supabase.from("payments").insert([{
          customer_id: purchaseMain.supplierid,
          amount_iqd: purchaseMain.amountreceivediqd,
          amount_usd: purchaseMain.amountreceivedusd,
          currency_type: purchaseMain.amountreceivediqd > 0 ? 'IQD' : 'USD',
          transaction_type: "صرف",
          notes: paymentNote,
          pay_date: new Date().toISOString(),
          supplierid: purchaseMain.supplierid,
          purchasemainid: purchaseMainId,
          paymentamountiqd: purchaseMain.amountreceivediqd,
          paymentamountusd: purchaseMain.amountreceivedusd,
          paymenttype: "صرف",
        }])
        
        if (paymentError) throw paymentError
      }
    }
    // ملاحظة: في حالة الدفع النقدي، لا يتم تحديث رصيد المجهز ولا تسجيل دفعة

    return { success: true, purchaseId: purchaseMainId }
  } catch (error) {
    console.error("Error creating purchase:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ============================================================
// Add or Update Inventory in Store
// ============================================================

async function addOrUpdateInventory(
  storeId: string,
  productCode: string,
  productName: string,
  quantity: number,
  unit: string,
  sellPriceIQD: number,
  sellPriceUSD: number
): Promise<void> {
  try {
    // التحقق من وجود المادة في المخزن
    const { data: existing, error: fetchError } = await supabase
      .from("tb_inventory")
      .select("*")
      .eq("storeid", storeId)
      .eq("productcode", productCode)
      .maybeSingle()

    if (fetchError && fetchError.code !== "PGRST116") throw fetchError

    if (existing) {
      // تحديث الكمية والأسعار
      const { error: updateError } = await supabase
        .from("tb_inventory")
        .update({
          quantity: existing.quantity + quantity,
          sellpriceiqd: sellPriceIQD,
          sellpriceusd: sellPriceUSD,
        })
        .eq("id", existing.id)

      if (updateError) throw updateError
    } else {
      // إضافة مادة جديدة
      const { error: insertError } = await supabase
        .from("tb_inventory")
        .insert([
          {
            storeid: storeId,
            productcode: productCode,
            productname: productName,
            quantity: quantity,
            unit: unit,
            sellpriceiqd: sellPriceIQD,
            sellpriceusd: sellPriceUSD,
          },
        ])

      if (insertError) throw insertError
    }
  } catch (error) {
    console.error("Error updating inventory:", error)
    throw error
  }
}

// ============================================================
// Update Supplier Balance
// ============================================================

async function updateSupplierBalance(
  supplierId: string,
  additionalIQD: number,
  additionalUSD: number
): Promise<void> {
  try {
    // جلب الرصيد الحالي
    const { data: supplier, error: fetchError } = await supabase
      .from("customers")
      .select("balanceiqd, balanceusd")
      .eq("id", supplierId)
      .single()

    if (fetchError) throw fetchError

    // تحديث الرصيد (إضافة الرصيد الجديد)
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        balanceiqd: (supplier.balanceiqd || 0) + additionalIQD,
        balanceusd: (supplier.balanceusd || 0) + additionalUSD,
        updated_at: new Date().toISOString()
      })
      .eq("id", supplierId)

    if (updateError) throw updateError
  } catch (error) {
    console.error("Error updating supplier balance:", error)
    throw error
  }
}

// ============================================================
// Get All Purchases
// ============================================================

export async function getAllPurchases(): Promise<PurchaseMain[]> {
  try {
    const { data, error } = await supabase
      .from("tb_purchasemain")
      .select(
        `
        *,
        tb_store (
          storename
        ),
        customers (
          customer_name
        )
      `
      )
      .order("datetime", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching purchases:", error)
    return []
  }
}

// ============================================================
// Get Purchase Details
// ============================================================

export async function getPurchaseDetails(
  purchaseMainId: string
): Promise<PurchaseProductDetail[]> {
  try {
    const { data, error } = await supabase
      .from("tb_purchaseproductsdetails")
      .select("*")
      .eq("purchasemainid", purchaseMainId)
      .order("addeddate")

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching purchase details:", error)
    return []
  }
}
