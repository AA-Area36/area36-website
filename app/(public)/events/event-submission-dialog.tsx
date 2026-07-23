"use client"

import * as React from "react"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FlyerUpload, type FlyerFile } from "@/components/flyer-upload"
import { MultiSelect } from "@/components/multi-select"
import { RecurrenceOptions } from "@/components/recurrence-options"
import { eventTypes as configuredEventTypes, locationTypes } from "@/lib/db/schema"
import type { EventType, LocationType } from "@/lib/db/schema"
import type { RecurrenceConfig } from "@/lib/types/recurrence"
import { DEFAULT_TIMEZONE, TIMEZONES } from "@/lib/timezone"
import { submitEvent } from "./actions"
import { uploadEventFlyer } from "./flyer-actions"
import { shouldResetEventSubmissionOnOpen, uploadSelectedFlyers } from "./upload-selected-flyers"

const locationTypeLabels: Record<LocationType, string> = {
  "in-person": "In Person",
  hybrid: "Hybrid",
  online: "Online",
}

const eventTypeColors: Record<string, string> = {
  Regional: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Assembly: "bg-primary/10 text-primary",
  Workshop: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Meeting: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Committee: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  District: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  "District Report": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
}

const eventTypeOptions = configuredEventTypes.map((type) => ({
  label: type,
  value: type,
  color: eventTypeColors[type],
}))

export function EventSubmissionDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <ReCaptchaProvider>
      <EventSubmissionDialogContent open={open} onOpenChange={onOpenChange} />
    </ReCaptchaProvider>
  )
}

