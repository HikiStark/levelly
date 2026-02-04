'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2 } from 'lucide-react'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  bucket?: string
  maxSizeMB?: number
  className?: string
}

export function ImageUpload({
  value,
  onChange,
  bucket = 'question-images',
  maxSizeMB = 5,
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image (JPEG, PNG, WebP, or GIF)')
      return
    }

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      setError(`Image must be smaller than ${maxSizeMB}MB`)
      return
    }

    setUploading(true)

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      onChange(publicUrl)
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = async () => {
    if (!value) return

    try {
      // Extract file path from URL
      const urlParts = value.split(`/${bucket}/`)
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        await supabase.storage.from(bucket).remove([filePath])
      }
    } catch (err) {
      console.error('Failed to delete image:', err)
    }

    onChange(null)
  }

  return (
    <div className={className}>
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Uploaded image"
            className="max-w-full max-h-48 rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </>
            )}
          </Button>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  )
}
