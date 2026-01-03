import { supabase } from "./supabase"

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

export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("id, customer_name, type, balanceiqd, balanceusd")
      .eq("type", "مجهز")
      .order("customer_name")

    if (error) throw error
    
    console.log('Raw suppliers data from DB:', data)
    
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

export async function createPurchase(
  purchaseMain: PurchaseMain,
  products: PurchaseProductDetail[],
  storeId: string,
  typeOfPayment: "نقدي" | "آجل",
  currencyType: "دينار" | "دولار",
  priceUpdateDecisions?: Map<string, boolean>
): Promise<{ success: boolean; purchaseId?: string; error?: string }> {
  try {
    const { data: mainData, error: mainError } = await supabase
      .from("tb_purchasemain")
      .insert([purchaseMain])
      .select()
      .single()

    if (mainError) throw mainError

    const purchaseMainId = mainData.id

    const productsWithMainId = products.map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tempId, ...productData } = p as PurchaseProductDetail & { tempId?: string }
      return {
        purchasemainid: purchaseMainId,
        productcode1: productData.productcode1,
        nameofproduct: productData.nameofproduct,
        quantity: productData.quantity,
        unit: productData.unit,
        purchasesinglepriceiqd: productData.purchasesinglepriceiqd || 0,
        purchasesinglepriceusd: productData.purchasesinglepriceusd || 0,
        sellsinglepriceiqd: productData.sellsinglepriceiqd || 0,
        sellsinglepriceusd: productData.sellsinglepriceusd || 0,
        purchasetotalpriceiqd: (productData.quantity || 0) * (productData.purchasesinglepriceiqd || 0),
        purchasetotalpriceusd: (productData.quantity || 0) * (productData.purchasesinglepriceusd || 0),
        details: productData.details || null,
      }
    })

    console.log('Products to insert:', JSON.stringify(productsWithMainId, null, 2))

    const { error: detailsError } = await supabase
      .from("tb_purchaseproductsdetails")
      .insert(productsWithMainId)

    if (detailsError) throw detailsError

    for (const product of products) {
      const shouldUpdatePrice = priceUpdateDecisions?.get(product.productcode1) ?? true
      
      await addOrUpdateInventory(
        storeId,
        product.productcode1,
        product.nameofproduct,
        product.quantity,
        product.unit,
        product.sellsinglepriceiqd,
        product.sellsinglepriceusd,
        shouldUpdatePrice
      )
    }

    if (typeOfPayment === "آجل") {
      const remainingIQD = purchaseMain.totalpurchaseiqd - purchaseMain.amountreceivediqd
      const remainingUSD = purchaseMain.totalpurchaseusd - purchaseMain.amountreceivedusd
      
      const balanceIQD = currencyType === "دينار" ? -remainingIQD : 0
      const balanceUSD = currencyType === "دولار" ? -remainingUSD : 0
      
      await updateSupplierBalance(
        purchaseMain.supplierid,
        balanceIQD,
        balanceUSD
      )
      
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

    return { success: true, purchaseId: purchaseMainId }
  } catch (error) {
    console.error("Error creating purchase:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function updatePurchase(
  purchaseId: string,
  purchaseMain: PurchaseMain,
  products: PurchaseProductDetail[],
  storeId: string
): Promise<{ success: boolean; purchaseId?: string; error?: string }> {
  let step = "start"

  try {
    if (!purchaseId) {
      return { success: false, error: "معرّف القائمة غير صالح" }
    }

    step = "fetch-old"
    const [oldMain, oldDetails] = await Promise.all([
      getPurchaseById(purchaseId),
      getPurchaseDetails(purchaseId),
    ])

    if (!oldMain) {
      return { success: false, error: "لم يتم العثور على القائمة المطلوبة" }
    }

    const oldStoreId = oldMain.purchasestoreid

    step = "update-main"
    const { error: mainUpdateError } = await supabase
      .from("tb_purchasemain")
      .update({
        numberofpurchase: purchaseMain.numberofpurchase,
        typeofbuy: purchaseMain.typeofbuy,
        typeofpayment: purchaseMain.typeofpayment,
        currencytype: purchaseMain.currency,
        purchasestoreid: purchaseMain.purchasestoreid,
        supplierid: purchaseMain.supplierid,
        nameofsupplier: purchaseMain.nameofsupplier,
        datetime: purchaseMain.datetime,
        details: purchaseMain.details,
        currency: purchaseMain.currency,
        amountreceivediqd: purchaseMain.amountreceivediqd,
        amountreceivedusd: purchaseMain.amountreceivedusd,
        totalpurchaseiqd: purchaseMain.totalpurchaseiqd,
        totalpurchaseusd: purchaseMain.totalpurchaseusd,
      })
      .eq("id", purchaseId)

    if (mainUpdateError) throw mainUpdateError

    step = "delete-old-details"
    const { error: deleteDetailsError } = await supabase
      .from("tb_purchaseproductsdetails")
      .delete()
      .eq("purchasemainid", purchaseId)

    if (deleteDetailsError) throw deleteDetailsError

    step = "insert-new-details"
    const productsWithMainId = products.map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tempId, ...productData } = p as PurchaseProductDetail & { tempId?: string }
      return {
        purchasemainid: purchaseId,
        productcode1: productData.productcode1,
        nameofproduct: productData.nameofproduct,
        quantity: productData.quantity,
        unit: productData.unit,
        purchasesinglepriceiqd: productData.purchasesinglepriceiqd || 0,
        purchasesinglepriceusd: productData.purchasesinglepriceusd || 0,
        sellsinglepriceiqd: productData.sellsinglepriceiqd || 0,
        sellsinglepriceusd: productData.sellsinglepriceusd || 0,
        purchasetotalpriceiqd: (productData.quantity || 0) * (productData.purchasesinglepriceiqd || 0),
        purchasetotalpriceusd: (productData.quantity || 0) * (productData.purchasesinglepriceusd || 0),
        details: productData.details || null,
      }
    })

    const { error: insertDetailsError } = await supabase
      .from("tb_purchaseproductsdetails")
      .insert(productsWithMainId)

    if (insertDetailsError) throw insertDetailsError

    // معالجة المخزون
    const buildQtyMap = (details: PurchaseProductDetail[]) => {
      const map = new Map<string, number>()
      for (const d of details) {
        const code = String(d.productcode1 || "").trim()
        if (!code) continue
        const qty = Number(d.quantity || 0)
        map.set(code, (map.get(code) || 0) + qty)
      }
      return map
    }

    if (oldStoreId !== storeId) {
      step = "inventory-store-changed-remove"
      // إزالة من المخزن القديم
      for (const detail of oldDetails) {
        await reduceInventoryFromPurchase(oldStoreId, detail.productcode1, Number(detail.quantity || 0))
      }

      step = "inventory-store-changed-add"
      // إضافة للمخزن الجديد (بدون تحديث الأسعار)
      for (const product of products) {
        await addOrUpdateInventory(
          storeId,
          product.productcode1,
          product.nameofproduct,
          product.quantity,
          product.unit,
          product.sellsinglepriceiqd,
          product.sellsinglepriceusd,
          false // عدم تحديث الأسعار عند التعديل
        )
      }
    } else {
      step = "inventory-adjust-delta"
      const oldMap = buildQtyMap(oldDetails)
      const newMap = buildQtyMap(products)
      const allCodes = new Set<string>([...oldMap.keys(), ...newMap.keys()])

      for (const code of allCodes) {
        const oldQty = oldMap.get(code) || 0
        const newQty = newMap.get(code) || 0
        const delta = newQty - oldQty

        if (delta > 0) {
          // زيادة الكمية (بدون تحديث الأسعار)
          const product = products.find(p => p.productcode1 === code)
          if (product) {
            await addOrUpdateInventory(
              storeId,
              code,
              product.nameofproduct,
              delta,
              product.unit,
              product.sellsinglepriceiqd,
              product.sellsinglepriceusd,
              false // عدم تحديث الأسعار عند التعديل
            )
          }
        } else if (delta < 0) {
          // تقليل الكمية
          await reduceInventoryFromPurchase(storeId, code, Math.abs(delta))
        }
      }
    }

    // معالجة رصيد المجهز
    step = "supplier-balance"
    const computeBalanceDelta = (main: PurchaseMain) => {
      if (main.typeofpayment !== "آجل") return { iqd: 0, usd: 0 }
      const remainingIQD = (main.totalpurchaseiqd || 0) - (main.amountreceivediqd || 0)
      const remainingUSD = (main.totalpurchaseusd || 0) - (main.amountreceivedusd || 0)
      return {
        iqd: (main.currency === "دينار" ? -remainingIQD : 0),
        usd: (main.currency === "دولار" ? -remainingUSD : 0),
      }
    }

    const oldDelta = computeBalanceDelta(oldMain)
    const newDelta = computeBalanceDelta(purchaseMain)

    const hasAnyBalanceEffect =
      oldDelta.iqd !== 0 || oldDelta.usd !== 0 || newDelta.iqd !== 0 || newDelta.usd !== 0

    if (hasAnyBalanceEffect) {
      if (oldMain.supplierid !== purchaseMain.supplierid) {
        // تغير المجهز
        await updateSupplierBalance(oldMain.supplierid, -oldDelta.iqd, -oldDelta.usd)
        await updateSupplierBalance(purchaseMain.supplierid, newDelta.iqd, newDelta.usd)
      } else {
        // نفس المجهز
        await updateSupplierBalance(
          purchaseMain.supplierid,
          newDelta.iqd - oldDelta.iqd,
          newDelta.usd - oldDelta.usd
        )
      }
    }

    // حذف الدفعات القديمة وإضافة الجديدة إذا لزم الأمر
    step = "update-payments"
    await supabase
      .from("payments")
      .delete()
      .eq("purchasemainid", purchaseId)

    if (purchaseMain.typeofpayment === "آجل" && (purchaseMain.amountreceivediqd > 0 || purchaseMain.amountreceivedusd > 0)) {
      const paymentNote = `دفعة واصلة لقائمة شراء ${purchaseMain.numberofpurchase} - ${purchaseMain.nameofsupplier}`
      
      await supabase.from("payments").insert([{
        customer_id: purchaseMain.supplierid,
        amount_iqd: purchaseMain.amountreceivediqd,
        amount_usd: purchaseMain.amountreceivedusd,
        currency_type: purchaseMain.amountreceivediqd > 0 ? 'IQD' : 'USD',
        transaction_type: "صرف",
        notes: paymentNote,
        pay_date: new Date().toISOString(),
        supplierid: purchaseMain.supplierid,
        purchasemainid: purchaseId,
        paymentamountiqd: purchaseMain.amountreceivediqd,
        paymentamountusd: purchaseMain.amountreceivedusd,
        paymenttype: "صرف",
      }])
    }

    return { success: true, purchaseId }
  } catch (error) {
    const getErrorInfo = (err: unknown) => {
      if (!err) return { message: "Unknown error", details: "" }
      if (err instanceof Error) {
        return { message: err.message || String(err), details: err.stack || "" }
      }
      if (typeof err === "string") return { message: err, details: "" }
      if (typeof err === "object") {
        const anyErr = err as Record<string, unknown>
        const message = anyErr.message || anyErr.error_description || anyErr.details || anyErr.hint || String(err)
        return { message: String(message), details: JSON.stringify(anyErr) }
      }
      return { message: String(err), details: "" }
    }

    const info = getErrorInfo(error)
    console.error("Error updating purchase:", { step, info })

    return { success: false, error: `فشل تعديل قائمة الشراء (${step}): ${info.message}` }
  }
}

