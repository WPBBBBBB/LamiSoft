import { supabase } from "./supabase"

export interface Customer {
  id: string
  customer_name: string
  type: string
  balanceiqd?: number
  balanceusd?: number
}

export interface InventoryItem {
  id: string
  storeid: string
  productcode: string
  productname: string
  quantity: number
  unit: string
  sellpriceiqd: number
  sellpriceusd: number
}

export interface SaleMain {
  id?: string
  numberofsale: string
  barcode?: string
  salestoreid: string
  customerid: string
  customername: string
  pricetype: "جملة" | "مفرد"
  paytype: "نقدي" | "آجل"
  currencytype: "دينار" | "دولار"
  details?: string
  datetime: string
  discountenabled: boolean
  discountcurrency?: "دينار" | "دولار"
  discountiqd: number
  discountusd: number
  totalsaleiqd: number
  totalsaleusd: number
  amountreceivediqd: number
  amountreceivedusd: number
  finaltotaliqd: number
  finaltotalusd: number
}

export interface SaleDetail {
  id?: string
  salemainid?: string
  productcode: string
  productname: string
  storeid: string
  quantity: number
  unitpriceiqd: number
  unitpriceusd: number
  totalpriceiqd: number
  totalpriceusd: number
  notes?: string
}

export interface SaleProductRow extends SaleDetail {
  tempId: string
}

export async function getAllCustomers(): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("id, customer_name, type, balanceiqd, balanceusd")
      .eq("type", "زبون")
      .order("customer_name")

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching customers:", error)
    return []
  }
}

export async function getCustomerById(customerId: string): Promise<Customer | null> {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("id, customer_name, type, balanceiqd, balanceusd")
      .eq("id", customerId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error fetching customer:", error)
    return null
  }
}

export async function generateNextSaleNumber(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("tb_salesmain")
      .select("numberofsale")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    if (!data || !data.numberofsale) {
      return "S-00001"
    }

    const lastNumber = data.numberofsale.replace("S-", "")
    const nextNumber = parseInt(lastNumber) + 1
    const formattedNumber = nextNumber.toString().padStart(5, "0")

    return `S-${formattedNumber}`
  } catch (error) {
    console.error("Error generating sale number:", error)
    return `S-${Date.now().toString().slice(-5)}`
  }
}

export async function getInventoryByStore(storeId: string): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from("tb_inventory")
      .select("*")
      .eq("storeid", storeId)
      .gt("quantity", 0)
      .order("productname")

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return []
  }
}

