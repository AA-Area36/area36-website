"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { downloadFile } from "@/lib/files/download"

interface PDFViewerProps {
  previewUrl: string
  title: string
  subtitle?: string
  downloadUrl?: string
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
  canGoPrevious?: boolean
  canGoNext?: boolean
  currentIndex?: number
  totalCount?: number
  previousLabel?: string
  nextLabel?: string
  icon?: React.ReactNode
  onAuthRequired?: () => void
}

export function PDFViewer({
  previewUrl,
  title,
  subtitle,
  downloadUrl,
  onClose,
  onPrevious,
  onNext,
  canGoPrevious = false,
  canGoNext = false,
  currentIndex,
  totalCount,
  previousLabel = "Previous",
  nextLabel = "Next",
  icon,
  onAuthRequired,
}: PDFViewerProps) {
  const [zoom, setZoom] = React.useState(100)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [resolvedUrl, setResolvedUrl] = React.useState<string | null>(null)
  const [previewError, setPreviewError] = React.useState<string | null>(null)
  const [isDownloading, setIsDownloading] = React.useState(false)

  // Resolve preview URL.
  // For proxy routes (/api/files/preview/…), keep iframe pointed at the route
  // (mobile browsers handle direct URLs better than blob-backed PDF iframes).
  React.useEffect(() => {
    setZoom(100)
    setPreviewError(null)

    if (!previewUrl.startsWith("/api/files/preview/")) {
      setResolvedUrl(previewUrl)
      return
    }

    let cancelled = false
    setResolvedUrl(null)

    const verifyPreviewAccess = async (retries = 2): Promise<void> => {
      try {
        const res = await fetch(previewUrl, {
          method: "HEAD",
          cache: "no-store",
        })

        if (cancelled) return

        if (res.ok) {
          setResolvedUrl(previewUrl)
          return
        }

        const requiresPassword = res.headers.get("x-requires-password") === "1"
        if (requiresPassword && retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          return verifyPreviewAccess(retries - 1)
        }

        if (requiresPassword) {
          onAuthRequired?.()
          return
        }

        throw new Error(`Preview failed: ${res.status}`)
      } catch (err) {
        if (cancelled) return
        setPreviewError(err instanceof Error ? err.message : "Failed to load preview")
      }
    }

    void verifyPreviewAccess()

    return () => {
      cancelled = true
    }
  }, [previewUrl, onAuthRequired])

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleDownload = React.useCallback(async () => {
    if (!downloadUrl) return
    setIsDownloading(true)
    try {
      const result = await downloadFile(downloadUrl, title)
      if (result.requiresPassword) {
        onAuthRequired?.()
      }
    } finally {
      setIsDownloading(false)
    }
  }, [downloadUrl, title, onAuthRequired])

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && canGoPrevious && onPrevious) {
        onPrevious()
      } else if (e.key === "ArrowRight" && canGoNext && onNext) {
        onNext()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [canGoPrevious, canGoNext, onPrevious, onNext])

  // Lock body scroll while viewer is open
  React.useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content
          className={`fixed z-[51] flex flex-col bg-background border shadow-lg outline-none ${
            isFullscreen
              ? "inset-0 rounded-none"
              : "left-1/2 top-1/2 h-[90vh] w-[95vw] max-w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-lg"
          }`}
          onEscapeKeyDown={(event) => {
            if (isFullscreen) {
              event.preventDefault()
              setIsFullscreen(false)
            }
          }}
          onPointerDownOutside={(event) => {
            if (isFullscreen) event.preventDefault()
          }}
          aria-describedby={subtitle ? "pdf-viewer-description" : undefined}
          aria-modal="true"
        >
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon || <FileText className="h-5 w-5" aria-hidden="true" />}
              </div>
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="text-base font-semibold truncate text-foreground">
                  {title}
                </DialogPrimitive.Title>
                {subtitle && (
                  <DialogPrimitive.Description id="pdf-viewer-description" className="text-xs text-muted-foreground truncate">
                    {subtitle}
                  </DialogPrimitive.Description>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(Math.max(50, zoom - 25))}
                disabled={zoom <= 50}
                aria-label="Zoom out"
                className="h-8 w-8"
              >
                <ZoomOut className="h-4 w-4" aria-hidden="true" />
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center">
                {zoom}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                disabled={zoom >= 200}
                aria-label="Zoom in"
                className="h-8 w-8"
              >
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
                className="h-8 w-8"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
              {downloadUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Download ${title}`}
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="h-4 w-4 sm:mr-2" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">
                    {isDownloading ? "Downloading..." : "Download"}
                  </span>
                </Button>
              )}
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close"
                  className="h-8 w-8 ml-2"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>
        </div>

        {/* PDF Content Area - Google Drive Embed */}
        <div className="flex-1 bg-muted/50 overflow-auto">
          {previewError ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-destructive">{previewError}</p>
            </div>
          ) : !resolvedUrl ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground animate-pulse">Loading preview...</p>
            </div>
          ) : (
            <iframe
              src={resolvedUrl}
              className="block border-0"
              title={title}
              allow="autoplay"
              style={{
                width: `${zoom}%`,
                height: `${zoom}%`,
                minWidth: "100%",
                minHeight: "100%",
              }}
            />
          )}
        </div>

        {/* Footer with navigation */}
        {(onPrevious || onNext || (currentIndex !== undefined && totalCount !== undefined)) && (
          <div className="flex-shrink-0 flex items-center justify-between p-3 border-t border-border bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={!canGoPrevious}
            >
              <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
              <span className="hidden sm:inline">{previousLabel}</span>
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentIndex !== undefined && totalCount !== undefined
                ? `${currentIndex + 1} of ${totalCount}`
                : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              disabled={!canGoNext}
            >
              <span className="hidden sm:inline">{nextLabel}</span>
              <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
            </Button>
          </div>
        )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
