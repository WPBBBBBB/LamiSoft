import { supabase } from './supabase'

// ============================================
// أنواع البيانات
// ============================================

export interface Store {
  id: string
  storename: string
  location?: string
  storekeeper?: string
  phonenumber?: string
  details?: string
  isactive: boolean
  createdat: string
  editedat: string
}

export interface InventoryItem {
  id: string
  refnumber?: string
  productcode: string
  productname: string
  quantity: number
  unit?: string
  storeid: string
  sellpriceiqd: number
  sellpriceusd: number
  createdat: string
  minstocklevel: number
  reorderquantity: number
  monitorenabled: boolean
  lowstocknotify: boolean
}

export interface StoreTransfer {
  id: string
  productcode: string
  productname: string
  quantity: number
  fromstoreid: string
  fromstorename: string
  tostoreid: string
  tostorename: string
  transferdate: string
  note?: string
  createdby?: string
  description?: string
}

// ============================================
// دوال المخازن (Stores)
// ============================================

// جلب جميع المخازن
export async function getStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from('tb_store')
    .select('*')
    .order('createdat', { ascending: false })
  
  if (error) throw error
  return data || []
}

// جلب المخازن النشطة فقط
export async function getActiveStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from('tb_store')
    .select('*')
    .eq('isactive', true)
    .order('storename')
  
  if (error) throw error
  return data || []
}

// جلب مخزن واحد
export async function getStore(id: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from('tb_store')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// إضافة مخزن جديد
export async function createStore(store: Omit<Store, 'id' | 'createdat' | 'editedat'>): Promise<Store> {
  const { data, error } = await supabase
    .from('tb_store')
    .insert([store])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// تحديث مخزن
export async function updateStore(id: string, updates: Partial<Store>): Promise<Store> {
  const { data, error } = await supabase
    .from('tb_store')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// حذف مخزن
export async function deleteStore(id: string): Promise<void> {
  const { error } = await supabase
    .from('tb_store')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// حذف مخازن متعددة
export async function deleteStores(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('tb_store')
    .delete()
    .in('id', ids)
  
  if (error) throw error
}

// ============================================
// دوال المخزون (Inventory)
// ============================================

// جلب جميع المواد في مخزن معين
export async function getStoreInventory(storeId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('tb_inventory')
    .select('*')
    .eq('storeid', storeId)
    .order('productname')
  
  if (error) throw error
  return data || []
}

// جلب مادة واحدة
export async function getInventoryItem(id: string): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from('tb_inventory')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// البحث عن مادة بالكود أو الاسم في مخزن معين
export async function searchInventoryInStore(
  storeId: string,
  searchTerm: string
): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('tb_inventory')
    .select('*')
    .eq('storeid', storeId)
    .or(`productcode.ilike.%${searchTerm}%,productname.ilike.%${searchTerm}%`)
    .limit(10)
  
  if (error) throw error
  return data || []
}

// إضافة مادة جديدة للمخزن
export async function createInventoryItem(
  item: Omit<InventoryItem, 'id' | 'createdat'>
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('tb_inventory')
    .insert([item])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// تحديث مادة
export async function updateInventoryItem(
  id: string,
  updates: Partial<InventoryItem>
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('tb_inventory')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// حذف مادة
export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('tb_inventory')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// حذف مواد متعددة
export async function deleteInventoryItems(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('tb_inventory')
    .delete()
    .in('id', ids)
  
  if (error) throw error
}

// ============================================
// دوال النقل المخزني (Store Transfers)
// ============================================

// تسجيل عملية نقل
export async function createStoreTransfer(
  transfer: Omit<StoreTransfer, 'id' | 'transferdate'>
): Promise<StoreTransfer> {
  const { data, error } = await supabase
    .from('tb_storetransfers')
    .insert([transfer])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// جلب تاريخ النقل
export async function getStoreTransfers(limit: number = 50): Promise<StoreTransfer[]> {
  const { data, error } = await supabase
    .from('tb_storetransfers')
    .select('*')
    .order('transferdate', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

// نقل مادة من مخزن لآخر
export async function transferInventory(
  productCode: string,
  productName: string,
  quantity: number,
  fromStoreId: string,
  toStoreId: string,
  note?: string,
  updatePrice?: boolean,
  newPriceIQD?: number,
  newPriceUSD?: number
): Promise<void> {
  // 1. جلب بيانات المخازن
  const fromStore = await getStore(fromStoreId)
  const toStore = await getStore(toStoreId)

  if (!fromStore || !toStore) {
    throw new Error('المخزن غير موجود')
  }

  // 2. جلب المادة من المخزن المصدر
  const { data: sourceItems, error: sourceError } = await supabase
    .from('tb_inventory')
    .select('*')
    .eq('storeid', fromStoreId)
    .eq('productcode', productCode)
    .single()

  if (sourceError) throw new Error('المادة غير موجودة في المخزن المصدر')

  // 3. خصم الكمية من المخزن المصدر
  const newSourceQuantity = sourceItems.quantity - quantity
  
  if (newSourceQuantity < 0) {
    // إذا كانت الكمية سالبة، نستمر ولكن نسجل تحذير
    console.warn('تحذير: الكمية المنقولة أكبر من المتوفر')
  }

  await supabase
    .from('tb_inventory')
    .update({ quantity: newSourceQuantity })
    .eq('id', sourceItems.id)

  // 4. التحقق من وجود المادة في المخزن الهدف
  const { data: targetItems, error: targetError } = await supabase
    .from('tb_inventory')
    .select('*')
    .eq('storeid', toStoreId)
    .eq('productcode', productCode)
    .maybeSingle()

  if (targetItems) {
    // المادة موجودة - نحدث الكمية والسعر إذا لزم الأمر
    const updates: any = {
      quantity: targetItems.quantity + quantity
    }

    if (updatePrice) {
      if (newPriceIQD !== undefined) updates.sellpriceiqd = newPriceIQD
      if (newPriceUSD !== undefined) updates.sellpriceusd = newPriceUSD
    }

    await supabase
      .from('tb_inventory')
      .update(updates)
      .eq('id', targetItems.id)
  } else {
    // المادة غير موجودة - نضيفها
    await supabase
      .from('tb_inventory')
      .insert([{
        productcode: productCode,
        productname: productName,
        quantity: quantity,
        storeid: toStoreId,
        sellpriceiqd: newPriceIQD || sourceItems.sellpriceiqd,
        sellpriceusd: newPriceUSD || sourceItems.sellpriceusd,
        unit: sourceItems.unit,
        minstocklevel: sourceItems.minstocklevel,
        reorderquantity: sourceItems.reorderquantity,
        monitorenabled: sourceItems.monitorenabled,
        lowstocknotify: sourceItems.lowstocknotify
      }])
  }

  // 5. تسجيل عملية النقل
  await createStoreTransfer({
    productcode: productCode,
    productname: productName,
    quantity: quantity,
    fromstoreid: fromStoreId,
    fromstorename: fromStore.storename,
    tostoreid: toStoreId,
    tostorename: toStore.storename,
    note: note,
    description: `نقل ${quantity} من ${productName} من ${fromStore.storename} إلى ${toStore.storename}`
  })
}
