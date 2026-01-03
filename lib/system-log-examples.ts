

import { logAction } from "@/lib/system-log-operations"

export async function logLoginAction(userName: string) {
  await logAction(
    "تسجيل دخول",
    `قام المستخدم ${userName} بتسجيل الدخول إلى النظام`
  )
}

export async function logAddCustomer(customerId: number, customerName: string) {
  await logAction(
    "إضافة",
    `تم إضافة عميل جديد: ${customerName}`,
    "customers",
    customerId,
    undefined,
    { name: customerName }
  )
}

export async function logUpdateCustomer(
  customerId: number,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
) {
  await logAction(
    "تعديل",
    `تم تعديل بيانات العميل`,
    "customers",
    customerId,
    oldData,
    newData
  )
}

export async function logDeleteCustomer(customerId: number, customerName: string) {
  await logAction(
    "حذف",
    `تم حذف العميل: ${customerName}`,
    "customers",
    customerId,
    { name: customerName },
    undefined
  )
}

export async function logSaleTransaction(saleId: number, amount: number) {
  await logAction(
    "عملية بيع",
    `تم إضافة عملية بيع بمبلغ ${amount} دينار`,
    "sales",
    saleId,
    undefined,
    { amount }
  )
}

export async function logPurchaseTransaction(purchaseId: number, amount: number) {
  await logAction(
    "عملية شراء",
    `تم إضافة عملية شراء بمبلغ ${amount} دينار`,
    "purchases",
    purchaseId,
    undefined,
    { amount }
  )
}

export async function logPayment(
  paymentId: number,
  customerId: number,
  amount: number,
  type: string
) {
  await logAction(
    "عملية دفع",
    `تم تسجيل ${type} بمبلغ ${amount} دينار للعميل`,
    "payments",
    paymentId,
    undefined,
    { customer_id: customerId, amount, type }
  )
}

export async function logSettingsChange(settingName: string, oldValue: unknown, newValue: unknown) {
  await logAction(
    "تغيير إعدادات",
    `تم تغيير إعداد ${settingName}`,
    "settings",
    undefined,
    { [settingName]: oldValue },
    { [settingName]: newValue }
  )
}

export async function logStoreTransfer(
  transferId: number,
  fromStore: string,
  toStore: string,
  items: Record<string, unknown>[]
) {
  await logAction(
    "نقل مخزني",
    `تم نقل مواد من ${fromStore} إلى ${toStore}`,
    "store_transfers",
    transferId,
    undefined,
    { from: fromStore, to: toStore, items }
  )
}

export async function logSystemReset(resetOptions: string[]) {
  await logAction(
    "تصفير النظام",
    `تم تصفير النظام للخيارات: ${resetOptions.join(", ")}`,
    undefined,
    undefined,
    undefined,
    { resetOptions }
  )
}

