"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pencil, Loader2 } from "lucide-react"
import { updateRecordingFolder } from "./actions"
import type { RecordingFolder } from "@/lib/db/schema"

interface EditFolderDialogProps {
  folder: RecordingFolder
}

export function EditFolderDialog({ folder }: EditFolderDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [folderName, setFolderName] = useState(folder.folderName)
  const [password, setPassword] = useState(folder.password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const result = await updateRecordingFolder(folder.id, { folderName, password })
    
    setIsSubmitting(false)
    
    if (result.success) {
      setOpen(false)
    } else {
      setError(result.error || "Failed to update folder")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Recording Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label>Google Drive Folder ID</Label>
            <Input
              value={folder.driveId}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Drive ID cannot be changed after creation
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-folderName">Display Name *</Label>
            <Input
              id="edit-folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-password">Password *</Label>
            <Input
              id="edit-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
