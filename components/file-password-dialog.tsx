"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Lock, Loader2 } from "lucide-react"

interface FilePasswordDialogProps {
  fileId: string
  fileName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerify: (fileId: string, password: string) => Promise<{ success: boolean; error?: string }>
  onSuccess: () => void
}

export function FilePasswordDialog({
  fileId,
  fileName,
  open,
  onOpenChange,
  onVerify,
  onSuccess,
}: FilePasswordDialogProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVerifying(true)
    setError(null)

    const result = await onVerify(fileId, password)

    setIsVerifying(false)

    if (result.success) {
      onSuccess()
      onOpenChange(false)
      setPassword("")
    } else {
      setError(result.error || "Incorrect password")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Password Required
          </DialogTitle>
          <DialogDescription>
            Enter the password to access &ldquo;{fileName}&rdquo;
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="file-password">Password</Label>
            <Input
              id="file-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isVerifying}>
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Unlock"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
