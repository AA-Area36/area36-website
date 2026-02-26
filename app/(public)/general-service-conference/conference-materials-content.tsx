"use client"

import * as React from "react"
import { FileText, Lock, FolderOpen, Download, Eye } from "lucide-react"
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
import type { BackgroundFile } from "@/lib/hooks/use-gdrive-files"

interface ConferenceMaterialsContentProps {
  materials: BackgroundFile[]
}

export function ConferenceMaterialsContent({ materials }: ConferenceMaterialsContentProps) {
  const [viewingFile, setViewingFile] = React.useState<BackgroundFile | null>(null)
  const [passwordFile, setPasswordFile] = React.useState<BackgroundFile | null>(null)
  const [pendingAction, setPendingAction] = React.useState<"view" | "download" | null>(null)

  // Navigation for viewer
  const currentIndex = viewingFile
    ? materials.findIndex((r) => r.id === viewingFile.id)
    : -1
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < materials.length - 1 && currentIndex !== -1

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
              <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {doc.displayName}
              </h3>
              {doc.size && (
                <p className="text-sm text-muted-foreground">{doc.size}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {supportsInlinePdfPreview(doc.mimeType) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:inline-flex"
                  onClick={() => handleView(doc)}
                  aria-label={`View ${doc.displayName}`}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownload(doc)}
                aria-label={`Download ${doc.displayName}`}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
      </div>

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
          onPrevious={canGoPrevious ? () => setViewingFile(materials[currentIndex - 1]) : undefined}
          onNext={canGoNext ? () => setViewingFile(materials[currentIndex + 1]) : undefined}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          currentIndex={currentIndex !== -1 ? currentIndex : undefined}
          totalCount={materials.length}
          icon={
            viewingFile.isProtected ? (
              <Lock className="h-5 w-5" aria-hidden="true" />
            ) : (
              <FileText className="h-5 w-5" aria-hidden="true" />
            )
          }
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
    </>
  )
}
