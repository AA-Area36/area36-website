"use client"

import * as React from "react"
import { FileText, Lock, Download, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PDFViewer } from "@/components/pdf-viewer"
import type { Resource } from "@/lib/gdrive/types"

interface ResourceViewerProps {
  resource: Resource | null
  resources: Resource[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onResourceChange: (resource: Resource) => void
}

export function ResourceViewer({
  resource,
  resources,
  open,
  onOpenChange,
  onResourceChange,
}: ResourceViewerProps) {
  if (!open || !resource) return null

  // Navigation
  const currentIndex = resources.findIndex((r) => r.id === resource.id)
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < resources.length - 1 && currentIndex !== -1

  const goPrevious = () => {
    if (canGoPrevious) {
      onResourceChange(resources[currentIndex - 1])
    }
  }

  const goNext = () => {
    if (canGoNext) {
      onResourceChange(resources[currentIndex + 1])
    }
  }

  // Build subtitle
  const subtitleParts: string[] = []
  if (resource.date) subtitleParts.push(resource.date)
  if (resource.size) subtitleParts.push(resource.size)
  if (resource.isProtected) subtitleParts.push("Protected")
  const subtitle = subtitleParts.join(" · ")

  return (
    <PDFViewer
      previewUrl={resource.previewUrl}
      title={resource.title}
      subtitle={subtitle}
      downloadUrl={resource.downloadUrl}
      onClose={() => onOpenChange(false)}
      onPrevious={goPrevious}
      onNext={goNext}
      canGoPrevious={canGoPrevious}
      canGoNext={canGoNext}
      currentIndex={currentIndex !== -1 ? currentIndex : undefined}
      totalCount={resources.length}
      icon={
        resource.isProtected ? (
          <Lock className="h-5 w-5" aria-hidden="true" />
        ) : (
          <FileText className="h-5 w-5" aria-hidden="true" />
        )
      }
    />
  )
}

// Clickable resource item that opens the viewer
interface ResourceItemWithViewerProps {
  resource: Resource
  icon: React.ComponentType<{ className?: string }>
  onView: (resource: Resource) => void
}

export function ResourceItemWithViewer({
  resource,
  icon: Icon,
  onView,
}: ResourceItemWithViewerProps) {
  return (
    <div className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {resource.isProtected ? (
          <Lock className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Icon className="h-6 w-6" aria-hidden="true" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {resource.title}
          </h3>
          {resource.isProtected && (
            <Badge variant="secondary" className="text-xs">
              Protected
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {resource.date && resource.size && `${resource.date} · ${resource.size}`}
          {resource.date && !resource.size && resource.date}
          {!resource.date && resource.size && resource.size}
          {resource.description && !resource.date && !resource.size && resource.description}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onView(resource)}
          aria-label={`View ${resource.title}`}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          asChild
          aria-label={`Download ${resource.title}`}
        >
          <a
            href={resource.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </div>
  )
}
