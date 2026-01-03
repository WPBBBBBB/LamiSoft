
export const ACTION_TYPES = {
  LOGIN: "تسجيل دخول",
  LOGOUT: "تسجيل خروج",
  FAILED_LOGIN: "محاولة دخول فاشلة",
  PASSWORD_CHANGE: "تغيير كلمة المرور",
  PASSWORD_RESET: "إعادة تعيين كلمة المرور",
  
  CREATE: "إضافة",
  UPDATE: "تعديل",
  DELETE: "حذف",
  VIEW: "عرض",
  
  ADD_CUSTOMER: "إضافة عميل",
  UPDATE_CUSTOMER: "تعديل عميل",
  DELETE_CUSTOMER: "حذف عميل",
  
  ADD_USER: "إضافة مستخدم",
  UPDATE_USER: "تعديل مستخدم",
  DELETE_USER: "حذف مستخدم",
  CHANGE_PERMISSIONS: "تعديل الصلاحيات",
  
  SALE_TRANSACTION: "عملية بيع",
  UPDATE_SALE: "تعديل بيع",
  DELETE_SALE: "حذف بيع",
  CANCEL_SALE: "إلغاء بيع",
  
  PURCHASE_TRANSACTION: "عملية شراء",
  UPDATE_PURCHASE: "تعديل شراء",
  DELETE_PURCHASE: "حذف شراء",
  CANCEL_PURCHASE: "إلغاء شراء",
  
  PAYMENT_RECEIVE: "عملية قبض",
  PAYMENT_DISBURSE: "عملية صرف",
  PAYMENT_DEPOSIT: "عملية ايداع",
  PAYMENT_WITHDRAW: "عملية سحب",
  PAYMENT_LOAN: "عملية قرض",
  
  ADD_STORE: "إضافة مخزن",
  UPDATE_STORE: "تعديل مخزن",
  DELETE_STORE: "حذف مخزن",
  STORE_TRANSFER: "نقل مخزني",
  
  ADD_EXPENSE: "إضافة مصروف",
  UPDATE_EXPENSE: "تعديل مصروف",
  DELETE_EXPENSE: "حذف مصروف",
  
  CHANGE_SETTINGS: "تغيير إعدادات",
  CHANGE_THEME: "تغيير الثيم",
  CHANGE_LANGUAGE: "تغيير اللغة",
  CHANGE_FONT: "تغيير الخط",
  UPDATE_EXCHANGE_RATE: "تحديث سعر الصرف",
  
  SYSTEM_RESET: "تصفير النظام",
  BACKUP: "نسخ احتياطي",
  RESTORE: "استرجاع بيانات",
  EXPORT_DATA: "تصدير بيانات",
  IMPORT_DATA: "استيراد بيانات",
  
  GENERATE_REPORT: "إنشاء تقرير",
  PRINT_REPORT: "طباعة تقرير",
  EXPORT_REPORT: "تصدير تقرير",
  
  ERROR: "خطأ",
  WARNING: "تحذير",
  INFO: "معلومات",
} as const

export const TABLE_NAMES = {
  CUSTOMERS: "customers",
  USERS: "users",
  SALES: "sales",
  PURCHASES: "purchases",
  PAYMENTS: "payments",
  STORES: "stores",
  STORE_TRANSFERS: "store_transfers",
  EXPENSES: "expenses",
  SETTINGS: "settings",
  EXCHANGE_RATES: "exchange_rates",
  SYSTEM_LOG: "tb_systemlog",
} as const

export function getActionType(key: keyof typeof ACTION_TYPES): string {
  return ACTION_TYPES[key]
}

export function getTableName(key: keyof typeof TABLE_NAMES): string {
  return TABLE_NAMES[key]
}


export type ActionType = typeof ACTION_TYPES[keyof typeof ACTION_TYPES]
export type TableName = typeof TABLE_NAMES[keyof typeof TABLE_NAMES]
