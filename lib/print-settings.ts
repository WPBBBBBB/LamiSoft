export interface PrintSettings {
  storeName: string
  storeSubtitle: string
  contactInfo: string
  footer: string
}


const defaultPrintSettings: PrintSettings = {
  storeName: "شركة الميسر",
  storeSubtitle: "للمطابخ الحديثة والديكورات وتجارة الأثاث والأكسسوارات",
  contactInfo: "للتواصل: 07XX XXX XXXX - العراق/بغداد - كرادة داخل - قرب النفق - كوت-نابي المصلى",
  footer: "شكراً لتعاملكم معنا - نتمنى لكم تجربة ممتعة"
}


export function getPrintSettings(): PrintSettings {
  if (typeof window === 'undefined') {
    return defaultPrintSettings
  }

  try {
    const savedSettings = localStorage.getItem("printSettings")
    if (savedSettings) {
      return { ...defaultPrintSettings, ...JSON.parse(savedSettings) }
    }
  } catch (error) {
    }

  return defaultPrintSettings
}


export function savePrintSettings(settings: PrintSettings): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    localStorage.setItem("printSettings", JSON.stringify(settings))
    return true
  } catch (error) {
    return false
  }
}