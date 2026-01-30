"use client"

import * as React from "react"
import { FileText, Lock, Download, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PDFViewer } from "@/components/pdf-viewer"
import { FilePasswordDialog } from "@/components/file-password-dialog"
import { verifyFilePassword } from "@/app/admin/(dashboard)/files/actions"
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
  const [unlockedFiles, setUnlockedFiles] = React.useState<Set<string>>(new Set())
  const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false)
  const [pendingResource, setPendingResource] = React.useState<Resource | null>(null)

  // Check if the current resource needs password
  const isLocked = resource?.isProtected && !unlockedFiles.has(resource.id)

  // When trying to open a protected file, show password dialog instead
  React.useEffect(() => {
    if (open && resource?.isProtected && !unlockedFiles.has(resource.id)) {
      setPendingResource(resource)
      setPasswordDialogOpen(true)
      onOpenChange(false)
    }
  }, [open, resource, unlockedFiles, onOpenChange])

  if (!open || !resource) return null

  // Don't show viewer for locked files
  if (isLocked) return null

  // Navigation
  const currentIndex = resources.findIndex((r) => r.id === resource.id)
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < resources.length - 1 && currentIndex !== -1

  const goPrevious = () => {
    if (canGoPrevious) {
      const prevResource = resources[currentIndex - 1]
      // Check if next resource is protected and not unlocked
      if (prevResource.isProtected && !unlockedFiles.has(prevResource.id)) {
        setPendingResource(prevResource)
        setPasswordDialogOpen(true)
        onOpenChange(false)
      } else {
        onResourceChange(prevResource)
      }
    }
  }

  const goNext = () => {
    if (canGoNext) {
      const nextResource = resources[currentIndex + 1]
      // Check if next resource is protected and not unlocked
      if (nextResource.isProtected && !unlockedFiles.has(nextResource.id)) {
        setPendingResource(nextResource)
        setPasswordDialogOpen(true)
        onOpenChange(false)
      } else {
        onResourceChange(nextResource)
      }
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

// Wrapper component that manages password dialog state
interface ResourceViewerWithPasswordProps extends ResourceViewerProps {}

export function ResourceViewerWithPassword(props: ResourceViewerWithPasswordProps) {
  const { resource, resources, open, onOpenChange, onResourceChange } = props
  const [unlockedFiles, setUnlockedFiles] = React.useState<Set<string>>(new Set())
  const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false)
  const [pendingResource, setPendingResource] = React.useState<Resource | null>(null)
  const [viewerOpen, setViewerOpen] = React.useState(false)

  // Handle opening the viewer
  React.useEffect(() => {
    if (open && resource) {
      if (resource.isProtected && !unlockedFiles.has(resource.id)) {
        // Need to unlock first
        setPendingResource(resource)
        setPasswordDialogOpen(true)
      } else {
        // Can view directly
        setViewerOpen(true)
      }
    } else {
      setViewerOpen(false)
    }
  }, [open, resource, unlockedFiles])

  const handlePasswordSuccess = () => {
    if (pendingResource) {
      setUnlockedFiles((prev) => new Set(prev).add(pendingResource.id))
      onResourceChange(pendingResource)
      setViewerOpen(true)
      setPendingResource(null)
    }
  }

  const handleViewerClose = () => {
    setViewerOpen(false)
    onOpenChange(false)
  }

  const handleNavigation = (newResource: Resource) => {
    if (newResource.isProtected && !unlockedFiles.has(newResource.id)) {
      setPendingResource(newResource)
      setPasswordDialogOpen(true)
      setViewerOpen(false)
    } else {
      onResourceChange(newResource)
    }
  }

  // Navigation
  const currentResource = viewerOpen ? resource : null
  const currentIndex = currentResource ? resources.findIndex((r) => r.id === currentResource.id) : -1
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < resources.length - 1 && currentIndex !== -1

  const goPrevious = () => {
    if (canGoPrevious) {
      handleNavigation(resources[currentIndex - 1])
    }
  }

  const goNext = () => {
    if (canGoNext) {
      handleNavigation(resources[currentIndex + 1])
    }
  }

  // Build subtitle
  const subtitleParts: string[] = []
  if (currentResource?.date) subtitleParts.push(currentResource.date)
  if (currentResource?.size) subtitleParts.push(currentResource.size)
  if (currentResource?.isProtected) subtitleParts.push("Protected")
  const subtitle = subtitleParts.join(" · ")

  return (
    <>
      {viewerOpen && currentResource && (
        <PDFViewer
          previewUrl={currentResource.previewUrl}
          title={currentResource.title}
          subtitle={subtitle}
          downloadUrl={currentResource.downloadUrl}
          onClose={handleViewerClose}
          onPrevious={goPrevious}
          onNext={goNext}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          currentIndex={currentIndex !== -1 ? currentIndex : undefined}
          totalCount={resources.length}
          icon={
            currentResource.isProtected ? (
              <Lock className="h-5 w-5" aria-hidden="true" />
            ) : (
              <FileText className="h-5 w-5" aria-hidden="true" />
            )
          }
        />
      )}
      {pendingResource && (
        <FilePasswordDialog
          fileId={pendingResource.id}
          fileName={pendingResource.title}
          open={passwordDialogOpen}
          onOpenChange={(open) => {
            setPasswordDialogOpen(open)
            if (!open) {
              setPendingResource(null)
              onOpenChange(false)
            }
          }}
          onVerify={verifyFilePassword}
          onSuccess={handlePasswordSuccess}
        />
      )}
    </>
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