export async function createSale(
  saleMain: SaleMain,
  saleDetails: SaleDetail[],
  storeId: string,
  payType: "نقدي" | "آجل",
  currencyType: "دينار" | "دولار"
): Promise<{ success: boolean; saleId?: string; error?: string }> {
  try {
    console.log("Creating sale with data:", { saleMain, saleDetails, storeId, payType, currencyType })

    const isDuplicateSaleNumberError = (err: unknown) => {
      if (!err || typeof err !== "object") return false
      const anyErr = err as Record<string, unknown>
      return (
        anyErr.code === "23505" &&
        (String(anyErr.details || "").includes("numberofsale") ||
          String(anyErr.message || "").includes("numberofsale") ||
          String(anyErr.message || "").includes("tb_salesmain_numberofsale_key"))
      )
    }

    const maxAttempts = 3
    let attempt = 0
    let mainData: SaleMain | null = null
    let lastInsertError: Error | null = null
    let saleMainToInsert: SaleMain = { 
      ...saleMain,
      // استخدام الباركود المُرسل أو رقم القائمة إذا لم يتم إرساله
      barcode: saleMain.barcode || saleMain.numberofsale
    }

    while (attempt < maxAttempts) {
      attempt += 1
      const { data, error } = await supabase
        .from("tb_salesmain")
        .insert([saleMainToInsert])
        .select()
        .single()

      console.log("Insert result:", { attempt, data, error })

      if (!error) {
        mainData = data
        lastInsertError = null
        break
      }

      lastInsertError = error
      if (!isDuplicateSaleNumberError(error) || attempt >= maxAttempts) {
        throw error
      }

      const newNumber = await generateNextSaleNumber()
      saleMainToInsert = { ...saleMainToInsert, numberofsale: newNumber }
    }

    if (!mainData) {
      throw lastInsertError || new Error("فشل إدخال قائمة البيع")
    }

    const saleMainId = mainData.id

    const detailsWithMainId = saleDetails.map((d) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tempId, ...detailData } = d as SaleProductRow
      return {
        ...detailData,
        salemainid: saleMainId,
      }
    })

    const { error: detailsError } = await supabase
      .from("tb_salesdetails")
      .insert(detailsWithMainId)

    console.log("Details insert result:", { detailsError })
    if (detailsError) throw detailsError

    console.log("Starting inventory reduction...")
    for (const detail of saleDetails) {
      try {
        console.log("Reducing inventory for:", detail.productcode, "qty:", detail.quantity)
        await reduceInventoryQuantity(
          storeId,
          detail.productcode,
          detail.quantity
        )
      } catch (invError) {
        console.error("Error reducing inventory for product:", detail.productcode, invError)
        throw new Error(`خطأ في تحديث المخزون للمادة ${detail.productname}: ${invError instanceof Error ? invError.message : String(invError)}`)
      }
    }
    console.log("Inventory reduction completed")

    console.log("Checking payment type:", payType)
    if (payType === "آجل") {
      const remainingIQD = saleMain.finaltotaliqd - saleMain.amountreceivediqd
      const remainingUSD = saleMain.finaltotalusd - saleMain.amountreceivedusd

      const balanceIQD = currencyType === "دينار" ? remainingIQD : 0
      const balanceUSD = currencyType === "دولار" ? remainingUSD : 0

      console.log("Updating customer balance:", { balanceIQD, balanceUSD })
      await updateCustomerBalance(
        saleMain.customerid,
        balanceIQD,
        balanceUSD
      )
      console.log("Customer balance updated")
      if (saleMain.amountreceivediqd > 0 || saleMain.amountreceivedusd > 0) {
        const paymentNote = `دفعة واصلة لقائمة بيع ${saleMain.numberofsale} - ${saleMain.customername}`

        const { error: paymentError } = await supabase.from("payments").insert([{
          customer_id: saleMain.customerid,
          amount_iqd: saleMain.amountreceivediqd,
          amount_usd: saleMain.amountreceivedusd,
          currency_type: saleMain.amountreceivediqd > 0 ? 'IQD' : 'USD',
          transaction_type: "قبض",
          notes: paymentNote,
          pay_date: new Date().toISOString(),
          salesmainid: saleMainId,
          paymentamountiqd: saleMain.amountreceivediqd,
          paymentamountusd: saleMain.amountreceivedusd,
          paymenttype: "قبض",
        }])

        if (paymentError) {
          console.error("Payment insert error:", paymentError)
          throw paymentError
        }
      }
    }

    return { success: true, saleId: saleMainId }
  } catch (error: unknown) {
    console.error("=== ERROR CAUGHT ===")
    console.error("Error creating sale:", error)
    console.error("Error type:", typeof error)
    console.error(
      "Error constructor:",
      error && typeof error === "object"
        ? (error as Record<string, unknown>).constructor
        : undefined
    )
    
    if (error && typeof error === 'object') {
      const errRecord = error as Record<string, unknown>
      console.error("Error keys:", Object.keys(errRecord))
      console.error("Error message property:", errRecord.message)
      console.error("Error code property:", errRecord.code)
      console.error("Error details property:", errRecord.details)
    }
    
    console.error("Error instanceof Error:", error instanceof Error)
    console.error("Error string:", String(error))
    console.error("===================")
    
    let errorMessage = "حدث خطأ غير متوقع"
    
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (error && typeof error === 'object') {
      const errRecord = error as Record<string, unknown>
      if (typeof errRecord.message === 'string' && errRecord.message) {
        errorMessage = errRecord.message
      } else if (typeof errRecord.details === 'string' && errRecord.details) {
        errorMessage = errRecord.details
      } else if (typeof errRecord.code === 'string' && errRecord.code) {
        errorMessage = `خطأ في قاعدة البيانات: ${errRecord.code}`
      } else {
        try {
          errorMessage = JSON.stringify(errRecord)
        } catch {
          errorMessage = "حدث خطأ غير متوقع"
        }
      }
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error) {
      errorMessage = String(error)
    }
    
    return { success: false, error: errorMessage }
  }
}

