"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Upload, RotateCw, Crop, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useSettings } from "@/components/providers/settings-provider"
import { t } from "@/lib/translations"

interface AvatarEditorProps {
  currentAvatar: string | null
  userId: string
  onClose: () => void
  onUpdate: (newAvatarUrl: string) => void
}

export default function AvatarEditor({ currentAvatar, userId, onClose, onUpdate }: AvatarEditorProps) {
  const { currentLanguage } = useSettings()
  const lang = currentLanguage.code

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(currentAvatar)
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [cropShape, setCropShape] = useState<'circle' | 'square'>('circle')
  const [filter, setFilter] = useState('none')
  const [filterValue, setFilterValue] = useState(100)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error(t('pleaseSelectImage', lang))
        return
      }
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const applyFilters = () => {
    if (!preview || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      canvas.width = 400
      canvas.height = 400

      ctx.save()
      ctx.translate(200, 200)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.scale(zoom, zoom)

      const size = Math.min(img.width, img.height)
      const x = (img.width - size) / 2
      const y = (img.height - size) / 2

      ctx.drawImage(img, x, y, size, size, -200, -200, 400, 400)
      ctx.restore()

      // Apply filters
      if (filter !== 'none') {
        ctx.filter = getFilterStyle()
        ctx.drawImage(canvas, 0, 0)
        ctx.filter = 'none'
      }
    }
    img.src = preview
  }

  const getFilterStyle = () => {
    switch (filter) {
      case 'grayscale':
        return `grayscale(${filterValue}%)`
      case 'sepia':
        return `sepia(${filterValue}%)`
      case 'brightness':
        return `brightness(${filterValue}%)`
      case 'contrast':
        return `contrast(${filterValue}%)`
      case 'blur':
        return `blur(${filterValue / 20}px)`
      case 'saturate':
        return `saturate(${filterValue}%)`
      default:
        return 'none'
    }
  }

  const handleUpload = async () => {
    if (!preview) {
      toast.error(t('pleaseSelectImageFirst', lang))
      return
    }

    setIsUploading(true)
    try {
      // Apply filters and transformations to canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get canvas context')

      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = preview
      })

      // Set canvas size
      canvas.width = 400
      canvas.height = 400

      // Apply transformations
      ctx.save()
      ctx.translate(200, 200)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.scale(zoom, zoom)

      const size = Math.min(img.width, img.height)
      const x = (img.width - size) / 2
      const y = (img.height - size) / 2

      ctx.drawImage(img, x, y, size, size, -200, -200, 400, 400)
      ctx.restore()

      // Apply filters
      if (filter !== 'none') {
        ctx.filter = getFilterStyle()
        ctx.drawImage(canvas, 0, 0)
        ctx.filter = 'none'
      }

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create blob'))
        }, 'image/png')
      })

      const formData = new FormData()
      formData.append('avatar', blob, 'avatar.png')
      formData.append('userId', userId)

      const response = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('failedToUploadImage', lang))
      }

      const data = await response.json()
      toast.success(t('imageUploadedSuccessfully', lang))
      
      // Update avatar with cache busting
      const newAvatarUrl = `${data.avatar_url}?t=${Date.now()}`
      onUpdate(newAvatarUrl)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('imageUploadError', lang))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{t('editProfilePicture', lang)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Input */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {selectedFile ? selectedFile.name : t('clickToChooseImage', lang)}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {preview && (
            <>
              {/* Preview */}
              <div className="flex justify-center">
                <div className="relative">
                  <div
                    className={`w-[300px] h-[300px] overflow-hidden ${
                      cropShape === 'circle' ? 'rounded-full' : 'rounded-lg'
                    }`}
                    style={{
                      transform: `rotate(${rotation}deg) scale(${zoom})`,
                      filter: getFilterStyle(),
                    }}
                  >
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </div>

              {/* Tabs للتحكم */}
              <Tabs defaultValue="crop" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="crop">
                    <Crop className="h-4 w-4 mr-2" />
                    {t('cropAndRotate', lang)}
                  </TabsTrigger>
                  <TabsTrigger value="filters">
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t('filters', lang)}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="crop" className="space-y-6 p-4">
                  {/* شكل القص */}
                  <div className="space-y-2">
                    <Label>{t('cropShape', lang)}</Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={cropShape === 'circle' ? 'default' : 'outline'}
                        onClick={() => setCropShape('circle')}
                      >
                        {t('circle', lang)}
                      </Button>
                      <Button
                        type="button"
                        variant={cropShape === 'square' ? 'default' : 'outline'}
                        onClick={() => setCropShape('square')}
                      >
                        {t('square', lang)}
                      </Button>
                    </div>
                  </div>

                  {/* التدوير */}
                  <div className="space-y-2">
                    <Label>{t('rotation', lang)}: {rotation}°</Label>
                    <div className="flex items-center gap-4">
                      <RotateCw className="h-4 w-4" />
                      <Slider
                        value={[rotation]}
                        onValueChange={(v) => setRotation(v[0])}
                        max={360}
                        step={1}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* التكبير */}
                  <div className="space-y-2">
                    <Label>{t('zoom', lang)}: {zoom.toFixed(1)}x</Label>
                    <Slider
                      value={[zoom]}
                      onValueChange={(v) => setZoom(v[0])}
                      min={0.5}
                      max={3}
                      step={0.1}
                      className="flex-1"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="filters" className="space-y-6 p-4">
                  {/* اختيار الفلتر */}
                  <div className="space-y-2">
                    <Label>{t('filterType', lang)}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'none', label: t('noneOption', lang) },
                        { value: 'grayscale', label: t('grayscale', lang) },
                        { value: 'sepia', label: t('sepia', lang) },
                        { value: 'brightness', label: t('brightness', lang) },
                        { value: 'contrast', label: t('contrast', lang) },
                        { value: 'blur', label: t('blur', lang) },
                      ].map((f) => (
                        <Button
                          key={f.value}
                          type="button"
                          variant={filter === f.value ? 'default' : 'outline'}
                          onClick={() => {
                            setFilter(f.value)
                            setFilterValue(100)
                          }}
                          className="text-xs"
                        >
                          {f.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* شدة الفلتر */}
                  {filter !== 'none' && (
                    <div className="space-y-2">
                      <Label>{t('intensity', lang)}: {filterValue}%</Label>
                      <Slider
                        value={[filterValue]}
                        onValueChange={(v) => setFilterValue(v[0])}
                        max={200}
                        step={1}
                        className="flex-1"
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* أزرار الحفظ */}
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={onClose}>
                  {t('cancel', lang)}
                </Button>
                <Button onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? t('uploading', lang) : t('uploadImage', lang)}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
