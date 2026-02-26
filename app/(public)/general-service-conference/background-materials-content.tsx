"use client"

import * as React from "react"
import { FileText, Download, Eye, Lock, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { compareAlphaNumericWithRoman } from "@/lib/utils/alphanumeric-sort"
import type { BackgroundFile } from "@/lib/hooks/use-gdrive-files"

interface FileSectionProps {
  title: string
  files: BackgroundFile[]
  onView: (file: BackgroundFile) => void
  onDownload: (file: BackgroundFile) => void
}

function FileSection({ title, files, onView, onDownload }: FileSectionProps) {
  if (files.length === 0) return null
  
  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
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
              <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {file.displayName}
              </h4>
              {file.size && (
                <p className="text-xs text-muted-foreground">{file.size}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {supportsInlinePdfPreview(file.mimeType) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden h-8 w-8 sm:inline-flex"
                  onClick={() => onView(file)}
                  aria-label={`View ${file.displayName}`}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onDownload(file)}
                aria-label={`Download ${file.displayName}`}
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

interface BackgroundMaterialsContentProps {
  agendaItems: BackgroundFile[]
  backgroundMaterials: BackgroundFile[]
  miscFiles: BackgroundFile[]
}

export function BackgroundMaterialsContent({
  agendaItems,
  backgroundMaterials,
  miscFiles,
}: BackgroundMaterialsContentProps) {
  const [viewingFile, setViewingFile] = React.useState<BackgroundFile | null>(null)
  const [passwordFile, setPasswordFile] = React.useState<BackgroundFile | null>(null)
  const [pendingAction, setPendingAction] = React.useState<"view" | "download" | null>(null)

  const sortedAgendaItems = React.useMemo(
    () =>
      [...agendaItems].sort((a, b) =>
        compareAlphaNumericWithRoman(
          a.displayName || a.name,
          b.displayName || b.name
        )
      ),
    [agendaItems]
  )

  const sortedBackgroundMaterials = React.useMemo(
    () =>
      [...backgroundMaterials].sort((a, b) =>
        compareAlphaNumericWithRoman(
          a.displayName || a.name,
          b.displayName || b.name
        )
      ),
    [backgroundMaterials]
  )

  const sortedMiscFiles = React.useMemo(
    () =>
      [...miscFiles].sort((a, b) =>
        compareAlphaNumericWithRoman(
          a.displayName || a.name,
          b.displayName || b.name
        )
      ),
    [miscFiles]
  )

  const allFiles = [
    ...sortedAgendaItems,
    ...sortedBackgroundMaterials,
    ...sortedMiscFiles,
  ]
  
  // Find current index for PDF viewer navigation
  const currentIndex = viewingFile ? allFiles.findIndex((f) => f.id === viewingFile.id) : -1
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < allFiles.length - 1 && currentIndex !== -1

  if (allFiles.length === 0) {
    return (
      <div className="text-center py-8">
        <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          No background materials available at this time.
        </p>
      </div>
    )
  }

  const resolveFile = (file: BackgroundFile): BackgroundFile => {
    const cached = getUnlockedUrls(file.id)
    if (cached) {
      return { ...file, previewUrl: cached.previewUrl, downloadUrl: cached.downloadUrl }
    }
    return file
  }

  const handleView = (file: BackgroundFile) => {
    if (!supportsInlinePdfPreview(file.mimeType)) return
    if (file.isProtected && !isFileUnlockedClient(file.id)) {
      setPasswordFile(file)
      setPendingAction("view")
    } else {
      setViewingFile(resolveFile(file))
    }
  }

  const handleDownload = async (file: BackgroundFile) => {
    if (file.isProtected && !isFileUnlockedClient(file.id)) {
      setPasswordFile(file)
      setPendingAction("download")
    } else {
      const resolved = resolveFile(file)
      const result = await downloadFile(resolved.downloadUrl, resolved.displayName)
      if (result.requiresPassword) {
        clearFileUnlocked(file.id)
        setPasswordFile(file)
        setPendingAction("download")
      }
    }
  }

  const handlePasswordSuccess = (result: { previewUrl?: string; downloadUrl?: string; unlockExpiresAt?: number }) => {
    if (!passwordFile) return

    // Store the direct URLs for future use this session
    if (result.previewUrl && result.downloadUrl) {
      markFileUnlocked(passwordFile.id, {
        previewUrl: result.previewUrl,
        downloadUrl: result.downloadUrl,
        unlockExpiresAt: result.unlockExpiresAt,
      })
    }

    const unlockedFile = {
      ...passwordFile,
      previewUrl: result.previewUrl || passwordFile.previewUrl,
      downloadUrl: result.downloadUrl || passwordFile.downloadUrl,
    }

    if (pendingAction === "view") {
      setViewingFile(unlockedFile)
    } else if (pendingAction === "download") {
      void downloadFile(unlockedFile.downloadUrl, unlockedFile.displayName)
    }

    setPasswordFile(null)
    setPendingAction(null)
  }

  return (
    <div className="space-y-8">
      {/* GSC Agenda Items */}
      <FileSection
        title="GSC Agenda Items"
        files={sortedAgendaItems}
        onView={handleView}
        onDownload={handleDownload}
      />
      
      {/* GSC Background Materials */}
      <FileSection
        title="GSC Background Materials"
        files={sortedBackgroundMaterials}
        onView={handleView}
        onDownload={handleDownload}
      />
      
      {/* Additional Materials (misc) */}
      <FileSection
        title="Additional Materials"
        files={sortedMiscFiles}
        onView={handleView}
        onDownload={handleDownload}
      />

      {/* PDF Viewer Modal */}
      {viewingFile && (
        <PDFViewer
          previewUrl={viewingFile.previewUrl}
          title={viewingFile.displayName}
          subtitle={viewingFile.size}
          downloadUrl={viewingFile.downloadUrl}
          onAuthRequired={() => {
            clearFileUnlocked(viewingFile.id)
            setViewingFile(null)
            setPasswordFile(viewingFile)
            setPendingAction("view")
          }}
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
          fileName={passwordFile.displayName}
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
    </div>
  )
}
