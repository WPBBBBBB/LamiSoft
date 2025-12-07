export interface FontOption {
  id: string
  name: string
  family: string
  category: "arabic" | "latin" | "universal"
  url?: string
}

export const fonts: FontOption[] = [
  // Arabic Fonts
  { id: "cairo", name: "Cairo", family: "'Cairo', sans-serif", category: "arabic" },
  { id: "tajawal", name: "Tajawal", family: "'Tajawal', sans-serif", category: "arabic" },
  { id: "amiri", name: "Amiri", family: "'Amiri', serif", category: "arabic" },
  { id: "noto-arabic", name: "Noto Sans Arabic", family: "'Noto Sans Arabic', sans-serif", category: "arabic" },
  { id: "almarai", name: "Almarai", family: "'Almarai', sans-serif", category: "arabic" },
  { id: "readex", name: "Readex Pro", family: "'Readex Pro', sans-serif", category: "arabic" },
  
  // Latin Fonts
  { id: "inter", name: "Inter", family: "'Inter', sans-serif", category: "latin" },
  { id: "roboto", name: "Roboto", family: "'Roboto', sans-serif", category: "latin" },
  { id: "open-sans", name: "Open Sans", family: "'Open Sans', sans-serif", category: "latin" },
  { id: "lato", name: "Lato", family: "'Lato', sans-serif", category: "latin" },
  { id: "montserrat", name: "Montserrat", family: "'Montserrat', sans-serif", category: "latin" },
  { id: "poppins", name: "Poppins", family: "'Poppins', sans-serif", category: "latin" },
  { id: "raleway", name: "Raleway", family: "'Raleway', sans-serif", category: "latin" },
  { id: "source-sans", name: "Source Sans Pro", family: "'Source Sans Pro', sans-serif", category: "latin" },
  { id: "nunito", name: "Nunito", family: "'Nunito', sans-serif", category: "latin" },
  { id: "pt-sans", name: "PT Sans", family: "'PT Sans', sans-serif", category: "latin" },
  
  // Universal/Neutral
  { id: "geist", name: "Geist", family: "'Geist', sans-serif", category: "universal" },
  { id: "system", name: "System Font", family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", category: "universal" },
  { id: "arial", name: "Arial", family: "Arial, sans-serif", category: "universal" },
  { id: "helvetica", name: "Helvetica", family: "'Helvetica Neue', Helvetica, sans-serif", category: "universal" },
]

export function applyFont(fontFamily: string) {
  document.documentElement.style.setProperty("--font-family", fontFamily)
  document.body.style.fontFamily = fontFamily
}

export function getFontById(id: string): FontOption | undefined {
  return fonts.find((font) => font.id === id)
}

export function loadGoogleFont(fontName: string) {
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, "+")}:wght@300;400;500;600;700&display=swap`
  document.head.appendChild(link)
}
