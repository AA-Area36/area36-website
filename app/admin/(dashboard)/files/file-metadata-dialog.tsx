"use client"

import * as React from "react"
import { useTransition } from "react"
import { Loader2, Lock, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { upsertFileMetadata, deleteFileMetadata, getFileMetadataById } from "./actions"
import type { FileNode } from "./actions"

interface FileMetadataDialogProps {
  file: FileNode | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FileMetadataDialog({
  file,
  open,
  onOpenChange,
}: FileMetadataDialogProps) {
  const [displayName, setDisplayName] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [hasPassword, setHasPassword] = React.useState(false)
  const [category, setCategory] = React.useState("")
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [error, setError] = React.useState<string | null>(null)

  // Load existing metadata when file changes
  React.useEffect(() => {
    if (file && open) {
      setDisplayName(file.displayName || file.name.replace(/\.[^.]+$/, ""))
      setHasPassword(file.isProtected || false)
      setPassword("")
      setCategory(file.category || "")
      setError(null)

      // Load full metadata including password and category
      if (file.hasMetadata) {
        getFileMetadataById(file.id).then((meta) => {
          if (meta) {
            setDisplayName(meta.displayName)
            setHasPassword(!!meta.password)
            if (meta.password) {
              setPassword(meta.password)
            }
            setCategory(meta.category || "")
          }
        })
      }
    }
  }, [file, open])

  const handleSave = () => {
    if (!file) return

    setError(null)

    if (!displayName.trim()) {
      setError("Display name is required")
      return
    }

    if (hasPassword && !password.trim()) {
      setError("Password is required when protection is enabled")
      return
    }

    startTransition(async () => {
      try {
        await upsertFileMetadata({
          driveId: file.id,
          parentFolderId: file.parentId,
          displayName: displayName.trim(),
          password: hasPassword ? password.trim() : null,
          category: category.trim() || null,
        })
        onOpenChange(false)
      } catch (err) {
        setError("Failed to save metadata")
      }
    })
  }

  const handleDelete = () => {
    if (!file || !file.hasMetadata) return

    startDeleteTransition(async () => {
      try {
        await deleteFileMetadata(file.id)
        onOpenChange(false)
      } catch (err) {
        setError("Failed to delete metadata")
      }
    })
  }

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit File Metadata</DialogTitle>
          <DialogDescription className="break-all">
            {file.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter display name"
            />
            <p className="text-xs text-muted-foreground">
              This name will be shown instead of the filename
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., History Form, Pink Can Plan"
            />
            <p className="text-xs text-muted-foreground">
              Used to group files under a custom header in committees
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="password-toggle" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password Protection
                </Label>
                <p className="text-xs text-muted-foreground">
                  Require a password to view or download
                </p>
              </div>
              <Switch
                id="password-toggle"
                checked={hasPassword}
                onCheckedChange={setHasPassword}
              />
            </div>

            {hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {file.hasMetadata && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={isPending || isDeleting}
              className="text-destructive hover:text-destructive"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove Metadata
            </Button>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending || isDeleting}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending || isDeleting}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
