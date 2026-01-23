"use client"

import * as React from "react"
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

  // Reset zoom when content changes
  React.useEffect(() => {
    setZoom(100)
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => !isFullscreen && onClose()}
      />

      {/* Dialog */}
      <div
        className={`fixed z-50 flex flex-col bg-background border rounded-lg shadow-lg ${
          isFullscreen
            ? "inset-0 rounded-none"
            : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[1000px] h-[90vh]"
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
                  asChild
                  aria-label={`Download ${title}`}
                >
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4 sm:mr-2" aria-hidden="true" />
                    <span className="hidden sm:inline">Download</span>
                  </a>
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
          <iframe
            src={previewUrl}
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
    </>
  )
}
