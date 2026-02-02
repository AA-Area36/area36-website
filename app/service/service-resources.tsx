"use client"

import * as React from "react"
import { FileText, Download, Eye, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PDFViewer } from "@/components/pdf-viewer"
import { FilePasswordDialog } from "@/components/file-password-dialog"
import { verifyFilePassword } from "@/app/admin/(dashboard)/files/actions"
import type { ServiceResource } from "@/lib/gdrive/service-resources"

interface ServiceResourcesProps {
  resources: ServiceResource[]
}

// Define the order of categories
const CATEGORY_ORDER = [
  "General Materials",
  "General Service Representatives (GSRs)",
  "Group Servants",
  "District Committee Member",
  "Area & District Committee Chairs",
  "Area Trusted Servants",
  "Group Inventory",
]

// Group resources by category
function groupResourcesByCategory(resources: ServiceResource[]) {
  const categorized: Record<string, ServiceResource[]> = {}
  const uncategorized: ServiceResource[] = []

  for (const resource of resources) {
    if (resource.category) {
      if (!categorized[resource.category]) {
        categorized[resource.category] = []
      }
      categorized[resource.category].push(resource)
    } else {
      uncategorized.push(resource)
    }
  }

  // Sort categories by predefined order, then alphabetically for any not in the list
  const sortedCategories = Object.keys(categorized).sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a)
    const bIndex = CATEGORY_ORDER.indexOf(b)
    
    // If both are in the predefined order, sort by that order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex
    }
    // If only one is in the predefined order, it comes first
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    // Otherwise, sort alphabetically
    return a.localeCompare(b, undefined, { sensitivity: 'base' })
  })

  return { categorized, uncategorized, sortedCategories }
}

export function ServiceResources({ resources }: ServiceResourcesProps) {
  const [viewingFile, setViewingFile] = React.useState<ServiceResource | null>(null)
  const [passwordFile, setPasswordFile] = React.useState<ServiceResource | null>(null)
  const [pendingAction, setPendingAction] = React.useState<"view" | "download" | null>(null)

  const { categorized, uncategorized, sortedCategories } = groupResourcesByCategory(resources)

  // Get all files in display order for navigation
  const allFiles = React.useMemo(() => {
    const files: ServiceResource[] = []
    for (const category of sortedCategories) {
      files.push(...categorized[category])
    }
    files.push(...uncategorized)
    return files
  }, [categorized, uncategorized, sortedCategories])

  const currentIndex = viewingFile ? allFiles.findIndex((f) => f.id === viewingFile.id) : -1
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < allFiles.length - 1 && currentIndex !== -1

  const handleView = (file: ServiceResource) => {
    if (file.isProtected) {
      setPasswordFile(file)
      setPendingAction("view")
    } else {
      setViewingFile(file)
    }
  }

  const handleDownload = (file: ServiceResource) => {
    if (file.isProtected) {
      setPasswordFile(file)
      setPendingAction("download")
    } else {
      window.open(file.downloadUrl, "_blank")
    }
  }

  const handlePasswordSuccess = () => {
    if (!passwordFile) return

    if (pendingAction === "view") {
      setViewingFile(passwordFile)
    } else if (pendingAction === "download") {
      window.open(`/api/files/download/${passwordFile.id}`, "_blank")
    }

    setPasswordFile(null)
    setPendingAction(null)
  }

  if (resources.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No resources available at this time.
      </p>
    )
  }

  return (
    <>
      {/* Categorized resources */}
      {sortedCategories.map((category) => (
        <ResourceSection
          key={category}
          title={category}
          files={categorized[category]}
          onView={handleView}
          onDownload={handleDownload}
        />
      ))}

      {/* Uncategorized resources */}
      {uncategorized.length > 0 && (
        <ResourceSection
          title="Other Resources"
          files={uncategorized}
          onView={handleView}
          onDownload={handleDownload}
        />
      )}

      {/* PDF Viewer Modal */}
      {viewingFile && (
        <PDFViewer
          previewUrl={viewingFile.isProtected ? `/api/files/preview/${viewingFile.id}` : viewingFile.previewUrl}
          title={viewingFile.name}
          subtitle={viewingFile.size}
          downloadUrl={viewingFile.isProtected ? `/api/files/download/${viewingFile.id}` : viewingFile.downloadUrl}
          onClose={() => setViewingFile(null)}
          onPrevious={canGoPrevious ? () => setViewingFile(allFiles[currentIndex - 1]) : undefined}
          onNext={canGoNext ? () => setViewingFile(allFiles[currentIndex + 1]) : undefined}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          currentIndex={currentIndex}
          totalCount={allFiles.length}
          icon={viewingFile.isProtected ? <Lock className="h-5 w-5" /> : undefined}
        />
      )}

      {/* Password Dialog */}
      {passwordFile && (
        <FilePasswordDialog
          fileId={passwordFile.id}
          fileName={passwordFile.name}
          open={!!passwordFile}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setPasswordFile(null)
              setPendingAction(null)
            }
          }}
          onVerify={verifyFilePassword}
          onSuccess={handlePasswordSuccess}
        />
      )}
    </>
  )
}

interface ResourceSectionProps {
  title: string
  files: ServiceResource[]
  onView: (file: ServiceResource) => void
  onDownload: (file: ServiceResource) => void
}

function ResourceSection({ title, files, onView, onDownload }: ResourceSectionProps) {
  if (!files || files.length === 0) {
    return null
  }

  return (
    <div className="mt-6 first:mt-0">
      <h4 className="text-sm font-semibold text-foreground mb-3">{title}</h4>
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {file.isProtected ? (
                <Lock className="h-5 w-5" aria-hidden="true" />
              ) : (
                <FileText className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {file.name}
              </h5>
              {file.size && (
                <p className="text-xs text-muted-foreground">{file.size}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onView(file)}
                aria-label={`View ${file.name}`}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onDownload(file)}
                aria-label={`Download ${file.name}`}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
