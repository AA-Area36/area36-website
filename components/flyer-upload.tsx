"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FlyerFile {
  id: string
  file?: File // Only present for new files not yet uploaded
  fileKey?: string // Only present for uploaded files
  fileName: string
  fileType: string
  fileSize: number
  previewUrl?: string // For client-side preview of images
}

interface FlyerUploadProps {
  value: FlyerFile[]
  onChange: (files: FlyerFile[]) => void
  onUpload?: (file: File) => Promise<{ success: boolean; flyer?: FlyerFile; error?: string }>
  onDelete?: (flyerId: string) => Promise<{ success: boolean; error?: string }>
  maxFiles?: number
  disabled?: boolean
  className?: string
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FlyerUpload({
  value,
  onChange,
  onUpload,
  onDelete,
  maxFiles = 5,
  disabled = false,
  className,
}: FlyerUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [uploadingIds, setUploadingIds] = React.useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = React.useState<Set<string>>(new Set())
  const [error, setError] = React.useState<string | null>(null)

  const canAddMore = value.length < maxFiles

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)

    const newFiles: FlyerFile[] = []
    const filesToProcess = Array.from(files).slice(0, maxFiles - value.length)

    for (const file of filesToProcess) {
      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`"${file.name}" is not a valid file type. Please use JPG, PNG, WebP, GIF, or PDF.`)
        continue
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" is too large. Maximum size is 15MB.`)
        continue
      }

      const id = crypto.randomUUID()
      const flyerFile: FlyerFile = {
        id,
        file,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }

      // Create preview for images
      if (file.type.startsWith("image/")) {
        flyerFile.previewUrl = URL.createObjectURL(file)
      }

      // If onUpload is provided, upload immediately
      if (onUpload) {
        setUploadingIds((prev) => new Set(prev).add(id))
        const result = await onUpload(file)
        setUploadingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })

        if (result.success && result.flyer) {
          newFiles.push(result.flyer)
        } else {
          setError(result.error || "Failed to upload file")
          // Clean up preview URL
          if (flyerFile.previewUrl) {
            URL.revokeObjectURL(flyerFile.previewUrl)
          }
        }
      } else {
        // Just add to local state (for event submission flow)
        newFiles.push(flyerFile)
      }
    }

    if (newFiles.length > 0) {
      onChange([...value, ...newFiles])
    }
  }

  const handleRemove = async (flyerId: string) => {
    const flyer = value.find((f) => f.id === flyerId)
    if (!flyer) return

    // If it's an uploaded file and we have onDelete, call it
    if (flyer.fileKey && onDelete) {
      setDeletingIds((prev) => new Set(prev).add(flyerId))
      const result = await onDelete(flyerId)
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(flyerId)
        return next
      })

      if (!result.success) {
        setError(result.error || "Failed to delete file")
        return
      }
    }

    // Clean up preview URL if exists
    if (flyer.previewUrl) {
      URL.revokeObjectURL(flyer.previewUrl)
    }

    onChange(value.filter((f) => f.id !== flyerId))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && canAddMore) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!disabled && canAddMore) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  // Clean up preview URLs on unmount
  React.useEffect(() => {
    return () => {
      value.forEach((f) => {
        if (f.previewUrl) {
          URL.revokeObjectURL(f.previewUrl)
        }
      })
    }
  }, [])

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      {canAddMore && (
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-6 transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={disabled}
          />
          <div className="flex flex-col items-center gap-2 text-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
              >
                Click to upload
              </button>
              <span className="text-sm text-muted-foreground"> or drag and drop</span>
            </div>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP, GIF, or PDF (max 15MB each, up to {maxFiles} files)
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* File list */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((flyer) => {
            const isUploading = uploadingIds.has(flyer.id)
            const isDeleting = deletingIds.has(flyer.id)
            const isImage = flyer.fileType.startsWith("image/")
            const isPDF = flyer.fileType === "application/pdf"

            return (
              <div
                key={flyer.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30",
                  (isUploading || isDeleting) && "opacity-50"
                )}
              >
                {/* Preview/Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                  {flyer.previewUrl ? (
                    <img
                      src={flyer.previewUrl}
                      alt={flyer.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : flyer.fileKey && isImage ? (
                    <img
                      src={`/api/flyers/${flyer.fileKey}`}
                      alt={flyer.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : isPDF ? (
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{flyer.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(flyer.fileSize)}
                    {isPDF && " - PDF"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0">
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(flyer.id)}
                      disabled={disabled}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove {flyer.fileName}</span>
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* File count */}
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} of {maxFiles} files
        </p>
      )}
    </div>
  )
}
