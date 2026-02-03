"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { updateRecurringEvent } from "./actions"
import { locationTypes, type Event, type LocationType, type EventException, type EventType } from "@/lib/db/schema"
import { parseLocalDate } from "@/lib/utils/recurrence"

const locationTypeLabels: Record<LocationType, string> = {
  "in-person": "In Person",
  "hybrid": "Hybrid",
  "online": "Online",
}

interface EditOccurrenceDialogProps {
  event: Event
  occurrenceDate: string
  exception?: EventException
  trigger: React.ReactNode
}

export function EditOccurrenceDialog({ event, occurrenceDate, exception, trigger }: EditOccurrenceDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Form state - initialize with exception values or fall back to parent event
  const [title, setTitle] = React.useState(exception?.title || event.title)
  const [startTime, setStartTime] = React.useState(exception?.startTime ?? event.startTime ?? "")
  const [endTime, setEndTime] = React.useState(exception?.endTime ?? event.endTime ?? "")
  const [locationType, setLocationType] = React.useState<LocationType>(
    (exception?.locationType as LocationType) || event.locationType
  )
  const [address, setAddress] = React.useState(exception?.address ?? event.address ?? "")
  const [meetingLink, setMeetingLink] = React.useState(exception?.meetingLink ?? event.meetingLink ?? "")
  const [description, setDescription] = React.useState(exception?.description || event.description)
  // TBD flags
  const [timeTBD, setTimeTBD] = React.useState(exception?.timeTBD ?? event.timeTBD ?? false)
  const [addressTBD, setAddressTBD] = React.useState(exception?.addressTBD ?? event.addressTBD ?? false)
  const [meetingLinkTBD, setMeetingLinkTBD] = React.useState(exception?.meetingLinkTBD ?? event.meetingLinkTBD ?? false)

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setTitle(exception?.title || event.title)
      setStartTime(exception?.startTime ?? event.startTime ?? "")
      setEndTime(exception?.endTime ?? event.endTime ?? "")
      setLocationType((exception?.locationType as LocationType) || event.locationType)
      setAddress(exception?.address ?? event.address ?? "")
      setMeetingLink(exception?.meetingLink ?? event.meetingLink ?? "")
      setDescription(exception?.description || event.description)
      setTimeTBD(exception?.timeTBD ?? event.timeTBD ?? false)
      setAddressTBD(exception?.addressTBD ?? event.addressTBD ?? false)
      setMeetingLinkTBD(exception?.meetingLinkTBD ?? event.meetingLinkTBD ?? false)
      setError(null)
    }
  }, [open, event, exception])

  const formatOccurrenceDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Get event types (use the parent event's type for occurrence edits)
    const types: EventType[] = event.type ? [event.type] : []

    const result = await updateRecurringEvent(event.id, {
      scope: "occurrence",
      occurrenceDate,
      title,
      date: occurrenceDate,
      startTime: startTime || null,
      endTime: endTime || null,
      timezone: event.timezone,
      locationType,
      address: address || null,
      meetingLink: meetingLink || null,
      description,
      types,
      timeTBD,
      addressTBD,
      meetingLinkTBD,
    })

    setIsSubmitting(false)

    if (result.success) {
      setOpen(false)
    } else {
      setError(result.error || "Failed to update occurrence")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Occurrence</DialogTitle>
          <DialogDescription>
            Modify this specific occurrence on {formatOccurrenceDate(occurrenceDate)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="occ-title">Title</Label>
            <Input
              id="occ-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="occ-start-time">Start Time</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="occ-timeTBD"
                    checked={timeTBD}
                    onCheckedChange={(checked) => setTimeTBD(checked === true)}
                  />
                  <Label htmlFor="occ-timeTBD" className="text-sm font-normal cursor-pointer">TBD</Label>
                </div>
              </div>
              <Input
                id="occ-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={timeTBD}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="occ-end-time">End Time</Label>
              <Input
                id="occ-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={timeTBD}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occ-location-type">Location Type</Label>
            <Select value={locationType} onValueChange={(v) => setLocationType(v as LocationType)}>
              <SelectTrigger id="occ-location-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locationTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {locationTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(locationType === "in-person" || locationType === "hybrid") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="occ-address">Address</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="occ-addressTBD"
                    checked={addressTBD}
                    onCheckedChange={(checked) => setAddressTBD(checked === true)}
                  />
                  <Label htmlFor="occ-addressTBD" className="text-sm font-normal cursor-pointer">TBD</Label>
                </div>
              </div>
              <Input
                id="occ-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., 123 Main St, City, MN 55555"
                disabled={addressTBD}
              />
            </div>
          )}

          {(locationType === "online" || locationType === "hybrid") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="occ-meeting-link">Meeting Link</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="occ-meetingLinkTBD"
                    checked={meetingLinkTBD}
                    onCheckedChange={(checked) => setMeetingLinkTBD(checked === true)}
                  />
                  <Label htmlFor="occ-meetingLinkTBD" className="text-sm font-normal cursor-pointer">TBD</Label>
                </div>
              </div>
              <Input
                id="occ-meeting-link"
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
                disabled={meetingLinkTBD}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="occ-description">Description</Label>
            <Textarea
              id="occ-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
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