export async function updateSale(
  saleId: string,
  saleMain: SaleMain,
  saleDetails: SaleDetail[],
  storeId: string
): Promise<{ success: boolean; saleId?: string; error?: string }> {
  let step = "start"

  try {

    if (!saleId) {
      return { success: false, error: "معرّف القائمة غير صالح" }
    }

    step = "fetch-old"
    const [oldMain, oldDetails] = await Promise.all([
      getSaleById(saleId),
      getSaleDetails(saleId),
    ])

    if (!oldMain) {
      return { success: false, error: "لم يتم العثور على القائمة المطلوبة" }
    }

    const oldStoreId = oldMain.salestoreid

    step = "update-main"
    const { error: mainUpdateError } = await supabase
      .from("tb_salesmain")
      .update({
        numberofsale: saleMain.numberofsale,
        barcode: saleMain.barcode || saleMain.numberofsale,
        salestoreid: saleMain.salestoreid,
        customerid: saleMain.customerid,
        customername: saleMain.customername,
        pricetype: saleMain.pricetype,
        paytype: saleMain.paytype,
        currencytype: saleMain.currencytype,
        details: saleMain.details,
        datetime: saleMain.datetime,
        discountenabled: saleMain.discountenabled,
        discountcurrency: saleMain.discountcurrency,
        discountiqd: saleMain.discountiqd,
        discountusd: saleMain.discountusd,
        totalsaleiqd: saleMain.totalsaleiqd,
        totalsaleusd: saleMain.totalsaleusd,
        amountreceivediqd: saleMain.amountreceivediqd,
        amountreceivedusd: saleMain.amountreceivedusd,
        finaltotaliqd: saleMain.finaltotaliqd,
        finaltotalusd: saleMain.finaltotalusd,
      })
      .eq("id", saleId)

    if (mainUpdateError) throw mainUpdateError

    step = "delete-details"
    const { error: deleteDetailsError } = await supabase
      .from("tb_salesdetails")
      .delete()
      .eq("salemainid", saleId)

    if (deleteDetailsError) throw deleteDetailsError

    const detailsWithMainId = saleDetails.map((d) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tempId, ...detailData } = d as SaleProductRow
      return {
        ...detailData,
        salemainid: saleId,
      }
    })

    const { error: insertDetailsError } = await supabase
      .from("tb_salesdetails")
      .insert(detailsWithMainId)

    if (insertDetailsError) throw insertDetailsError

    const buildQtyMap = (details: SaleDetail[]) => {
      const map = new Map<string, number>()
      for (const d of details) {
        const code = String(d.productcode || "").trim()
        if (!code) continue
        const qty = Number(d.quantity || 0)
        map.set(code, (map.get(code) || 0) + qty)
      }
      return map
    }

    if (oldStoreId !== storeId) {
      step = "inventory-store-changed-restore"
      for (const detail of oldDetails) {
        try {
          await increaseInventoryQuantity(oldStoreId, detail.productcode, Number(detail.quantity || 0))
        } catch (invError) {
          console.error("Error restoring inventory for product:", detail.productcode, invError)
          throw new Error(`خطأ في استرجاع المخزون للمادة ${detail.productname}: ${invError instanceof Error ? invError.message : String(invError)}`)
        }
      }

      step = "inventory-store-changed-reduce"
      for (const detail of saleDetails) {
        try {
          await reduceInventoryQuantity(storeId, detail.productcode, Number(detail.quantity || 0))
        } catch (invError) {
          console.error("Error reducing inventory for product:", detail.productcode, invError)
          throw new Error(`خطأ في تقليل المخزون للمادة ${detail.productname || detail.productcode}: ${invError instanceof Error ? invError.message : String(invError)}`)
        }
      }
    } else {
      step = "inventory-adjust-delta"
      const oldMap = buildQtyMap(oldDetails)
      const newMap = buildQtyMap(saleDetails)
      const allCodes = new Set<string>([...oldMap.keys(), ...newMap.keys()])

      for (const code of allCodes) {
        const oldQty = oldMap.get(code) || 0
        const newQty = newMap.get(code) || 0
        const delta = newQty - oldQty

        try {
          if (delta > 0) {
            await reduceInventoryQuantity(storeId, code, delta)
          } else if (delta < 0) {
            await increaseInventoryQuantity(storeId, code, Math.abs(delta))
          }
        } catch (invError) {
          console.error("Error adjusting inventory for product:", code, "delta:", delta, invError)
          const productDetail = saleDetails.find(d => d.productcode === code)
          const productName = productDetail?.productname || code
          throw new Error(`خطأ في تعديل المخزون للمادة ${productName}: ${invError instanceof Error ? invError.message : String(invError)}`)
        }
      }
    }

    step = "customer-balance"
    const computeBalanceDelta = (main: SaleMain) => {
      if (main.paytype !== "آجل") return { iqd: 0, usd: 0 }
      const remainingIQD = (main.finaltotaliqd || 0) - (main.amountreceivediqd || 0)
      const remainingUSD = (main.finaltotalusd || 0) - (main.amountreceivedusd || 0)
      return {
        iqd: main.currencytype === "دينار" ? remainingIQD : 0,
        usd: main.currencytype === "دولار" ? remainingUSD : 0,
      }
    }

    const oldDelta = computeBalanceDelta(oldMain)
    const newDelta = computeBalanceDelta(saleMain)

    const hasAnyBalanceEffect =
      oldDelta.iqd !== 0 || oldDelta.usd !== 0 || newDelta.iqd !== 0 || newDelta.usd !== 0

    if (hasAnyBalanceEffect) {
      try {
        if (oldMain.customerid !== saleMain.customerid) {
          await updateCustomerBalance(oldMain.customerid, -oldDelta.iqd, -oldDelta.usd)
          await updateCustomerBalance(saleMain.customerid, newDelta.iqd, newDelta.usd)
        } else {
          await updateCustomerBalance(
            saleMain.customerid,
            newDelta.iqd - oldDelta.iqd,
            newDelta.usd - oldDelta.usd
          )
        }
      } catch (balanceError) {
        console.error("Error updating customer balance:", balanceError)
        throw new Error(`خطأ في تحديث رصيد الزبون: ${balanceError instanceof Error ? balanceError.message : String(balanceError)}`)
      }
    }

    return { success: true, saleId }
  } catch (error) {
    const getErrorInfo = (err: unknown) => {
      if (!err) return { message: "Unknown error", details: "" }
      if (err instanceof Error) {
        return { message: err.message || String(err), details: err.stack || "" }
      }

      if (typeof err === "string") return { message: err, details: "" }
      if (typeof err === "object") {
        const anyErr = err as Record<string, unknown>
        const message =
          anyErr.message ||
          anyErr.error_description ||
          anyErr.details ||
          anyErr.hint ||
          String(err)

        const props = (() => {
          try {
            return Object.getOwnPropertyNames(err)
          } catch {
            return []
          }
        })()

        const picked: Record<string, unknown> = {}
        for (const k of ["code", "message", "details", "hint", "status", "statusCode", "name"]) {
          if (k in anyErr) picked[k] = anyErr[k]
        }

        return {
          message: String(message),
          details: `keys=${Object.keys(anyErr).join(",")} props=${props.join(",")} picked=${JSON.stringify(picked)}`,
        }
      }

      return { message: String(err), details: "" }
    }

    const info = getErrorInfo(error)
    console.error("Error updating sale:", { info })

    return { success: false, error: `فشل تعديل قائمة البيع (${step}): ${info.message}` }
  }
}

