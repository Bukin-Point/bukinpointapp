'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { optimizeImage, validateImageFileClient } from '@/lib/upload-client'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ImageUploaderProps {
  value?: string | null
  onChange: (url: string | null) => void
  providerId: string
  serviceId?: string
  maxSizeMB?: number
  accept?: string
  aspectRatio?: string
  className?: string
  disabled?: boolean
}

export function ImageUploader({
  value,
  onChange,
  providerId,
  serviceId,
  maxSizeMB = 2,
  accept = 'image/jpeg,image/jpg,image/png,image/webp',
  aspectRatio,
  className,
  disabled = false,
}: ImageUploaderProps) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(
    async (file: File) => {
      // Client-side validation
      const validation = validateImageFileClient(file)
      if (!validation.valid) {
        toast({
          title: 'Invalid file',
          description: validation.error,
          variant: 'destructive',
        })
        return
      }

      setUploading(true)

      try {
        // Optimize image before upload
        const optimizedFile = await optimizeImage(file, maxSizeMB)

        // Upload through server (avoids CORS issues)
        const formData = new FormData()
        formData.append('file', optimizedFile)
        formData.append('providerId', providerId)
        if (serviceId) {
          formData.append('serviceId', serviceId)
        }

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          let errorMessage = 'Failed to upload image'
          try {
            const error = await response.json()
            errorMessage = error.error || errorMessage
          } catch {
            // If response is not JSON (e.g., 404 HTML page)
            if (response.status === 404) {
              errorMessage = 'Upload API endpoint not found. Please check server configuration.'
            } else {
              errorMessage = `Server error: ${response.status} ${response.statusText}`
            }
          }
          throw new Error(errorMessage)
        }

        const { publicUrl } = await response.json()

        if (!publicUrl) {
          throw new Error('No public URL returned from server')
        }

        // Update parent component with new URL
        onChange(publicUrl)

        toast({
          title: 'Success',
          description: 'Image uploaded successfully',
        })
      } catch (error) {
        console.error('Upload error:', error)
        toast({
          title: 'Upload failed',
          description: error instanceof Error ? error.message : 'An error occurred while uploading',
          variant: 'destructive',
        })
      } finally {
        setUploading(false)
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [providerId, serviceId, maxSizeMB, onChange, toast]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleUpload(file)
      }
    },
    [handleUpload]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (disabled || uploading) return

      const file = e.dataTransfer.files?.[0]
      if (file) {
        handleUpload(file)
      }
    },
    [disabled, uploading, handleUpload]
  )

  const handleRemove = useCallback(() => {
    onChange(null)
  }, [onChange])

  const handleClick = useCallback(() => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click()
    }
  }, [disabled, uploading])

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {value ? (
        // Show uploaded image with remove option
        <div className="relative group">
          <div
            className={cn(
              'relative rounded-lg overflow-hidden border-2 border-border',
              !aspectRatio && 'aspect-video'
            )}
            style={
              aspectRatio
                ? ({ aspectRatio: aspectRatio } as React.CSSProperties)
                : undefined
            }
          >
            <Image
              src={value}
              alt="Uploaded image"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
            />
            {!disabled && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  disabled={uploading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Show upload area
        <div
          onClick={handleClick}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
            dragActive && 'border-primary bg-primary/5',
            !dragActive && 'border-border hover:border-primary/50',
            disabled && 'opacity-50 cursor-not-allowed',
            !aspectRatio && 'aspect-video',
            uploading && 'pointer-events-none'
          )}
          style={
            aspectRatio
              ? ({ aspectRatio: aspectRatio } as React.CSSProperties)
              : undefined
          }
        >
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            {uploading ? (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-body-sm text-text-secondary">Uploading...</p>
              </>
            ) : (
              <>
                <div className="rounded-full bg-muted p-4">
                  <Upload className="h-8 w-8 text-text-secondary" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-body-sm font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-caption text-text-secondary">
                    PNG, JPG, WebP up to {maxSizeMB}MB
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {value && !disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={uploading}
          className="w-full"
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Replace Image'}
        </Button>
      )}
    </div>
  )
}
