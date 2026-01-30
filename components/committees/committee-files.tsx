"use client"

import * as React from "react"
import { FileText, Download, Eye, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PDFViewer } from "@/components/pdf-viewer"
import { FilePasswordDialog } from "@/components/file-password-dialog"
import type { CommitteeFile } from "@/lib/gdrive/committees"
import { verifyFilePassword } from "@/app/admin/(dashboard)/files/actions"

interface CommitteeFilesSectionProps {
  title: string
  files: CommitteeFile[]
}

export function CommitteeFilesSection({ title, files }: CommitteeFilesSectionProps) {
  const [viewingFile, setViewingFile] = React.useState<CommitteeFile | null>(null)
  const [passwordFile, setPasswordFile] = React.useState<CommitteeFile | null>(null)
  const [pendingAction, setPendingAction] = React.useState<"view" | "download" | null>(null)

  if (!files || files.length === 0) {
    return null
  }

  const currentIndex = viewingFile ? files.findIndex((f) => f.id === viewingFile.id) : -1
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < files.length - 1 && currentIndex !== -1

  const handleView = (file: CommitteeFile) => {
    if (file.isProtected) {
      setPasswordFile(file)
      setPendingAction("view")
    } else {
      setViewingFile(file)
    }
  }

  const handleDownload = (file: CommitteeFile) => {
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

  return (
    <div className="mt-6">
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
                onClick={() => handleView(file)}
                aria-label={`View ${file.name}`}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(file)}
                aria-label={`Download ${file.name}`}
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
          previewUrl={viewingFile.isProtected ? `/api/files/preview/${viewingFile.id}` : viewingFile.previewUrl}
          title={viewingFile.name}
          subtitle={viewingFile.size}
          downloadUrl={viewingFile.isProtected ? `/api/files/download/${viewingFile.id}` : viewingFile.downloadUrl}
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
    </div>
  )
}
