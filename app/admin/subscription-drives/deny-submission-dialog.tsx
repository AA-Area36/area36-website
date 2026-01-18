"use client"

import { useState, useTransition } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { X, Loader2 } from "lucide-react"
import { denySubmission } from "./actions"

interface DenySubmissionDialogProps {
  submissionId: string
  district: string
}

export function DenySubmissionDialog({ submissionId, district }: DenySubmissionDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleDeny = () => {
    if (!reason.trim()) return

    startTransition(async () => {
      await denySubmission(submissionId, reason.trim())
      setOpen(false)
      setReason("")
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <X className="h-4 w-4 mr-2" />
          Deny
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deny Submission</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to deny this submission from District {district}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-4">
          <div className="space-y-2">
            <Label htmlFor="denial-reason">Reason for denial *</Label>
            <Textarea
              id="denial-reason"
              placeholder="Please provide a reason for denying this submission..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={isPending}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeny}
            disabled={isPending || !reason.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Denying...
              </>
            ) : (
              "Deny Submission"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