export async function checkProductsPriceConflicts(
  storeId: string,
  products: PurchaseProductDetail[]
): Promise<{
  success: boolean
  conflicts: Array<{
    product: PurchaseProductDetail
    existingPriceIQD: number
    existingPriceUSD: number
    newPriceIQD: number
    newPriceUSD: number
  }>
  error?: string
}> {
  try {
    const conflicts: Array<{
      product: PurchaseProductDetail
      existingPriceIQD: number
      existingPriceUSD: number
      newPriceIQD: number
      newPriceUSD: number
    }> = []

    for (const product of products) {
      const { data: existing, error } = await supabase
        .from("tb_inventory")
        .select("sellpriceiqd, sellpriceusd")
        .eq("storeid", storeId)
        .eq("productcode", product.productcode1)
        .maybeSingle()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      if (existing) {
        const pricesDiffer =
          existing.sellpriceiqd !== product.sellsinglepriceiqd ||
          existing.sellpriceusd !== product.sellsinglepriceusd

        if (pricesDiffer) {
          conflicts.push({
            product,
            existingPriceIQD: existing.sellpriceiqd || 0,
            existingPriceUSD: existing.sellpriceusd || 0,
            newPriceIQD: product.sellsinglepriceiqd,
            newPriceUSD: product.sellsinglepriceusd,
          })
        }
      }
    }

    return { success: true, conflicts }
  } catch (error) {
    console.error("Error checking price conflicts:", error)
    return {
      success: false,
      conflicts: [],
      error: "فشل التحقق من الأسعار",
    }
  }
}

