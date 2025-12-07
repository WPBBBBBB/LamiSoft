export interface SocialAccount {
  platform: 'whatsapp' | 'telegram' | 'discord'
  username: string
  accessToken?: string
  refreshToken?: string
  sessionData?: string
  lastLogin: string
  isActive: boolean
}

const STORAGE_KEY = 'social_accounts'

export function saveSocialAccount(account: SocialAccount): void {
  if (typeof window === 'undefined') return
  
  const accounts = getSocialAccounts()
  const existingIndex = accounts.findIndex(a => a.platform === account.platform)
  
  if (existingIndex >= 0) {
    accounts[existingIndex] = account
  } else {
    accounts.push(account)
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}

export function getSocialAccounts(): SocialAccount[] {
  if (typeof window === 'undefined') return []
  
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) return []
  
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

export function getSocialAccount(platform: 'whatsapp' | 'telegram' | 'discord'): SocialAccount | null {
  const accounts = getSocialAccounts()
  return accounts.find(a => a.platform === platform) || null
}

export function deleteSocialAccount(platform: 'whatsapp' | 'telegram' | 'discord'): void {
  if (typeof window === 'undefined') return
  
  const accounts = getSocialAccounts()
  const filtered = accounts.filter(a => a.platform !== platform)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export function updateAccountStatus(platform: 'whatsapp' | 'telegram' | 'discord', isActive: boolean): void {
  const account = getSocialAccount(platform)
  if (account) {
    account.isActive = isActive
    account.lastLogin = new Date().toISOString()
    saveSocialAccount(account)
  }
}
