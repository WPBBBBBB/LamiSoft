"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Camera, X, ScanLine } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"
import { toast } from "sonner"

interface BarcodeScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBarcodeScanned: (barcode: string) => void
}

export function BarcodeScannerModal({ open, onOpenChange, onBarcodeScanned }: BarcodeScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string>("")
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>("")
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const readerElementId = "barcode-reader"

  const loadCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras()
      if (devices && devices.length > 0) {
        setCameras(devices)
        // استخدام الكاميرا الخلفية بشكل افتراضي
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0]
        setSelectedCamera(backCamera.id)
      } else {
        setError('لم يتم العثور على كاميرا')
      }
    } catch (err) {
      setError('خطأ في الوصول إلى الكاميرا')
    }
  }

  // تحميل الكاميرات المتاحة
  useEffect(() => {
    if (open) {
      loadCameras()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const startScanning = async () => {
    if (!selectedCamera) {
      toast.error('الرجاء اختيار كاميرا')
      return
    }

    try {
      setIsScanning(true)
      setError("")

      // إنشاء scanner جديد
      const scanner = new Html5Qrcode(readerElementId)
      scannerRef.current = scanner

      // بدء المسح
      await scanner.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 400, height: 400 },
          aspectRatio: 1.7777778
        },
        (decodedText: string) => {
          // تم مسح QR Code بنجاح
          toast.success('تم مسح QR Code بنجاح!')
          
          // إيقاف المسح
          stopScanning()
          
          // إرسال البيانات إلى المكون الأب
          onBarcodeScanned(decodedText)
          
          // إغلاق Modal
          onOpenChange(false)
        },
        (_errorMessage: string) => {
          // خطأ في القراءة (عادي، يحدث باستمرار حتى يجد باركود)
        }
      )
    } catch (err: unknown) {
      setError('خطأ في بدء المسح: ' + ((err as { message?: string })?.message || 'خطأ غير معروف'))
      setIsScanning(false)
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      } catch {
        // Silent fail
      }
    }
    setIsScanning(false)
  }

  // تنظيف عند إغلاق Modal
  useEffect(() => {
    if (!open && isScanning) {
      stopScanning()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isScanning])

  // تنظيف عند unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        stopScanning()
      }
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            مسح QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* اختيار الكاميرا */}
          {cameras.length > 1 && !isScanning && (
            <div className="space-y-2">
              <label className="text-sm font-medium">اختر الكاميرا:</label>
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `كاميرا ${camera.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* منطقة المسح */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            {!isScanning && (
              <div className="aspect-video flex items-center justify-center bg-muted">
                <div className="text-center space-y-4">
                  <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">اضغط على &ldquo;بدء المسح&rdquo; لفتح الكاميرا</p>
                </div>
              </div>
            )}
            
            {/* عنصر القارئ */}
            <div id={readerElementId} className={isScanning ? '' : 'hidden'} />

            {/* خط المسح المتحرك */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-0 right-0 flex items-center justify-center">
                  <ScanLine className="h-8 w-full text-primary animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* رسالة الخطأ */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {/* الأزرار */}
          <div className="flex gap-2 justify-end">
            {!isScanning ? (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4 ml-2" />
                  إلغاء
                </Button>
                <Button onClick={startScanning} disabled={!selectedCamera}>
                  <Camera className="h-4 w-4 ml-2" />
                  بدء المسح
                </Button>
              </>
            ) : (
              <Button variant="destructive" onClick={stopScanning}>
                <X className="h-4 w-4 ml-2" />
                إيقاف المسح
              </Button>
            )}
          </div>

          {/* نصائح */}
          <div className="text-sm text-muted-foreground space-y-1 bg-muted p-3 rounded-md">
            <p className="font-semibold">💡 نصائح للمسح الجيد:</p>
            <ul className="list-disc list-inside space-y-1 mr-4">
              <li>تأكد من وجود إضاءة جيدة</li>
              <li>ضع QR Code في منتصف المربع</li>
              <li>حافظ على ثبات الكاميرا</li>
              <li>تأكد من وضوح QR Code</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
