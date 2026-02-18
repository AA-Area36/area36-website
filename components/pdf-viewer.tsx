"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
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
}: PDFViewerProps) {
  const [zoom, setZoom] = React.useState(100)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [resolvedUrl, setResolvedUrl] = React.useState<string | null>(null)
  const [previewError, setPreviewError] = React.useState<string | null>(null)

  // Resolve preview URL.
  // For proxy routes (/api/files/preview/…) we fetch the PDF bytes and create
  // a blob URL so the iframe never contacts drive.google.com directly.
  React.useEffect(() => {
    setZoom(100)
    setPreviewError(null)
    let blobUrl: string | null = null

    if (previewUrl.startsWith("/api/files/preview/")) {
      setResolvedUrl(null)

      const fetchPreview = async (retries = 2): Promise<void> => {
        try {
          const res = await fetch(previewUrl)

          if (!res.ok) {
            const contentType = res.headers.get("content-type") || ""
            if (contentType.includes("application/json")) {
              const json = await res.json() as { requiresPassword?: boolean; error?: string }
              if (json.requiresPassword && retries > 0) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                return fetchPreview(retries - 1)
              }
              throw new Error(json.error || `Preview failed: ${res.status}`)
            }
            throw new Error(`Preview failed: ${res.status}`)
          }

          const blob = await res.blob()
          blobUrl = URL.createObjectURL(blob)
          setResolvedUrl(blobUrl)
        } catch (err) {
          setPreviewError(err instanceof Error ? err.message : "Failed to load preview")
        }
      }

      fetchPreview()
    } else {
      setResolvedUrl(previewUrl)
    }

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [previewUrl])

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          onClose()
        }
      } else if (e.key === "ArrowLeft" && canGoPrevious && onPrevious) {
        onPrevious()
      } else if (e.key === "ArrowRight" && canGoNext && onNext) {
        onNext()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isFullscreen, canGoPrevious, canGoNext, onPrevious, onNext, onClose])

  // Lock body scroll while viewer is open
  React.useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !isFullscreen && onClose()}
      />

      {/* Dialog */}
      <div
        className={`relative flex flex-col bg-background border shadow-lg ${
          isFullscreen
            ? "fixed inset-0 rounded-none z-[51]"
            : "w-[95vw] max-w-[1000px] h-[90vh] rounded-lg"
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon || <FileText className="h-5 w-5" aria-hidden="true" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold truncate text-foreground">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-muted-foreground truncate">
                    {subtitle}
                  </p>
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
                  onClick={() => downloadFile(downloadUrl, title)}
                >
                  <Download className="h-4 w-4 sm:mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close"
                className="h-8 w-8 ml-2"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
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
              className="border-0"
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
      </div>
    </div>,
    document.body
  )
}
