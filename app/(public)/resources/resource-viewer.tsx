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
import { getResourceDocumentDate } from "@/lib/resources/organization"
import type { Resource } from "@/lib/gdrive/types"

interface ResourceViewerProps {
  resource: Resource | null
  resources: Resource[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onResourceChange: (resource: Resource) => void
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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Opening a protected resource transitions this controller to its password dialog.
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
  const documentDate = currentResource ? getResourceDocumentDate(currentResource) : undefined
  if (documentDate) subtitleParts.push(documentDate)
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

// Resource list row with explicit preview and download controls.
interface ResourceItemWithViewerProps {
  resource: Resource
  categoryLabel?: string
  headingLevel?: "h3" | "h4"
  icon: React.ComponentType<{ className?: string }>
  onView: (resource: Resource) => void
}

export function ResourceItemWithViewer({
  resource,
  categoryLabel,
  headingLevel: Heading = "h3",
  icon: Icon,
  onView,
}: ResourceItemWithViewerProps) {
  const canPreview = supportsInlinePdfPreview(resource.mimeType)
  const documentDate = getResourceDocumentDate(resource)
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
      <article className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 p-4 transition-colors hover:bg-muted/30 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center sm:px-5 sm:py-3.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {resource.isProtected ? (
            <Lock className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Icon className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Heading className="font-medium leading-relaxed text-foreground [overflow-wrap:anywhere]">
              {resource.title}
            </Heading>
            {resource.isProtected && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                Protected
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
            {(canPreview || documentDate || resource.size) && (
              <p className="text-sm text-muted-foreground">
                {[canPreview ? "PDF" : null, documentDate, resource.size].filter(Boolean).join(" · ")}
              </p>
            )}
            {categoryLabel && (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {categoryLabel}
              </Badge>
            )}
          </div>
          {resource.description && (
            <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {resource.description}
            </p>
          )}
        </div>
        <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-3">
          {canPreview && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 px-3"
              disabled={isBusy}
              onClick={handleViewClick}
              aria-label={`View ${resource.title}`}
            >
              {isViewing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
              View
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-3"
            disabled={isBusy}
            onClick={() => void handleDownload()}
            aria-label={`Download ${resource.title}`}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            Download
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