async function reduceInventoryQuantity(
  storeId: string,
  productCode: string,
  quantitySold: number
): Promise<void> {
  try {
    console.log(`Attempting to reduce inventory: store=${storeId}, product=${productCode}, qty=${quantitySold}`)
    
    const { data: item, error: fetchError } = await supabase
      .from("tb_inventory")
      .select("*")
      .eq("storeid", storeId)
      .eq("productcode", productCode)
      .single()

    console.log("Inventory fetch result:", { item, fetchError })

    if (fetchError) {
      console.error("Fetch error details:", fetchError)
      throw new Error(`خطأ في جلب المادة: ${fetchError.message || JSON.stringify(fetchError)}`)
    }

    if (!item) {
      throw new Error(`المادة ${productCode} غير موجودة في المخزن`)
    }

    // السماح بالبيع حتى لو كانت الكمية أكبر من المتوفر (يصبح المخزون بالسالب)
    const newQuantity = item.quantity - quantitySold
    
    console.log(`Updating inventory: ${item.productname} from ${item.quantity} to ${newQuantity}`)

    const { error: updateError } = await supabase
      .from("tb_inventory")
      .update({ quantity: newQuantity })
      .eq("id", item.id)

    if (updateError) {
      console.error("Update error details:", updateError)
      throw new Error(`خطأ في تحديث الكمية: ${updateError.message || JSON.stringify(updateError)}`)
    }
    
    console.log(`Successfully reduced inventory for ${productCode}`)
  } catch (error) {
    console.error("Error reducing inventory:", error)
    throw error
  }
}

