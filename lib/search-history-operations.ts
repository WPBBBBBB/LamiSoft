import { supabase } from './supabase'

export interface SearchHistory {
  id: string
  user_id: string
  search_query: string
  search_type: string | null
  created_at: string
}

/**
 * حفظ عملية بحث في التاريخ
 */
export async function saveSearchHistory(
  userId: string,
  searchQuery: string,
  searchType: string = 'all'
): Promise<void> {
  try {
    // عدم حفظ البحث إذا كان فارغاً
    if (!searchQuery.trim()) return

    const { error } = await supabase
      .from('search_history')
      .insert({
        user_id: userId,
        search_query: searchQuery.trim(),
        search_type: searchType,
      })

    if (error) throw error
  } catch (error) {
    }
}

/**
 * الحصول على آخر 10 عمليات بحث للمستخدم
 */
export async function getSearchHistory(userId: string, limit: number = 10): Promise<SearchHistory[]> {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    return []
  }
}

/**
 * حذف عملية بحث محددة
 */
export async function deleteSearchHistoryItem(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    return false
  }
}

/**
 * حذف جميع عمليات البحث للمستخدم
 */
export async function clearSearchHistory(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('user_id', userId)

    if (error) throw error
    return true
  } catch (error) {
    return false
  }
}

/**
 * البحث الذكي مع تصحيح الأخطاء الإملائية (Fuzzy Search)
 * يستخدم pg_trgm في PostgreSQL
 */
export function fuzzyMatch(query: string, text: string): boolean {
  // فحص القيم الفارغة
  if (!query || !text) return false
  
  const normalize = (str: string) => str.toLowerCase().trim()
  const q = normalize(query)
  const t = normalize(text)

  // مطابقة تامة
  if (t.includes(q)) return true

  // إزالة التشكيل والهمزات للعربية
  const normalizeArabic = (str: string) => {
    return str
      .replace(/[أإآ]/g, 'ا')
      .replace(/[ؤ]/g, 'و')
      .replace(/[ئ]/g, 'ي')
      .replace(/[ة]/g, 'ه')
      .replace(/[\u064B-\u065F]/g, '') // إزالة التشكيل
  }

  const qAr = normalizeArabic(q)
  const tAr = normalizeArabic(t)

  if (tAr.includes(qAr)) return true

  // مطابقة جزئية (70% تشابه)
  return similarity(qAr, tAr) > 0.7
}

/**
 * حساب نسبة التشابه بين نصين (Levenshtein distance)
 */
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1

  if (longer.length === 0) return 1.0

  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

/**
 * حساب Levenshtein distance
 */
function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = []
  for (let i = 0; i <= s2.length; i++) {
    let lastValue = i
    for (let j = 0; j <= s1.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (s1.charAt(j - 1) !== s2.charAt(i - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[s1.length] = lastValue
  }
  return costs[s1.length]
}
