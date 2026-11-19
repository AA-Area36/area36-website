"use client"

import * as React from "react"
import { Loader2, Lock, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogClose,
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
import { CategoryCombobox } from "@/components/category-combobox"
import { getDocumentCategory } from "@/lib/resources/organization"
import { upsertFileMetadata, deleteFileMetadata, getFileMetadataById } from "./actions"
import type { FileMetadataMutationResult, FileNode } from "./actions"

interface FileMetadataDialogProps {
  file: FileNode | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (result: FileMetadataMutationResult) => void | Promise<void>
  onCloseAutoFocus?: React.ComponentProps<typeof DialogContent>["onCloseAutoFocus"]
}

export function FileMetadataDialog({
  file,
  open,
  onOpenChange,
  onSaved,
  onCloseAutoFocus,
}: FileMetadataDialogProps) {
  if (!file || !open) return null

  return (
    <FileMetadataEditor
      key={file.id}
      file={file}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
      onCloseAutoFocus={onCloseAutoFocus}
    />
  )
}

function FileMetadataEditor({
  file,
  onOpenChange,
  onSaved,
  onCloseAutoFocus,
}: Omit<FileMetadataDialogProps, "file" | "open"> & { file: FileNode }) {
  const formId = React.useId()
  const [popoverContainer, setPopoverContainer] = React.useState<HTMLDivElement | null>(null)
  const [displayName, setDisplayName] = React.useState(() => file.displayName || file.name.replace(/\.[^.]+$/, ""))
  const [password, setPassword] = React.useState("")
  const [hasPassword, setHasPassword] = React.useState(!!file.isProtected)
  const [hasExistingPassword, setHasExistingPassword] = React.useState(!!file.isProtected)
  const [category, setCategory] = React.useState(file.category ?? "")
  const [isPending, startTransition] = React.useTransition()
  const [isDeleting, startDeleteTransition] = React.useTransition()
  const [metadataStatus, setMetadataStatus] = React.useState(file.hasMetadata ? "loading" : "ready")
  const [error, setError] = React.useState<string | null>(null)
  const isBusy = isPending || isDeleting
  const canEdit = metadataStatus === "ready" && !isBusy

  React.useEffect(() => {
    if (!file.hasMetadata) return
    let active = true
    getFileMetadataById(file.id).then((meta) => {
      if (!active) return
      setDisplayName(meta?.displayName ?? file.name.replace(/\.[^.]+$/, ""))
      setHasPassword(meta?.isProtected ?? false)
      setHasExistingPassword(meta?.isProtected ?? false)
      setCategory(meta?.category ?? "")
      setMetadataStatus("ready")
    }).catch(() => {
      if (active) setMetadataStatus("error")
    })
    return () => { active = false }
  }, [file.hasMetadata, file.id, file.name])

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEdit) return

    setError(null)

    if (!displayName.trim()) {
      setError("Display name is required")
      return
    }

    if (hasPassword && !password.trim() && !hasExistingPassword) {
      setError("Password is required when protection is enabled")
      return
    }

    startTransition(async () => {
      try {
        const result = await upsertFileMetadata({
          driveId: file.id,
          parentFolderId: file.parentId,
          displayName: displayName.trim(),
          password: hasPassword ? (password.trim() ? password.trim() : undefined) : null,
          category: category.trim() || null,
        })
        onOpenChange(false)
        await onSaved?.(result)
      } catch {
        setError("Failed to save metadata")
      }
    })
  }

  const handleDelete = () => {
    if (!canEdit || !file.hasMetadata) return

    startDeleteTransition(async () => {
      try {
        const result = await deleteFileMetadata(file.id)
        onOpenChange(false)
        await onSaved?.(result)
      } catch {
        setError("Failed to delete metadata")
      }
    })
  }

  return (
    <Dialog open onOpenChange={(nextOpen) => !isBusy && onOpenChange(nextOpen)}>
      <DialogContent
        ref={setPopoverContainer}
        showCloseButton={!isBusy}
        onCloseAutoFocus={onCloseAutoFocus}
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-md"
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12 text-left">
          <DialogTitle>Edit File Details</DialogTitle>
          <DialogDescription className="break-all">
            {file.name}
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSave} className="min-h-0 overflow-y-auto overscroll-contain px-6 py-4">
          {error && (
            <div role="alert" className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {metadataStatus === "loading" && <p role="status" className="mb-4 text-sm text-muted-foreground">Loading file details…</p>}
          {metadataStatus === "error" && <p role="alert" className="mb-4 text-sm text-destructive">Couldn’t load file details. Close the editor and try again.</p>}

          <fieldset disabled={!canEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name"
              />
              <p className="text-xs text-muted-foreground">
                Shown instead of the filename.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-category">Category</Label>
              <CategoryCombobox
                id="file-category"
                aria-describedby="file-category-help"
                value={category}
                onChange={setCategory}
                popoverContainer={popoverContainer}
              />
              <p id="file-category-help" className="text-xs text-muted-foreground">
                Choose a preset or type a new category to group this file on Documents & Forms.
              </p>
              {!category && (
                <p className="text-xs text-muted-foreground">
                  Automatic category: {getDocumentCategory({ title: displayName || file.name }).label}.
                </p>
              )}
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
                    placeholder={hasExistingPassword ? "Leave blank to keep existing password" : "Enter password"}
                  />
                </div>
              )}
            </div>
          </fieldset>
          <p className="mt-4 text-xs text-muted-foreground">
            After saving, use Bust Cache in File Management to publish file changes.
          </p>
        </form>

        <DialogFooter className="shrink-0 flex-row flex-wrap justify-end border-t px-6 py-4">
          {file.hasMetadata && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={!canEdit}
              className="mr-auto text-destructive hover:text-destructive"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove Metadata
            </Button>
          )}
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isBusy}>Cancel</Button>
          </DialogClose>
          <Button type="submit" form={formId} disabled={!canEdit}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
