import { supabase } from "./supabase"

export interface InventoryCount {
  id: string
  count_id: string
  date: string
  user_id: string
  user_name: string
  type: string
  notes: string
  status: string
  store_id: string
  store_name: string
  created_at?: string
}

export interface InventoryCountDetail {
  id?: string
  count_id: string
  item_id: string
  item_name: string
  system_qty: number
  actual_qty: number
  diff_qty: number
  cost: number
  diff_value: number
  item_status: string
  notes: string
}

export interface InventoryItem {
  id: string
  productcode: string
  productname: string
  quantity: number
  unit: string
  storeid: string
  sellpriceiqd: number
  sellpriceusd: number
}

export interface Store {
  id: string
  storename: string
  location: string
  storekeeper: string
}

// Get all stores
export async function getStores() {
  try {
    const { data, error } = await supabase
      .from("tb_store")
      .select("*")
      .eq("isactive", true)
      .order("storename", { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: String(error), data: [] }
  }
}

// Get inventory items by store
export async function getInventoryByStore(storeId: string) {
  try {
    const { data, error } = await supabase
      .from("tb_inventory")
      .select("*")
      .eq("storeid", storeId)
      .order("productname", { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: String(error), data: [] }
  }
}

// Generate next count ID
export async function generateNextCountId(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("inventory_counts")
      .select("count_id")
      .order("count_id", { ascending: false })
      .limit(1)

    if (error && error.code !== 'PGRST116') throw error

    if (!data || data.length === 0) {
      return "INV-000001"
    }

    const lastId = data[0].count_id
    const match = lastId.match(/INV-(\d+)/)
    if (match) {
      const num = parseInt(match[1]) + 1
      return `INV-${String(num).padStart(6, '0')}`
    }

    return "INV-000001"
  } catch (error) {
    console.error("Error generating count ID:", error)
    // في حالة الخطأ، نرجع أول رقم كبداية
    return "INV-000001"
  }
}

// Create inventory count
export async function createInventoryCount(
  count: InventoryCount,
  details: InventoryCountDetail[]
) {
  try {
    // Insert main count record
    const { data: countData, error: countError } = await supabase
      .from("inventory_counts")
      .insert([{
        count_id: count.count_id,
        date: count.date,
        user_id: count.user_id,
        user_name: count.user_name,
        type: count.type,
        notes: count.notes,
        status: count.status,
        store_id: count.store_id,
        store_name: count.store_name,
      }])
      .select()
      .single()

    if (countError) throw countError

    // Insert details
    const detailsToInsert = details.map(d => ({
      count_id: count.count_id,
      item_id: d.item_id,
      item_name: d.item_name,
      system_qty: d.system_qty,
      actual_qty: d.actual_qty,
      diff_qty: d.diff_qty,
      cost: d.cost,
      diff_value: d.diff_value,
      item_status: d.item_status,
      notes: d.notes,
    }))

    const { error: detailsError } = await supabase
      .from("inventory_count_details")
      .insert(detailsToInsert)

    if (detailsError) throw detailsError

    return { success: true, data: countData }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Update inventory quantities based on count
export async function applyInventoryCount(
  countId: string,
  details: InventoryCountDetail[]
) {
  try {
    // Update each item's quantity
    for (const detail of details) {
      const { error } = await supabase
        .from("tb_inventory")
        .update({ quantity: detail.actual_qty })
        .eq("id", detail.item_id)

      if (error) throw error
    }

    // Update count status to approved
    const { error: statusError } = await supabase
      .from("inventory_counts")
      .update({ status: "معتمد" })
      .eq("count_id", countId)

    if (statusError) throw statusError

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get inventory counts
export async function getInventoryCounts() {
  try {
    const { data, error } = await supabase
      .from("inventory_counts")
      .select("*")
      .order("date", { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: String(error), data: [] }
  }
}

// Get count details
export async function getCountDetails(countId: string) {
  try {
    const { data, error } = await supabase
      .from("inventory_count_details")
      .select("*")
      .eq("count_id", countId)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: String(error), data: [] }
  }
}
