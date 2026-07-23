"use client"

import * as React from "react"
import { FileText, Lock, Download, Eye, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PDFViewer } from "@/components/pdf-viewer"
import { FilePasswordDialog } from "@/components/file-password-dialog"
import { verifyFilePassword } from "@/lib/actions/verify-password"
import { downloadFile } from "@/lib/files/download"
import {
  clearFileUnlocked,
  isFileUnlockedClient,
  getUnlockedUrls,
  markFileUnlocked,
} from "@/lib/files/unlocked-store"
import { supportsInlinePdfPreview } from "@/lib/files/preview"
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
      onAuthRequired={() => {
        clearFileUnlocked(resource.id)
        setPendingResource(resource)
        setPasswordDialogOpen(true)
        onOpenChange(false)
      }}
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
type ResourceViewerWithPasswordProps = ResourceViewerProps

export function ResourceViewerWithPassword(props: ResourceViewerWithPasswordProps) {
  const { resource, resources, open, onOpenChange, onResourceChange } = props
  const [unlockedFiles, setUnlockedFiles] = React.useState<Set<string>>(new Set())
  const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false)
  const [pendingResource, setPendingResource] = React.useState<Resource | null>(null)
  const [viewerOpen, setViewerOpen] = React.useState(false)
  const justUnlockedRef = React.useRef(false)

  // Handle opening the viewer
  React.useEffect(() => {
    if (open && resource) {
      if (resource.isProtected && !unlockedFiles.has(resource.id) && !isFileUnlockedClient(resource.id)) {
        // Need to unlock first
        setPendingResource(resource)
        setPasswordDialogOpen(true)
      } else {
        // Can view directly — resolve URLs from shared store if needed
        const cached = getUnlockedUrls(resource.id)
        if (
          cached &&
          (resource.previewUrl !== cached.previewUrl ||
            resource.downloadUrl !== cached.downloadUrl)
        ) {
          onResourceChange({
            ...resource,
            previewUrl: cached.previewUrl,
            downloadUrl: cached.downloadUrl,
          })
        }
        setViewerOpen(true)
      }
    } else {
      setViewerOpen(false)
    }
  }, [open, resource, unlockedFiles, onResourceChange])

  const handlePasswordSuccess = (result: { previewUrl?: string; downloadUrl?: string; unlockExpiresAt?: number }) => {
    if (pendingResource) {
      justUnlockedRef.current = true
      setUnlockedFiles((prev) => new Set(prev).add(pendingResource.id))

      if (result.previewUrl && result.downloadUrl) {
        markFileUnlocked(pendingResource.id, {
          previewUrl: result.previewUrl,
          downloadUrl: result.downloadUrl,
          unlockExpiresAt: result.unlockExpiresAt,
        })
      }

      // Use direct GDrive URLs from server action if available
      if (result.previewUrl || result.downloadUrl) {
        onResourceChange({
          ...pendingResource,
          previewUrl: result.previewUrl || pendingResource.previewUrl,
          downloadUrl: result.downloadUrl || pendingResource.downloadUrl,
        })
      } else {
        onResourceChange(pendingResource)
      }
      setViewerOpen(true)
      setPendingResource(null)
    }
  }

  const handleViewerClose = () => {
    setViewerOpen(false)
    onOpenChange(false)
  }

  const handleNavigation = (newResource: Resource) => {
    if (newResource.isProtected && !unlockedFiles.has(newResource.id) && !isFileUnlockedClient(newResource.id)) {
      setPendingResource(newResource)
      setPasswordDialogOpen(true)
      setViewerOpen(false)
    } else {
      const cached = getUnlockedUrls(newResource.id)
      if (cached) {
        onResourceChange({ ...newResource, previewUrl: cached.previewUrl, downloadUrl: cached.downloadUrl })
      } else {
        onResourceChange(newResource)
      }
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
          onAuthRequired={() => {
            clearFileUnlocked(currentResource.id)
            setUnlockedFiles((prev) => {
              const next = new Set(prev)
              next.delete(currentResource.id)
              return next
            })
            setPendingResource(currentResource)
            setPasswordDialogOpen(true)
            setViewerOpen(false)
          }}
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
              const closedAfterUnlock = justUnlockedRef.current
              justUnlockedRef.current = false
              setPendingResource(null)
              if (!closedAfterUnlock) {
                onOpenChange(false)
              }
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
  const canPreview = supportsInlinePdfPreview(resource.mimeType)
  const [loadingAction, setLoadingAction] = React.useState<"view" | "download" | null>(null)
  const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false)

  const handleViewClick = () => {
    if (!canPreview) return
    setLoadingAction("view")
    onView(resource)
    setLoadingAction(null)
  }

  const handleDownload = async () => {
    if (resource.isProtected && !isFileUnlockedClient(resource.id)) {
      setPasswordDialogOpen(true)
      return
    }

    setLoadingAction("download")
    try {
      const resolved = getUnlockedUrls(resource.id)
      const url = resolved?.downloadUrl || resource.downloadUrl || ""
      const result = await downloadFile(url, resource.title)
      if (result.requiresPassword) {
        setPasswordDialogOpen(true)
      }
    } finally {
      setLoadingAction(null)
    }
  }

  const handlePasswordSuccess = async (result: {
    previewUrl?: string
    downloadUrl?: string
    unlockExpiresAt?: number
  }) => {
    if (result.previewUrl && result.downloadUrl) {
      markFileUnlocked(resource.id, {
        previewUrl: result.previewUrl,
        downloadUrl: result.downloadUrl,
        unlockExpiresAt: result.unlockExpiresAt,
      })
    }

    await downloadFile(result.downloadUrl || resource.downloadUrl || "", resource.title)
  }

  const isViewing = loadingAction === "view"
  const isDownloading = loadingAction === "download"
  const isBusy = loadingAction !== null

  return (
    <>
      <article className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md">
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
          {canPreview && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              disabled={isBusy}
              onClick={handleViewClick}
              aria-label={`View ${resource.title}`}
            >
              {isViewing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            disabled={isBusy}
            onClick={() => void handleDownload()}
            aria-label={`Download ${resource.title}`}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </article>
      <FilePasswordDialog
        fileId={resource.id}
        fileName={resource.title}
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        onVerify={verifyFilePassword}
        onSuccess={(result) => {
          void handlePasswordSuccess(result)
        }}
      />
    </>
  )
}