async function increaseInventoryQuantity(
  storeId: string,
  productCode: string,
  quantityToAdd: number
): Promise<void> {
  try {
    const { data: item, error: fetchError } = await supabase
      .from("tb_inventory")
      .select("*")
      .eq("storeid", storeId)
      .eq("productcode", productCode)
      .single()

    if (fetchError) {
      throw new Error(`خطأ في جلب المادة: ${fetchError.message || JSON.stringify(fetchError)}`)
    }

    if (!item) {
      throw new Error(`المادة ${productCode} غير موجودة في المخزن`)
    }

    const newQuantity = (item.quantity || 0) + quantityToAdd

    const { error: updateError } = await supabase
      .from("tb_inventory")
      .update({ quantity: newQuantity })
      .eq("id", item.id)

    if (updateError) {
      throw new Error(`خطأ في تحديث الكمية: ${updateError.message || JSON.stringify(updateError)}`)
    }
  } catch (error) {
    console.error("Error increasing inventory:", error)
    throw error
  }
}

async function updateCustomerBalance(
  customerId: string,
  additionalIQD: number,
  additionalUSD: number
): Promise<void> {
  try {
    console.log(`Updating customer balance: id=${customerId}, IQD=${additionalIQD}, USD=${additionalUSD}`)
    
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("balanceiqd, balanceusd")
      .eq("id", customerId)
      .single()

    console.log("Customer fetch result:", { customer, fetchError })

    if (fetchError) {
      console.error("Customer fetch error:", fetchError)
      throw new Error(`خطأ في جلب بيانات الزبون: ${fetchError.message || JSON.stringify(fetchError)}`)
    }

    const { error: updateError } = await supabase
      .from("customers")
      .update({
        balanceiqd: (customer.balanceiqd || 0) + additionalIQD,
        balanceusd: (customer.balanceusd || 0) + additionalUSD,
        updated_at: new Date().toISOString()
      })
      .eq("id", customerId)

    console.log("Customer update result:", { updateError })

    if (updateError) {
      console.error("Customer update error:", updateError)
      throw new Error(`خطأ في تحديث رصيد الزبون: ${updateError.message || JSON.stringify(updateError)}`)
    }
    
    console.log("Customer balance updated successfully")
  } catch (error) {
    console.error("Error updating customer balance:", error)
    throw error
  }
}

