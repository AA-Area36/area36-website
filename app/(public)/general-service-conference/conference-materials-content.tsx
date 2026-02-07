"use client"

import * as React from "react"
import { FileText, Lock, FolderOpen, Download, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PDFViewer } from "@/components/pdf-viewer"
import type { Resource } from "@/lib/gdrive/types"

interface ConferenceMaterialsContentProps {
  materials: Resource[]
}

export function ConferenceMaterialsContent({ materials }: ConferenceMaterialsContentProps) {
  const [viewerOpen, setViewerOpen] = React.useState(false)
  const [selectedResource, setSelectedResource] = React.useState<Resource | null>(null)

  const handleView = (resource: Resource) => {
    setSelectedResource(resource)
    setViewerOpen(true)
  }

  const handleResourceChange = (resource: Resource) => {
    setSelectedResource(resource)
  }

  // Navigation for viewer
  const currentIndex = selectedResource
    ? materials.findIndex((r) => r.id === selectedResource.id)
    : -1
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < materials.length - 1 && currentIndex !== -1

  const goPrevious = () => {
    if (canGoPrevious) {
      handleResourceChange(materials[currentIndex - 1])
    }
  }

  const goNext = () => {
    if (canGoNext) {
      handleResourceChange(materials[currentIndex + 1])
    }
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          No conference materials available at this time.
        </p>
      </div>
    )
  }

  // Build subtitle for viewer
  const getSubtitle = (resource: Resource | null) => {
    if (!resource) return ""
    const parts: string[] = []
    if (resource.date) parts.push(resource.date)
    if (resource.size) parts.push(resource.size)
    if (resource.isProtected) parts.push("Protected")
    return parts.join(" · ")
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {materials.map((doc) => (
          <div
            key={doc.id}
            className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {doc.isProtected ? (
                <Lock className="h-6 w-6" aria-hidden="true" />
              ) : (
                <FileText className="h-6 w-6" aria-hidden="true" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {doc.title}
                </h3>
                {doc.isProtected && (
                  <Badge variant="secondary" className="text-xs">
                    Protected
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {doc.date && doc.size && `${doc.date} · ${doc.size}`}
                {doc.date && !doc.size && doc.date}
                {!doc.date && doc.size && doc.size}
                {doc.description && !doc.date && !doc.size && doc.description}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleView(doc)}
                aria-label={`View ${doc.title}`}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                asChild
                aria-label={`Download ${doc.title}`}
              >
                <a
                  href={doc.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Resource Viewer Dialog */}
      {viewerOpen && selectedResource && (
        <PDFViewer
          previewUrl={selectedResource.previewUrl}
          title={selectedResource.title}
          subtitle={getSubtitle(selectedResource)}
          downloadUrl={selectedResource.downloadUrl}
          onClose={() => setViewerOpen(false)}
          onPrevious={goPrevious}
          onNext={goNext}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          currentIndex={currentIndex !== -1 ? currentIndex : undefined}
          totalCount={materials.length}
          icon={
            selectedResource.isProtected ? (
              <Lock className="h-5 w-5" aria-hidden="true" />
            ) : (
              <FileText className="h-5 w-5" aria-hidden="true" />
            )
          }
        />
      )}
    </>
  )
}
