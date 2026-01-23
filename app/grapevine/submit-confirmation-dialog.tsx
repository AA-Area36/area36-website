"use client"

import { useRef, useState, useTransition } from "react"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Loader2, CheckCircle, Shield, ImageIcon } from "lucide-react"
import { districtOptions } from "@/lib/constants/districts"
import { submitDriveConfirmation } from "./actions"

export function SubmitConfirmationDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { executeRecaptcha } = useGoogleReCaptcha()

  const [formData, setFormData] = useState({
    district: "",
    subscriptionCount: "",
    submitterContact: "",
    privacyAcknowledged: false,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
      if (!allowedTypes.includes(file.type)) {
        setError("Please upload a JPG, PNG, or WebP image.")
        return
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("File too large. Maximum size is 10MB.")
        return
      }

      setSelectedFile(file)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.district) {
      setError("Please select a district.")
      return
    }

    if (!formData.subscriptionCount || parseInt(formData.subscriptionCount, 10) < 1) {
      setError("Please enter a valid subscription count.")
      return
    }

    if (!selectedFile) {
      setError("Please upload a confirmation image.")
      return
    }

    if (!formData.privacyAcknowledged) {
      setError("Please acknowledge the privacy notice.")
      return
    }

    const isDev = process.env.NODE_ENV === "development"

    startTransition(async () => {
      try {
        // Skip reCAPTCHA in development, execute in production
        let recaptchaToken = "dev-bypass"
        if (!isDev) {
          if (!executeRecaptcha) {
            setError("reCAPTCHA not loaded. Please refresh and try again.")
            return
          }
          recaptchaToken = await executeRecaptcha("submit_drive_confirmation")
        }

        const submitData = new FormData()
        submitData.append("district", formData.district)
        submitData.append("subscriptionCount", formData.subscriptionCount)
        submitData.append("submitterContact", formData.submitterContact)
        submitData.append("privacyAcknowledged", String(formData.privacyAcknowledged))
        submitData.append("recaptchaToken", recaptchaToken)
        submitData.append("confirmationImage", selectedFile!)

        const result = await submitDriveConfirmation(submitData)
        if (result.success) {
          setSuccess(true)
        } else {
          setError(result.error ?? "An error occurred")
        }
      } catch {
        setError("reCAPTCHA verification failed. Please try again.")
        window.grecaptcha?.reset?.()
        window.grecaptcha?.execute?.(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!, { action: "submit_drive_confirmation" })
      }
    })
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset form when dialog closes
      setFormData({
        district: "",
        subscriptionCount: "",
        submitterContact: "",
        privacyAcknowledged: false,
      })
      setSelectedFile(null)
      setError(null)
      setSuccess(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Upload className="h-4 w-4 mr-2" />
          Submit Confirmation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle>Submission Received!</DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle className="h-6 w-6" />
              </div>
              <p className="mt-4 text-muted-foreground">
                Thank you for participating in the subscription drive! Your submission has been received and is pending review.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Submit Subscription Confirmation</DialogTitle>
              <DialogDescription>
                Upload proof of your Grapevine subscription purchase to participate in the district drive.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="district">District *</Label>
                <Select
                  value={formData.district}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, district: value }))}
                >
                  <SelectTrigger id="district">
                    <SelectValue placeholder="Select your district" />
                  </SelectTrigger>
                  <SelectContent>
                    {districtOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subscriptionCount">Number of Subscriptions *</Label>
                <Input
                  id="subscriptionCount"
                  type="number"
                  min="1"
                  max="1000"
                  placeholder="1"
                  value={formData.subscriptionCount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subscriptionCount: e.target.value }))}
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="submitterContact">Email (optional)</Label>
                <Input
                  id="submitterContact"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.submitterContact}
                  onChange={(e) => setFormData((prev) => ({ ...prev, submitterContact: e.target.value }))}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Only used if we need to contact you about your submission.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Confirmation Image *</Label>
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="space-y-2">
                      <ImageIcon className="h-8 w-8 mx-auto text-primary" />
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">Click to change</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, or WebP (max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <Checkbox
                  id="privacyAcknowledged"
                  checked={formData.privacyAcknowledged}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, privacyAcknowledged: checked === true }))
                  }
                  disabled={isPending}
                />
                <Label htmlFor="privacyAcknowledged" className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                  I understand that uploaded images will be deleted at the end of the campaign to protect anonymity.
                </Label>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>This form is protected by Google reCAPTCHA v3.</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
