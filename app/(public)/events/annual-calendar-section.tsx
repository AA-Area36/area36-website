"use client"

import * as React from "react"
import { Calendar, Download, Eye, Lock } from "lucide-react"
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
import type { CalendarFile } from "./calendar-file-actions"

interface AnnualCalendarSectionProps {
  files: CalendarFile[]
}

export function AnnualCalendarSection({ files }: AnnualCalendarSectionProps) {
  const [viewingFile, setViewingFile] = React.useState<CalendarFile | null>(null)
  const [passwordFile, setPasswordFile] = React.useState<CalendarFile | null>(null)
  const [pendingAction, setPendingAction] = React.useState<"view" | "download" | null>(null)

  // Don't render if no files
  if (!files || files.length === 0) {
    return null
  }

  const currentIndex = viewingFile ? files.findIndex((f) => f.id === viewingFile.id) : -1
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < files.length - 1 && currentIndex !== -1

  const resolveFile = (file: CalendarFile): CalendarFile => {
    const cached = getUnlockedUrls(file.id)
    if (cached) {
      return { ...file, previewUrl: cached.previewUrl, downloadUrl: cached.downloadUrl }
    }
    return file
  }

  const handleView = (file: CalendarFile) => {
    if (file.isProtected && !isFileUnlockedClient(file.id)) {
      setPasswordFile(file)
      setPendingAction("view")
    } else {
      setViewingFile(resolveFile(file))
    }
  }

  const handleDownload = async (file: CalendarFile) => {
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
    <section className="border-t border-border pt-8 mt-8">
      <h3 className="text-lg font-semibold text-foreground mb-4">Annual Calendar</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Download the yearly calendar for upcoming Area 36 events.
      </p>
      
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
                <Calendar className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {file.displayName}
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
                onClick={() => handleView(file)}
                aria-label={`View ${file.displayName}`}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(file)}
                aria-label={`Download ${file.displayName}`}
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
          onPrevious={canGoPrevious ? () => setViewingFile(files[currentIndex - 1]) : undefined}
          onNext={canGoNext ? () => setViewingFile(files[currentIndex + 1]) : undefined}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          currentIndex={currentIndex}
          totalCount={files.length}
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
    </section>
  )
}
