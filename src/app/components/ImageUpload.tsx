import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Upload, FolderOpen, X, Image as ImageIcon, Download } from 'lucide-react'
import { supabase } from '../utils/api'
import { toast } from "sonner"

interface ImageData {
  id: string
  name: string
  url: string
  uploadedAt: string
}

interface ImageUploadProps {
  orderId?: string
  images: ImageData[]
  onChange: (images: ImageData[]) => void
  readOnly?: boolean
}

export function ImageUpload({ orderId, images, onChange, readOnly = false }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const STORAGE_BUCKET = 'order-images'

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (!orderId) {
      toast.error('Fehler', {
        description: 'Bitte speichern Sie den Auftrag zuerst, bevor Sie Bilder hochladen.',
      })
      return
    }

    setUploading(true)

    try {
      const uploadedImages: ImageData[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Check file type
        if (!file.type.startsWith('image/')) {
          toast.error('Ungültiger Dateityp', {
            description: `${file.name} ist kein Bild`,
          })
          continue
        }

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error('Datei zu groß', {
            description: `${file.name} ist größer als 10MB`,
          })
          continue
        }

        // Upload directly to Supabase Storage
        const fileName = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(fileName, file, { contentType: file.type })

        if (uploadError) {
          throw new Error(uploadError.message || 'Upload fehlgeschlagen')
        }

        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(fileName)

        uploadedImages.push({
          id: uploadData?.path || fileName,
          name: file.name,
          url: urlData.publicUrl,
          uploadedAt: new Date().toISOString(),
        })
      }

      if (uploadedImages.length > 0) {
        const newImages = [...images, ...uploadedImages]
        onChange(newImages)
        toast.success('Bilder hochgeladen', {
          description: `${uploadedImages.length} Bild(er) erfolgreich hochgeladen`,
        })
      }
    } catch (error) {
      console.error('Error uploading images:', error)
      toast.error('Fehler beim Hochladen', {
        description: String(error),
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = async (imageId: string) => {
    if (readOnly || !orderId) return

    try {
      // Remove from Supabase Storage (imageId is the storage path)
      const { error: removeError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([imageId])

      if (removeError) {
        throw new Error(removeError.message || 'Löschen fehlgeschlagen')
      }

      const newImages = images.filter(img => img.id !== imageId)
      onChange(newImages)
      toast.success('Bild gelöscht')
    } catch (error) {
      console.error('Error deleting image:', error)
      toast.error('Fehler beim Löschen', {
        description: String(error),
      })
    }
  }

  const handleDownloadImage = (image: ImageData) => {
    const link = document.createElement('a')
    link.href = image.url
    link.download = image.name
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toggleGallery = () => {
    setShowGallery(!showGallery)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Bilder</CardTitle>
          <Badge variant="secondary" className="text-sm">
            <ImageIcon className="h-3 w-3 mr-1" />
            {images.length} {images.length === 1 ? 'Bild' : 'Bilder'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Controls */}
        {!readOnly && (
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="default"
              onClick={handleFileSelect}
              disabled={uploading || !orderId}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Wird hochgeladen...' : 'Bilder hochladen'}
            </Button>
            {images.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={toggleGallery}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                {showGallery ? 'Ordner schließen' : 'Ordner öffnen'}
              </Button>
            )}
          </div>
        )}

        {readOnly && images.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={toggleGallery}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            {showGallery ? 'Ordner schließen' : 'Ordner öffnen'}
          </Button>
        )}

        {!orderId && !readOnly && (
          <div className="p-4 bg-muted/50 border rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 Bitte speichern Sie den Auftrag zuerst, um Bilder hochzuladen.
            </p>
          </div>
        )}

        {/* Image Gallery */}
        {showGallery && images.length > 0 && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative group border rounded-lg overflow-hidden bg-muted aspect-square"
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownloadImage(image)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {!readOnly && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveImage(image.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs truncate">
                    {image.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {images.length === 0 && (
          <div className="text-center py-8 border rounded-lg border-dashed">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Keine Bilder hochgeladen
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}