import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'

/**
 * توليد باركود لقائمة البيع (رقم القائمة فقط)
 * @param saleNumber رقم قائمة البيع (مثل: S-00001)
 * @returns رقم القائمة نفسه
 */
export function generateSaleBarcode(saleNumber: string): string {
  // إرجاع رقم القائمة كما هو بدون تعديل
  return saleNumber
}

/**
 * حساب check digit لـ EAN13
 */
function calculateEAN13CheckDigit(barcode: string): number {
  const digits = barcode.split('').map(Number)
  let sum = 0
  
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  }
  
  const remainder = sum % 10
  return remainder === 0 ? 0 : 10 - remainder
}

/**
 * توليد صورة الباركود كـ Data URL
 * @param barcodeValue قيمة الباركود (13 رقم)
 * @param options خيارات الباركود
 * @returns Data URL للصورة
 */
export function generateBarcodeImage(
  barcodeValue: string,
  options?: {
    width?: number
    height?: number
    displayValue?: boolean
    fontSize?: number
  }
): string {
  try {
    const canvas = document.createElement('canvas')
    
    JsBarcode(canvas, barcodeValue, {
      format: 'EAN13',
      width: options?.width || 2,
      height: options?.height || 100,
      displayValue: options?.displayValue !== false,
      fontSize: options?.fontSize || 14,
      textMargin: 5,
      margin: 10,
      background: '#ffffff',
      lineColor: '#000000'
    })
    
    return canvas.toDataURL('image/png')
  } catch (error) {
    console.error('Error generating barcode image:', error)
    return ''
  }
}

/**
 * رسم الباركود على canvas element
 * @param barcodeValue قيمة الباركود
 * @param canvas عنصر Canvas
 */
export function drawBarcodeOnCanvas(
  barcodeValue: string,
  canvas: HTMLCanvasElement,
  options?: {
    width?: number
    height?: number
    displayValue?: boolean
  }
): void {
  try {
    JsBarcode(canvas, barcodeValue, {
      format: 'EAN13',
      width: options?.width || 2,
      height: options?.height || 100,
      displayValue: options?.displayValue !== false,
      fontSize: 14,
      textMargin: 5,
      margin: 10,
      background: '#ffffff',
      lineColor: '#000000'
    })
  } catch (error) {
    console.error('Error drawing barcode:', error)
  }
}

/**
 * التحقق من صحة الباركود
 * @param barcode الباركود المراد التحقق منه
 * @returns true إذا كان الباركود صحيح
 */
export function validateBarcode(barcode: string): boolean {
  if (!barcode || barcode.length !== 13) {
    return false
  }
  
  const digits = barcode.split('').map(Number)
  if (digits.some(isNaN)) {
    return false
  }
  
  const checkDigit = digits[12]
  const calculatedCheckDigit = calculateEAN13CheckDigit(barcode.slice(0, 12))
  
  return checkDigit === calculatedCheckDigit
}

/**
 * تنزيل صورة الباركود
 * @param barcodeValue قيمة الباركود
 * @param filename اسم الملف
 */
export function downloadBarcodeImage(barcodeValue: string, filename: string = 'barcode.png'): void {
  const dataUrl = generateBarcodeImage(barcodeValue)
  if (!dataUrl) return
  
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ==================== QR Code Functions ====================

/**
 * توليد QR Code وإرجاعه كـ Data URL
 * @param data البيانات المراد تشفيرها في QR Code
 * @param options خيارات QR Code
 * @returns Promise<string> Data URL للصورة
 */
export async function generateQRCodeImage(
  data: string,
  options?: {
    width?: number
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    color?: {
      dark?: string
      light?: string
    }
  }
): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: options?.width || 300,
      errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#ffffff'
      },
      margin: 2
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
    return ''
  }
}

/**
 * رسم QR Code على canvas element
 * @param data البيانات المراد تشفيرها
 * @param canvas عنصر Canvas
 * @param options خيارات QR Code
 */
export async function drawQRCodeOnCanvas(
  data: string,
  canvas: HTMLCanvasElement,
  options?: {
    width?: number
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    color?: {
      dark?: string
      light?: string
    }
  }
): Promise<void> {
  try {
    await QRCode.toCanvas(canvas, data, {
      width: options?.width || 300,
      errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#ffffff'
      },
      margin: 2
    })
  } catch (error) {
    console.error('Error drawing QR code on canvas:', error)
  }
}

/**
 * تنزيل QR Code كصورة
 * @param data البيانات المراد تشفيرها
 * @param filename اسم الملف
 */
export async function downloadQRCodeImage(
  data: string,
  filename: string = 'qrcode.png'
): Promise<void> {
  const dataUrl = await generateQRCodeImage(data)
  if (!dataUrl) return
  
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
