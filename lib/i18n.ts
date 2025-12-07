export interface Language {
  code: string
  name: string
  nativeName: string
  direction: "ltr" | "rtl"
}

export const languages: Language[] = [
  { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl" },
  { code: "en", name: "English", nativeName: "English", direction: "ltr" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", direction: "ltr" },
  { code: "ku", name: "Kurdish", nativeName: "کوردی", direction: "rtl" },
  { code: "fa", name: "Persian", nativeName: "فارسی", direction: "rtl" },
  { code: "es", name: "Spanish", nativeName: "Español", direction: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", direction: "ltr" },
]

export interface Translations {
  [key: string]: {
    [lang: string]: string
  }
}

export const translations: Translations = {
  // Settings
  "settings": {
    ar: "الإعدادات",
    en: "Settings",
    tr: "Ayarlar",
    ku: "ڕێکخستنەکان",
    fa: "تنظیمات",
    es: "Configuración",
    fr: "Paramètres",
  },
  "appearance": {
    ar: "المظهر",
    en: "Appearance",
    tr: "Görünüm",
    ku: "دیمەن",
    fa: "ظاهر",
    es: "Apariencia",
    fr: "Apparence",
  },
  "language": {
    ar: "اللغة",
    en: "Language",
    tr: "Dil",
    ku: "زمان",
    fa: "زبان",
    es: "Idioma",
    fr: "Langue",
  },
  "fonts": {
    ar: "الخطوط",
    en: "Fonts",
    tr: "Yazı Tipleri",
    ku: "فۆنتەکان",
    fa: "فونت‌ها",
    es: "Fuentes",
    fr: "Polices",
  },
  "theme": {
    ar: "الثيم",
    en: "Theme",
    tr: "Tema",
    ku: "ڕووکار",
    fa: "پوسته",
    es: "Tema",
    fr: "Thème",
  },
  "mode": {
    ar: "الوضع",
    en: "Mode",
    tr: "Mod",
    ku: "دۆخ",
    fa: "حالت",
    es: "Modo",
    fr: "Mode",
  },
  "light": {
    ar: "فاتح",
    en: "Light",
    tr: "Açık",
    ku: "ڕووناک",
    fa: "روشن",
    es: "Claro",
    fr: "Clair",
  },
  "dark": {
    ar: "داكن",
    en: "Dark",
    tr: "Koyu",
    ku: "تاریک",
    fa: "تیره",
    es: "Oscuro",
    fr: "Sombre",
  },
  "system": {
    ar: "النظام",
    en: "System",
    tr: "Sistem",
    ku: "سیستەم",
    fa: "سیستم",
    es: "Sistema",
    fr: "Système",
  },
  "selectTheme": {
    ar: "اختر الثيم",
    en: "Select Theme",
    tr: "Tema Seç",
    ku: "ڕووکار هەڵبژێرە",
    fa: "انتخاب پوسته",
    es: "Seleccionar Tema",
    fr: "Sélectionner Thème",
  },
  "selectFont": {
    ar: "اختر الخط",
    en: "Select Font",
    tr: "Yazı Tipi Seç",
    ku: "فۆنت هەڵبژێرە",
    fa: "انتخاب فونت",
    es: "Seleccionar Fuente",
    fr: "Sélectionner Police",
  },
  "home": {
    ar: "الصفحة الرئيسية",
    en: "Home",
    tr: "Ana Sayfa",
    ku: "سەرەکی",
    fa: "خانه",
    es: "Inicio",
    fr: "Accueil",
  },
}

export function getTranslation(key: string, lang: string): string {
  return translations[key]?.[lang] || translations[key]?.["en"] || key
}