function EventSubmissionDialogContent({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { executeRecaptcha } = useGoogleReCaptcha()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitMessage, setSubmitMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})
  const [pendingFlyerUpload, setPendingFlyerUpload] = React.useState<{
    eventId: string
    uploadToken?: string
  } | null>(null)
  const [selectedTimezone, setSelectedTimezone] = React.useState(DEFAULT_TIMEZONE)
  const [locationType, setLocationType] = React.useState<LocationType>("in-person")
  // TBD flags
  const [timeTBD, setTimeTBD] = React.useState(false)
  const [addressTBD, setAddressTBD] = React.useState(false)
  const [meetingLinkTBD, setMeetingLinkTBD] = React.useState(false)
  // Selected event types for submission form
  const [submissionEventTypes, setSubmissionEventTypes] = React.useState<string[]>([])
  // Flyer files for submission form
  const [flyerFiles, setFlyerFiles] = React.useState<FlyerFile[]>([])
  // Recurrence config for submission form
  const [recurrenceConfig, setRecurrenceConfig] = React.useState<RecurrenceConfig>({
    isRecurring: false,
    recurrenceType: "none",
  })
  // Track the start date for recurrence options
  const [formStartDate, setFormStartDate] = React.useState("")
  const getFieldErrorProps = (field: string) => ({
    "aria-invalid": fieldErrors[field] ? true : undefined,
    "aria-describedby": fieldErrors[field] ? `${field}-error` : undefined,
  })
  const formRef = React.useRef<HTMLFormElement>(null)
  const submissionIdRef = React.useRef(crypto.randomUUID())

  // Reset form to initial state
  const resetForm = React.useCallback(() => {
    formRef.current?.reset()
    setSubmitMessage(null)
    setFieldErrors({})
    setSelectedTimezone(DEFAULT_TIMEZONE)
    setLocationType("in-person")
    setTimeTBD(false)
    setAddressTBD(false)
    setMeetingLinkTBD(false)
    setSubmissionEventTypes([])
    setFlyerFiles([])
    setPendingFlyerUpload(null)
    setRecurrenceConfig({ isRecurring: false, recurrenceType: "none" })
    setFormStartDate("")
    submissionIdRef.current = crypto.randomUUID()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitMessage(null)
    setFieldErrors({})

    try {
      if (pendingFlyerUpload) {
        const retryResult = await uploadSelectedFlyers(
          pendingFlyerUpload.eventId,
          pendingFlyerUpload.uploadToken,
          flyerFiles,
          uploadEventFlyer
        )
        if (retryResult.failed.length > 0) {
          setFlyerFiles(retryResult.failed)
          setSubmitMessage({
            type: "error",
            text: `The event is submitted, but ${retryResult.failed.length} flyer upload${retryResult.failed.length === 1 ? "" : "s"} still failed: ${retryResult.errors.join("; ")}`,
          })
        } else {
          resetForm()
          setSubmitMessage({ type: "success", text: "Your event and flyers were submitted for review." })
        }
        return
      }

      if (!executeRecaptcha) {
        setSubmitMessage({ type: "error", text: "reCAPTCHA not loaded. Please refresh and try again." })
        setIsSubmitting(false)
        return
      }
      const recaptchaToken = await executeRecaptcha("submit_event")

      const formData = new FormData(formRef.current!)
      const data = {
        title: formData.get("eventTitle") as string,
        date: formData.get("eventDate") as string,
        endDate: formData.get("eventEndDate") as string,
        startTime: formData.get("startTime") as string,
        endTime: formData.get("endTime") as string,
        timezone: selectedTimezone,
        locationType: locationType,
        address: formData.get("eventAddress") as string,
        meetingLink: formData.get("eventMeetingLink") as string,
        types: submissionEventTypes as EventType[],
        description: formData.get("eventDescription") as string,
        submitterEmail: formData.get("submitterEmail") as string,
        submissionId: submissionIdRef.current,
        flyerUrl: "", // Deprecated - now using flyer uploads
        recaptchaToken,
        timeTBD,
        addressTBD,
        meetingLinkTBD,
        // Recurrence fields
        isRecurring: recurrenceConfig.isRecurring,
        recurrenceType: recurrenceConfig.recurrenceType,
        weeklyPattern: recurrenceConfig.weeklyPattern,
        monthlyPattern: recurrenceConfig.monthlyPattern,
        recurUntil: recurrenceConfig.recurUntil,
      }

      const result = await submitEvent(data)

      if (result.success) {
        const uploadResult = await uploadSelectedFlyers(
          result.eventId,
          result.uploadToken,
          flyerFiles,
          uploadEventFlyer
        )
        if (uploadResult.failed.length > 0) {
          setPendingFlyerUpload({ eventId: result.eventId, uploadToken: result.uploadToken })
          setFlyerFiles(uploadResult.failed)
          setSubmitMessage({
            type: "error",
            text: `Your event was submitted, but ${uploadResult.failed.length} flyer upload${uploadResult.failed.length === 1 ? "" : "s"} failed: ${uploadResult.errors.join("; ")}. Use “Retry flyer uploads” below; do not submit the event again.`,
          })
          return
        }

        // Reset form but keep the success message visible
        resetForm()
        setSubmitMessage({ type: "success", text: result.message! })
      } else {
        setSubmitMessage({ type: "error", text: result.error! })
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors)
        }
      }
    } catch (error) {
      console.error("Event submission error:", error)
      setSubmitMessage({ type: "error", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` })
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (shouldResetEventSubmissionOnOpen(nextOpen, pendingFlyerUpload)) {
          resetForm()
        }
        onOpenChange(nextOpen)
      }}
    >
                  <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Submit an Event</DialogTitle>
                      <DialogDescription>
                        Submit an event for review. Events will be published after approval by an Area administrator.
                      </DialogDescription>
                    </DialogHeader>
                    {submitMessage?.type === "success" ? (
                      <div className="py-6 text-center" role="status" aria-live="polite">
                        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                          <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-foreground font-medium mb-2">Event Submitted!</p>
                        <p className="text-sm text-muted-foreground">{submitMessage.text}</p>
                        <Button className="mt-4" onClick={() => onOpenChange(false)}>
                          Close
                        </Button>
                      </div>
                    ) : (
                      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 mt-4">
                        {submitMessage?.type === "error" && (
                          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm" role="alert" aria-live="assertive">
                            {submitMessage.text}
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="eventTitle">Event Title</Label>
                          <Input
                            id="eventTitle"
                            name="eventTitle"
                            placeholder="e.g., District 5 Workshop"
                            required
                            {...getFieldErrorProps("title")}
                          />
                          {fieldErrors.title && (
                            <p id="title-error" className="text-sm text-destructive">{fieldErrors.title}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="eventDate">Start Date</Label>
                            <Input
                              id="eventDate"
                              name="eventDate"
                              type="date"
                              required
                              {...getFieldErrorProps("date")}
                              onChange={(e) => setFormStartDate(e.target.value)}
                            />
                            {fieldErrors.date && (
                              <p id="date-error" className="text-sm text-destructive">{fieldErrors.date}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="eventEndDate">End Date (Optional)</Label>
                            <Input
                              id="eventEndDate"
                              name="eventEndDate"
                              type="date"
                              {...getFieldErrorProps("endDate")}
                            />
                            {fieldErrors.endDate && (
                              <p id="endDate-error" className="text-sm text-destructive">{fieldErrors.endDate}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="startTime">Start Time {!timeTBD && "*"}</Label>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="timeTBD"
                                  checked={timeTBD}
                                  onCheckedChange={(checked) => setTimeTBD(checked === true)}
                                />
                                <Label htmlFor="timeTBD" className="text-sm font-normal cursor-pointer">TBD</Label>
                              </div>
                            </div>
                            <Input
                              type="time"
                              id="startTime"
                              name="startTime"
                              disabled={timeTBD}
                              required={!timeTBD}
                              {...getFieldErrorProps("startTime")}
                            />
                            {fieldErrors.startTime && (
                              <p id="startTime-error" className="text-sm text-destructive">{fieldErrors.startTime}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center h-[24px]">
                              <Label htmlFor="endTime">End Time</Label>
                            </div>
                            <Input
                              type="time"
                              id="endTime"
                              name="endTime"
                              disabled={timeTBD}
                              {...getFieldErrorProps("endTime")}
                            />
                            {fieldErrors.endTime && (
                              <p id="endTime-error" className="text-sm text-destructive">{fieldErrors.endTime}</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="eventTimezone">Timezone *</Label>
                          <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                            <SelectTrigger id="eventTimezone" {...getFieldErrorProps("timezone")}>
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIMEZONES.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldErrors.timezone && (
                            <p id="timezone-error" className="text-sm text-destructive">{fieldErrors.timezone}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="locationType">Location Type *</Label>
                          <Select value={locationType} onValueChange={(value) => setLocationType(value as LocationType)}>
                            <SelectTrigger id="locationType" {...getFieldErrorProps("locationType")}>
                              <SelectValue placeholder="Select location type" />
                            </SelectTrigger>
                            <SelectContent>
                              {locationTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {locationTypeLabels[type]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldErrors.locationType && (
                            <p id="locationType-error" className="text-sm text-destructive">{fieldErrors.locationType}</p>
                          )}
                        </div>
                        {(locationType === "in-person" || locationType === "hybrid") && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="eventAddress">Address {!addressTBD && "*"}</Label>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="addressTBD"
                                  checked={addressTBD}
                                  onCheckedChange={(checked) => setAddressTBD(checked === true)}
                                />
                                <Label htmlFor="addressTBD" className="text-sm font-normal cursor-pointer">TBD</Label>
                              </div>
                            </div>
                            <Input
                              id="eventAddress"
                              name="eventAddress"
                              placeholder="e.g., 123 Main St, City, MN 55555"
                              disabled={addressTBD}
                              {...getFieldErrorProps("address")}
                            />
                            {fieldErrors.address ? (
                              <p id="address-error" className="text-sm text-destructive">{fieldErrors.address}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Full street address including city, state, and zip
                              </p>
                            )}
                          </div>
                        )}
                        {(locationType === "hybrid" || locationType === "online") && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="eventMeetingLink">Meeting Link {!meetingLinkTBD && "*"}</Label>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="meetingLinkTBD"
                                  checked={meetingLinkTBD}
                                  onCheckedChange={(checked) => setMeetingLinkTBD(checked === true)}
                                />
                                <Label htmlFor="meetingLinkTBD" className="text-sm font-normal cursor-pointer">TBD</Label>
                              </div>
                            </div>
                            <Input
                              id="eventMeetingLink"
                              name="eventMeetingLink"
                              type="url"
                              placeholder="https://zoom.us/j/..."
                              disabled={meetingLinkTBD}
                              {...getFieldErrorProps("meetingLink")}
                            />
                            {fieldErrors.meetingLink ? (
                              <p id="meetingLink-error" className="text-sm text-destructive">{fieldErrors.meetingLink}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Zoom, Google Meet, or other video conference link
                              </p>
                            )}
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="eventTypes">Event Type(s) *</Label>
                          <MultiSelect
                            id="eventTypes"
                            options={eventTypeOptions}
                            value={submissionEventTypes}
                            onChange={setSubmissionEventTypes}
                            placeholder="Select event type(s)"
                            {...getFieldErrorProps("types")}
                          />
                          {fieldErrors.types && (
                            <p id="types-error" className="text-sm text-destructive">{fieldErrors.types}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Select one or more event types
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="eventDescription">Description</Label>
                          <Textarea
                            id="eventDescription"
                            name="eventDescription"
                            placeholder="Describe the event..."
                            rows={3}
                            required
                            {...getFieldErrorProps("description")}
                          />
                          {fieldErrors.description && (
                            <p id="description-error" className="text-sm text-destructive">{fieldErrors.description}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Event Flyers (Optional)</Label>
                          <FlyerUpload
                            value={flyerFiles}
                            onChange={setFlyerFiles}
                            maxFiles={5}
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="submitterEmail">Your Email</Label>
                          <Input
                            id="submitterEmail"
                            name="submitterEmail"
                            type="email"
                            placeholder="For follow-up questions"
                            required
                            {...getFieldErrorProps("submitterEmail")}
                          />
                          {fieldErrors.submitterEmail && (
                            <p id="submitterEmail-error" className="text-sm text-destructive">{fieldErrors.submitterEmail}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Recurrence (Optional)</Label>
                          <RecurrenceOptions
                            value={recurrenceConfig}
                            onChange={setRecurrenceConfig}
                            startDate={formStartDate}
                            disabled={isSubmitting}
                            errors={{
                              recurrenceType: fieldErrors.recurrenceType,
                              weeklyPattern: fieldErrors.weeklyPattern,
                              monthlyPattern: fieldErrors.monthlyPattern,
                              recurUntil: fieldErrors.recurUntil,
                            }}
                          />
                        </div>
                        <div className="text-sm text-muted-foreground text-center py-2">
                          This form is protected by Google reCAPTCHA v3.
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting
                              ? pendingFlyerUpload ? "Retrying..." : "Submitting..."
                              : pendingFlyerUpload ? "Retry flyer uploads" : "Submit for Review"}
                          </Button>
                        </div>
                      </form>
                    )}
                  </DialogContent>
    </Dialog>
  )
}
