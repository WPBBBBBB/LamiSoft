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
  pricetype: "????" | "????"
  paytype: "????" | "???"
  currencytype: "?????" | "?????"
  details?: string
  datetime: string
  discountenabled: boolean
  discountcurrency?: "?????" | "?????"
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
      .eq("type", "????")
      .order("customer_name")

    if (error) throw error
    return data || []
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
    return []
  }
}

export async function createSale(
  saleMain: SaleMain,
  saleDetails: SaleDetail[],
  storeId: string,
  payType: "????" | "???",
  currencyType: "?????" | "?????"
): Promise<{ success: boolean; saleId?: string; error?: string }> {
  try {
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
      // ??????? ???????? ??????? ?? ??? ??????? ??? ?? ??? ??????
      barcode: saleMain.barcode || saleMain.numberofsale
    }

    while (attempt < maxAttempts) {
      attempt += 1
      const { data, error } = await supabase
        .from("tb_salesmain")
        .insert([saleMainToInsert])
        .select()
        .single()

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
      throw lastInsertError || new Error("??? ????? ????? ?????")
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

    if (detailsError) throw detailsError

    for (const detail of saleDetails) {
      try {
        await reduceInventoryQuantity(
          storeId,
          detail.productcode,
          detail.quantity
        )
      } catch (invError) {
        throw new Error(`??? ?? ????? ??????? ?????? ${detail.productname}: ${invError instanceof Error ? invError.message : String(invError)}`)
      }
    }
    if (payType === "???") {
      const remainingIQD = saleMain.finaltotaliqd - saleMain.amountreceivediqd
      const remainingUSD = saleMain.finaltotalusd - saleMain.amountreceivedusd

      const balanceIQD = currencyType === "?????" ? remainingIQD : 0
      const balanceUSD = currencyType === "?????" ? remainingUSD : 0

      await updateCustomerBalance(
        saleMain.customerid,
        balanceIQD,
        balanceUSD
      )
      if (saleMain.amountreceivediqd > 0 || saleMain.amountreceivedusd > 0) {
        const paymentNote = `???? ????? ?????? ??? ${saleMain.numberofsale} - ${saleMain.customername}`

        const { error: paymentError } = await supabase.from("payments").insert([{
          customer_id: saleMain.customerid,
          amount_iqd: saleMain.amountreceivediqd,
          amount_usd: saleMain.amountreceivedusd,
          currency_type: saleMain.amountreceivediqd > 0 ? 'IQD' : 'USD',
          transaction_type: "???",
          notes: paymentNote,
          pay_date: new Date().toISOString(),
          salesmainid: saleMainId,
          paymentamountiqd: saleMain.amountreceivediqd,
          paymentamountusd: saleMain.amountreceivedusd,
          paymenttype: "???",
        }])

        if (paymentError) {
          throw paymentError
        }
      }
    }

    return { success: true, saleId: saleMainId }
  } catch (error: unknown) {
    let errorMessage = "خطأ غير متوقع"
    
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (error && typeof error === 'object') {
      const errRecord = error as Record<string, unknown>
      if (typeof errRecord.message === 'string' && errRecord.message) {
        errorMessage = errRecord.message
      } else if (typeof errRecord.details === 'string' && errRecord.details) {
        errorMessage = errRecord.details
      } else if (typeof errRecord.code === 'string' && errRecord.code) {
        errorMessage = `??? ?? ????? ????????: ${errRecord.code}`
      } else {
        try {
          errorMessage = JSON.stringify(errRecord)
        } catch {
          errorMessage = "??? ??? ??? ?????"
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
      return { success: false, error: "????? ??????? ??? ????" }
    }

    step = "fetch-old"
    const [oldMain, oldDetails] = await Promise.all([
      getSaleById(saleId),
      getSaleDetails(saleId),
    ])

    if (!oldMain) {
      return { success: false, error: "?? ??? ?????? ??? ??????? ????????" }
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
          throw new Error(`??? ?? ??????? ??????? ?????? ${detail.productname}: ${invError instanceof Error ? invError.message : String(invError)}`)
        }
      }

      step = "inventory-store-changed-reduce"
      for (const detail of saleDetails) {
        try {
          await reduceInventoryQuantity(storeId, detail.productcode, Number(detail.quantity || 0))
        } catch (invError) {
          throw new Error(`??? ?? ????? ??????? ?????? ${detail.productname || detail.productcode}: ${invError instanceof Error ? invError.message : String(invError)}`)
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
          const productDetail = saleDetails.find(d => d.productcode === code)
          const productName = productDetail?.productname || code
          throw new Error(`??? ?? ????? ??????? ?????? ${productName}: ${invError instanceof Error ? invError.message : String(invError)}`)
        }
      }
    }

    step = "customer-balance"
    const computeBalanceDelta = (main: SaleMain) => {
      if (main.paytype !== "???") return { iqd: 0, usd: 0 }
      const remainingIQD = (main.finaltotaliqd || 0) - (main.amountreceivediqd || 0)
      const remainingUSD = (main.finaltotalusd || 0) - (main.amountreceivedusd || 0)
      return {
        iqd: main.currencytype === "?????" ? remainingIQD : 0,
        usd: main.currencytype === "?????" ? remainingUSD : 0,
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
        throw new Error(`??? ?? ????? ???? ??????: ${balanceError instanceof Error ? balanceError.message : String(balanceError)}`)
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
    return { success: false, error: `??? ????? ????? ????? (${step}): ${info.message}` }
  }
}

async function reduceInventoryQuantity(
  storeId: string,
  productCode: string,
  quantitySold: number
): Promise<void> {
  try {
    const { data: item, error: fetchError } = await supabase
      .from("tb_inventory")
      .select("*")
      .eq("storeid", storeId)
      .eq("productcode", productCode)
      .single()

    if (fetchError) {
      throw new Error(`??? ?? ??? ??????: ${fetchError.message || JSON.stringify(fetchError)}`)
    }

    if (!item) {
      throw new Error(`?????? ${productCode} ??? ?????? ?? ??????`)
    }

    // ?????? ?????? ??? ?? ???? ?????? ???? ?? ??????? (???? ??????? ???????)
    const newQuantity = item.quantity - quantitySold
    
    const { error: updateError } = await supabase
      .from("tb_inventory")
      .update({ quantity: newQuantity })
      .eq("id", item.id)

    if (updateError) {
      throw new Error(`??? ?? ????? ??????: ${updateError.message || JSON.stringify(updateError)}`)
    }
    
    } catch (error) {
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
      throw new Error(`??? ?? ??? ??????: ${fetchError.message || JSON.stringify(fetchError)}`)
    }

    if (!item) {
      throw new Error(`?????? ${productCode} ??? ?????? ?? ??????`)
    }

    const newQuantity = (item.quantity || 0) + quantityToAdd

    const { error: updateError } = await supabase
      .from("tb_inventory")
      .update({ quantity: newQuantity })
      .eq("id", item.id)

    if (updateError) {
      throw new Error(`??? ?? ????? ??????: ${updateError.message || JSON.stringify(updateError)}`)
    }
  } catch (error) {
    throw error
  }
}

async function updateCustomerBalance(
  customerId: string,
  additionalIQD: number,
  additionalUSD: number
): Promise<void> {
  try {
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("balanceiqd, balanceusd")
      .eq("id", customerId)
      .single()

    if (fetchError) {
      throw new Error(`??? ?? ??? ?????? ??????: ${fetchError.message || JSON.stringify(fetchError)}`)
    }

    const { error: updateError } = await supabase
      .from("customers")
      .update({
        balanceiqd: (customer.balanceiqd || 0) + additionalIQD,
        balanceusd: (customer.balanceusd || 0) + additionalUSD,
        updated_at: new Date().toISOString()
      })
      .eq("id", customerId)

    if (updateError) {
      throw new Error(`??? ?? ????? ???? ??????: ${updateError.message || JSON.stringify(updateError)}`)
    }
    
    } catch (error) {
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
  } catch {
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
  } catch {
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
  } catch {
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
    // 1?? ????? ?????? ??????? ??? ?????
    const saleMain = await getSaleById(saleId)
    if (!saleMain) {
      return { success: false, error: "?? ??? ?????? ??? ???????" }
    }

    const saleDetails = await getSaleDetails(saleId)

    // 2?? ????? ??????? ???????
    for (const detail of saleDetails) {
      try {
        await increaseInventoryQuantity(
          saleMain.salestoreid,
          detail.productcode,
          Number(detail.quantity || 0)
        )
        } catch {
        // ????? ?? ????? ??? ?? ???? ??????? ??? ??????
      }
    }

    // 3?? ???? ?????? ???????? ?? ???? ?????? (??????? ?????? ???)
    let restoredIQD = 0
    let restoredUSD = 0

    if (saleMain.paytype === "???") {
      const remainingIQD = (saleMain.finaltotaliqd || 0) - (saleMain.amountreceivediqd || 0)
      const remainingUSD = (saleMain.finaltotalusd || 0) - (saleMain.amountreceivedusd || 0)

      restoredIQD = saleMain.currencytype === "?????" ? remainingIQD : 0
      restoredUSD = saleMain.currencytype === "?????" ? remainingUSD : 0

      // 4?? ??????? ?????? ?? ???? ?????? (??? ?????? ?? ??????)
      if (restoredIQD !== 0 || restoredUSD !== 0) {
        await updateCustomerBalance(
          saleMain.customerid,
          -restoredIQD,  // ???? ????? ??????
          -restoredUSD   // ???? ????? ??????
        )
      }
    }

    // 5?? ??? ??????? ???????? ????????
    const { error: paymentDeleteError } = await supabase
      .from("payments")
      .delete()
      .eq("salesmainid", saleId)

    if (paymentDeleteError) {
      // ????? ?? ?????
    }

    // 6?? ??? ?????? ???????
    const { error: detailsDeleteError } = await supabase
      .from("tb_salesdetails")
      .delete()
      .eq("salemainid", saleId)

    if (detailsDeleteError) throw detailsDeleteError

    // 7?? ??? ??????? ????????
    const { error: mainDeleteError } = await supabase
      .from("tb_salesmain")
      .delete()
      .eq("id", saleId)

    if (mainDeleteError) throw mainDeleteError

    return { 
      success: true,
      restoredAmount: { iqd: restoredIQD, usd: restoredUSD },
      customerName: saleMain.customername,
      saleNumber: saleMain.numberofsale
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "??? ??? ????? ??? ???????"
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

    for (const saleId of saleIds) {
      const result = await deleteSale(saleId)
      
      if (result.success) {
        deletedCount++
        if (result.restoredAmount) {
          totalIQD += result.restoredAmount.iqd
          totalUSD += result.restoredAmount.usd
        }
      } else {
        errors.push(result.error || "??? ??? ?????")
      }
    }

    if (errors.length > 0 && deletedCount === 0) {
      return { 
        success: false, 
        error: `??? ??? ???? ???????: ${errors.join(", ")}` 
      }
    }

    return { 
      success: true,
      deletedCount,
      totalRestored: { iqd: totalIQD, usd: totalUSD }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "??? ??? ????? ??? ???????"
    return { success: false, error: errorMessage }
  }
}
