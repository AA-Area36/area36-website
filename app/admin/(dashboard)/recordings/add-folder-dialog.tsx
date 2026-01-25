"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"
import { addRecordingFolder } from "./actions"

export function AddFolderDialog() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [driveId, setDriveId] = useState("")
  const [folderName, setFolderName] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const result = await addRecordingFolder({ driveId, folderName, password })
    
    setIsSubmitting(false)
    
    if (result.success) {
      setOpen(false)
      setDriveId("")
      setFolderName("")
      setPassword("")
    } else {
      setError(result.error || "Failed to add folder")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Folder
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Recording Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="driveId">Google Drive Folder ID *</Label>
            <Input
              id="driveId"
              value={driveId}
              onChange={(e) => setDriveId(e.target.value)}
              placeholder="e.g., 1ABC123..."
              required
            />
            <p className="text-xs text-muted-foreground">
              Find this in the Google Drive folder URL
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="folderName">Display Name *</Label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g., Assembly Recordings"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter folder password"
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
                  Adding...
                </>
              ) : (
                "Add Folder"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
