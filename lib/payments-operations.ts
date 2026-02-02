import { supabase } from "./supabase"

export interface Payment {
  id?: string
  customer_id?: string | null
  supplierid?: string | null
  amount_iqd: number
  amount_usd: number
  currency_type: "IQD" | "USD"
  transaction_type: string
  notes?: string | null
  pay_date: string
  created_at?: string
  purchasemainid?: string | null
  salesmainid?: string | null
  paymenttype?: string | null
  customer_name?: string
  supplier_name?: string
  invoice_number?: string
  entry_user?: string
}

export async function getAllPayments(): Promise<{
  success: boolean
  data?: Payment[]
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(
        `
        *,
        customer:customers!payments_customer_id_fkey(customer_name),
        supplier:customers!payments_supplierid_fkey(customer_name),
        sale:tb_salesmain(numberofsale),
        purchase:tb_purchasemain(numberofpurchase)
      `
      )
      .order("pay_date", { ascending: false })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    const transformedData = data?.map((payment) => ({
      ...payment,
      customer_name: (payment as { customer?: { customer_name: string }; supplier?: { customer_name: string } }).customer?.customer_name || (payment as { supplier?: { customer_name: string } }).supplier?.customer_name || "-",
      invoice_number: (payment as { sale?: { numberofsale: string }; purchase?: { numberofpurchase: string } }).sale?.numberofsale || (payment as { purchase?: { numberofpurchase: string } }).purchase?.numberofpurchase || "-",
    })) as Payment[]

    return {
      success: true,
      data: transformedData || [],
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: (error as { message?: string })?.message || "??? ??? ??? ?????",
    }
  }
}

export async function getPaymentById(paymentId: string): Promise<{
  success: boolean
  data?: Payment
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(
        `
        *,
        customer:customers!payments_customer_id_fkey(customer_name),
        supplier:customers!payments_supplierid_fkey(customer_name),
        sale:tb_salesmain(numberofsale),
        purchase:tb_purchasemain(numberofpurchase)
      `
      )
      .eq("id", paymentId)
      .single()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    const transformedData = {
      ...data,
      customer_name: data.customer?.customer_name || data.supplier?.customer_name || "-",
      invoice_number: data.sale?.numberofsale || data.purchase?.numberofpurchase || "-",
    }

    return {
      success: true,
      data: transformedData,
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: (error as { message?: string })?.message || "??? ??? ??? ?????",
    }
  }
}

export async function deletePayment(paymentId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", paymentId)

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: (error as { message?: string })?.message || "??? ??? ??? ?????",
    }
  }
}

export async function deleteMultiplePayments(paymentIds: string[]): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { error } = await supabase
      .from("payments")
      .delete()
      .in("id", paymentIds)

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: (error as { message?: string })?.message || "??? ??? ??? ?????",
    }
  }
}

export async function createPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<{
  success: boolean
  data?: Payment
  error?: string
}> {
  try {
    // ????? ??????
    const { data, error } = await supabase
      .from("payments")
      .insert(payment)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    // تحديث رصيد الزبون في حال وجود زبون
    if (payment.customer_id) {
      // قبض: نقص من رصيد الزبون (يسدد لنا)
      // صرف: إضافة إلى رصيد الزبون (ندفع له)
      const multiplier = payment.transaction_type === "قبض" ? -1 : 1

      if (payment.currency_type === "IQD") {
        const { error: updateError } = await supabase.rpc('update_customer_balance_iqd', {
          customer_id_param: payment.customer_id,
          amount_change: payment.amount_iqd * multiplier
        })

        if (updateError) {
          // في حال فشلت الدالة RPC، نستخدم التحديث المباشر
          const { data: customerData } = await supabase
            .from("customers")
            .select("balanceiqd")
            .eq("id", payment.customer_id)
            .single()

          if (customerData) {
            await supabase
              .from("customers")
              .update({ balanceiqd: (customerData.balanceiqd || 0) + (payment.amount_iqd * multiplier) })
              .eq("id", payment.customer_id)
          }
        }
      } else {
        const { error: updateError } = await supabase.rpc('update_customer_balance_usd', {
          customer_id_param: payment.customer_id,
          amount_change: payment.amount_usd * multiplier
        })

        if (updateError) {
          const { data: customerData } = await supabase
            .from("customers")
            .select("balanceusd")
            .eq("id", payment.customer_id)
            .single()

          if (customerData) {
            await supabase
              .from("customers")
              .update({ balanceusd: (customerData.balanceusd || 0) + (payment.amount_usd * multiplier) })
              .eq("id", payment.customer_id)
          }
        }
      }
    }

    // تحديث رصيد المورد في حال وجود مورد
    if (payment.supplierid) {
      const multiplier = payment.transaction_type === "قبض" ? -1 : 1

      if (payment.currency_type === "IQD") {
        const { data: supplierData } = await supabase
          .from("customers")
          .select("balanceiqd")
          .eq("id", payment.supplierid)
          .single()

        if (supplierData) {
          await supabase
            .from("customers")
            .update({ balanceiqd: (supplierData.balanceiqd || 0) + (payment.amount_iqd * multiplier) })
            .eq("id", payment.supplierid)
        }
      } else {
        const { data: supplierData } = await supabase
          .from("customers")
          .select("balanceusd")
          .eq("id", payment.supplierid)
          .single()

        if (supplierData) {
          await supabase
            .from("customers")
            .update({ balanceusd: (supplierData.balanceusd || 0) + (payment.amount_usd * multiplier) })
            .eq("id", payment.supplierid)
        }
      }
    }

    return {
      success: true,
      data: data as Payment,
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: (error as { message?: string })?.message || "??? ??? ??? ?????",
    }
  }
}