async function addOrUpdateInventory(
  storeId: string,
  productCode: string,
  productName: string,
  quantity: number,
  unit: string,
  sellPriceIQD: number,
  sellPriceUSD: number,
  updatePrices: boolean = true
): Promise<void> {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from("tb_inventory")
      .select("*")
      .eq("storeid", storeId)
      .eq("productcode", productCode)
      .maybeSingle()

    if (fetchError && fetchError.code !== "PGRST116") throw fetchError

    if (existing) {
      // تحديث المنتج الموجود
      const updateData: Partial<{
        quantity: number
        sellpriceiqd: number
        sellpriceusd: number
      }> = {
        quantity: existing.quantity + quantity,
      }
      
      // تحديث الأسعار فقط إذا تم الطلب
      if (updatePrices) {
        updateData.sellpriceiqd = sellPriceIQD
        updateData.sellpriceusd = sellPriceUSD
      }
      
      const { error: updateError } = await supabase
        .from("tb_inventory")
        .update(updateData)
        .eq("id", existing.id)

      if (updateError) throw updateError
    } else {
      // إضافة منتج جديد
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

async function updateSupplierBalance(
  supplierId: string,
  additionalIQD: number,
  additionalUSD: number
): Promise<void> {
  try {
    const { data: supplier, error: fetchError } = await supabase
      .from("customers")
      .select("balanceiqd, balanceusd")
      .eq("id", supplierId)
      .single()

    if (fetchError) throw fetchError

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

export async function getPurchaseById(purchaseId: string): Promise<PurchaseMain | null> {
  try {
    const { data, error } = await supabase
      .from("tb_purchasemain")
      .select("*")
      .eq("id", purchaseId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error fetching purchase:", error)
    return null
  }
}

export async function deletePurchase(purchaseId: string): Promise<{ 
  success: boolean; 
  error?: string;
  restoredAmount?: { iqd: number; usd: number };
  supplierName?: string;
  purchaseNumber?: string;
}> {
  try {
    // 1️⃣ قراءة بيانات القائمة قبل الحذف
    const purchaseMain = await getPurchaseById(purchaseId)
    if (!purchaseMain) {
      return { success: false, error: "لم يتم العثور على القائمة" }
    }

    const purchaseDetails = await getPurchaseDetails(purchaseId)

    // 2️⃣ خصم الكميات من المخزون (عكس الإضافة)
    console.log("🔄 Removing quantities from inventory...")
    for (const detail of purchaseDetails) {
      try {
        await reduceInventoryFromPurchase(
          purchaseMain.purchasestoreid,
          detail.productcode1,
          Number(detail.quantity || 0)
        )
        console.log(`✅ Removed ${detail.quantity} of ${detail.productcode1}`)
      } catch (error) {
        console.warn(`⚠️ Could not remove inventory for ${detail.productcode1}:`, error)
        // نستمر في الحذف حتى لو فشل خصم بعض المواد
      }
    }

    // 3️⃣ حساب المبلغ المسترجع من رصيد المجهز (للقوائم الآجلة فقط)
    let restoredIQD = 0
    let restoredUSD = 0

    if (purchaseMain.typeofpayment === "آجل") {
      const remainingIQD = (purchaseMain.totalpurchaseiqd || 0) - (purchaseMain.amountreceivediqd || 0)
      const remainingUSD = (purchaseMain.totalpurchaseusd || 0) - (purchaseMain.amountreceivedusd || 0)

      restoredIQD = purchaseMain.currency === "دينار" ? remainingIQD : 0
      restoredUSD = purchaseMain.currency === "دولار" ? remainingUSD : 0

      // 4️⃣ استرجاع المبلغ من رصيد المجهز (إضافة لأن الرصيد كان سالب)
      if (restoredIQD !== 0 || restoredUSD !== 0) {
        console.log(`💰 Restoring balance from supplier: IQD=${restoredIQD}, USD=${restoredUSD}`)
        await updateSupplierBalance(
          purchaseMain.supplierid,
          restoredIQD,   // نضيف لأن الرصيد كان سالب (دين علينا)
          restoredUSD
        )
      }
    }

    // 5️⃣ حذف الدفعات المرتبطة بالقائمة
    console.log("🗑️ Deleting related payments...")
    const { error: paymentDeleteError } = await supabase
      .from("payments")
      .delete()
      .eq("purchasemainid", purchaseId)

    if (paymentDeleteError) {
      console.warn("⚠️ Could not delete payments:", paymentDeleteError)
      // نستمر في الحذف
    }

    // 6️⃣ حذف تفاصيل القائمة
    console.log("🗑️ Deleting purchase details...")
    const { error: detailsDeleteError } = await supabase
      .from("tb_purchaseproductsdetails")
      .delete()
      .eq("purchasemainid", purchaseId)

    if (detailsDeleteError) throw detailsDeleteError

    // 7️⃣ حذف القائمة الرئيسية
    console.log("🗑️ Deleting purchase main record...")
    const { error: mainDeleteError } = await supabase
      .from("tb_purchasemain")
      .delete()
      .eq("id", purchaseId)

    if (mainDeleteError) throw mainDeleteError

    console.log("✅ Purchase deleted successfully!")

    return { 
      success: true,
      restoredAmount: { iqd: restoredIQD, usd: restoredUSD },
      supplierName: purchaseMain.nameofsupplier,
      purchaseNumber: purchaseMain.numberofpurchase
    }
  } catch (error: unknown) {
    console.error("❌ Error deleting purchase:", error)
    const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء حذف القائمة"
    return { success: false, error: errorMessage }
  }
}

// دالة مساعدة لخصم الكميات من المخزون
async function reduceInventoryFromPurchase(
  storeId: string,
  productCode: string,
  quantityToRemove: number
): Promise<void> {
  try {
    const { data: item, error: fetchError } = await supabase
      .from("tb_inventory")
      .select("*")
      .eq("storeid", storeId)
      .eq("productcode", productCode)
      .maybeSingle()

    if (fetchError && fetchError.code !== "PGRST116") {
      throw new Error(`خطأ في جلب المادة: ${fetchError.message}`)
    }

    if (!item) {
      console.warn(`⚠️ المادة ${productCode} غير موجودة في المخزن - تم تخطيها`)
      return
    }

    const newQuantity = Math.max(0, (item.quantity || 0) - quantityToRemove)

    const { error: updateError } = await supabase
      .from("tb_inventory")
      .update({ quantity: newQuantity })
      .eq("id", item.id)

    if (updateError) {
      throw new Error(`خطأ في تحديث الكمية: ${updateError.message}`)
    }
  } catch (error) {
    console.error("Error reducing inventory from purchase:", error)
    throw error
  }
}

export async function deleteMultiplePurchases(purchaseIds: string[]): Promise<{ 
  success: boolean; 
  error?: string;
  deletedCount?: number;
  totalRestored?: { iqd: number; usd: number };
}> {
  try {
    let deletedCount = 0
    let totalIQD = 0
    let totalUSD = 0
    const errors: string[] = []

    console.log(`🗑️ Deleting ${purchaseIds.length} purchases...`)

    for (const purchaseId of purchaseIds) {
      const result = await deletePurchase(purchaseId)
      
      if (result.success) {
        deletedCount++
        if (result.restoredAmount) {
          totalIQD += result.restoredAmount.iqd
          totalUSD += result.restoredAmount.usd
        }
      } else {
        errors.push(result.error || "خطأ غير معروف")
      }
    }

    if (errors.length > 0 && deletedCount === 0) {
      return { 
        success: false, 
        error: `فشل حذف جميع القوائم: ${errors.join(", ")}` 
      }
    }

    return { 
      success: true,
      deletedCount,
      totalRestored: { iqd: totalIQD, usd: totalUSD }
    }
  } catch (error: unknown) {
    console.error("❌ Error deleting multiple purchases:", error)
    const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء حذف القوائم"
    return { success: false, error: errorMessage }
  }
}