export async function getAllSales(): Promise<SaleMain[]> {
  try {
    const { data, error } = await supabase
      .from("tb_salesmain")
      .select(`
        *,
        tb_store (
          storename
        ),
        customers (
          customer_name
        )
      `)
      .order("datetime", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching sales:", error)
    return []
  }
}

export async function getSaleDetails(saleMainId: string): Promise<SaleDetail[]> {
  try {
    const { data, error } = await supabase
      .from("tb_salesdetails")
      .select("*")
      .eq("salemainid", saleMainId)
      .order("productname")

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching sale details:", error)
    return []
  }
}

export async function getSaleById(saleId: string): Promise<SaleMain | null> {
  try {
    const { data, error } = await supabase
      .from("tb_salesmain")
      .select("*")
      .eq("id", saleId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error fetching sale:", error)
    return null
  }
}

export async function deleteSale(saleId: string): Promise<{ 
  success: boolean; 
  error?: string;
  restoredAmount?: { iqd: number; usd: number };
  customerName?: string;
  saleNumber?: string;
}> {
  try {
    // 1️⃣ قراءة بيانات القائمة قبل الحذف
    const saleMain = await getSaleById(saleId)
    if (!saleMain) {
      return { success: false, error: "لم يتم العثور على القائمة" }
    }

    const saleDetails = await getSaleDetails(saleId)

    // 2️⃣ إرجاع الكميات للمخزون
    console.log("🔄 Restoring inventory quantities...")
    for (const detail of saleDetails) {
      try {
        await increaseInventoryQuantity(
          saleMain.salestoreid,
          detail.productcode,
          Number(detail.quantity || 0)
        )
        console.log(`✅ Restored ${detail.quantity} of ${detail.productcode}`)
      } catch (error) {
        console.warn(`⚠️ Could not restore inventory for ${detail.productcode}:`, error)
        // نستمر في الحذف حتى لو فشلت استعادة بعض المواد
      }
    }

    // 3️⃣ حساب المبلغ المسترجع من رصيد الزبون (للقوائم الآجلة فقط)
    let restoredIQD = 0
    let restoredUSD = 0

    if (saleMain.paytype === "آجل") {
      const remainingIQD = (saleMain.finaltotaliqd || 0) - (saleMain.amountreceivediqd || 0)
      const remainingUSD = (saleMain.finaltotalusd || 0) - (saleMain.amountreceivedusd || 0)

      restoredIQD = saleMain.currencytype === "دينار" ? remainingIQD : 0
      restoredUSD = saleMain.currencytype === "دولار" ? remainingUSD : 0

      // 4️⃣ استرجاع المبلغ من رصيد الزبون (طرح المبلغ من الرصيد)
      if (restoredIQD !== 0 || restoredUSD !== 0) {
        console.log(`💰 Restoring balance from customer: IQD=${restoredIQD}, USD=${restoredUSD}`)
        await updateCustomerBalance(
          saleMain.customerid,
          -restoredIQD,  // نطرح لأننا نسترجع
          -restoredUSD   // نطرح لأننا نسترجع
        )
      }
    }

    // 5️⃣ حذف الدفعات المرتبطة بالقائمة
    console.log("🗑️ Deleting related payments...")
    const { error: paymentDeleteError } = await supabase
      .from("payments")
      .delete()
      .eq("salesmainid", saleId)

    if (paymentDeleteError) {
      console.warn("⚠️ Could not delete payments:", paymentDeleteError)
      // نستمر في الحذف
    }

    // 6️⃣ حذف تفاصيل القائمة
    console.log("🗑️ Deleting sale details...")
    const { error: detailsDeleteError } = await supabase
      .from("tb_salesdetails")
      .delete()
      .eq("salemainid", saleId)

    if (detailsDeleteError) throw detailsDeleteError

    // 7️⃣ حذف القائمة الرئيسية
    console.log("🗑️ Deleting sale main record...")
    const { error: mainDeleteError } = await supabase
      .from("tb_salesmain")
      .delete()
      .eq("id", saleId)

    if (mainDeleteError) throw mainDeleteError

    console.log("✅ Sale deleted successfully!")

    return { 
      success: true,
      restoredAmount: { iqd: restoredIQD, usd: restoredUSD },
      customerName: saleMain.customername,
      saleNumber: saleMain.numberofsale
    }
  } catch (error: unknown) {
    console.error("❌ Error deleting sale:", error)
    const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء حذف القائمة"
    return { success: false, error: errorMessage }
  }
}

export async function deleteMultipleSales(saleIds: string[]): Promise<{ 
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

    console.log(`🗑️ Deleting ${saleIds.length} sales...`)

    for (const saleId of saleIds) {
      const result = await deleteSale(saleId)
      
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
    console.error("❌ Error deleting multiple sales:", error)
    const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء حذف القوائم"
    return { success: false, error: errorMessage }
  }
}
