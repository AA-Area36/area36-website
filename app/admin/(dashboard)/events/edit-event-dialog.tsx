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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pencil, Loader2 } from "lucide-react"
import { updateEvent, type UpdateEventData } from "./actions"
import { eventTypes, locationTypes, type Event, type LocationType, type EventType } from "@/lib/db/schema"
import { TIMEZONES } from "@/lib/timezone"

const locationTypeLabels: Record<LocationType, string> = {
  "in-person": "In Person",
  "hybrid": "Hybrid",
  "online": "Online",
}

interface EditEventDialogProps {
  event: Event
}

export function EditEventDialog({ event }: EditEventDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Form state
  const [title, setTitle] = React.useState(event.title)
  const [date, setDate] = React.useState(event.date)
  const [endDate, setEndDate] = React.useState(event.endDate || "")
  const [startTime, setStartTime] = React.useState(event.startTime)
  const [endTime, setEndTime] = React.useState(event.endTime || "")
  const [timezone, setTimezone] = React.useState(event.timezone)
  const [locationType, setLocationType] = React.useState<LocationType>(event.locationType)
  const [address, setAddress] = React.useState(event.address || "")
  const [meetingLink, setMeetingLink] = React.useState(event.meetingLink || "")
  const [description, setDescription] = React.useState(event.description)
  const [eventType, setEventType] = React.useState<EventType>(event.type)
  const [flyerUrl, setFlyerUrl] = React.useState(event.flyerUrl || "")

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setTitle(event.title)
      setDate(event.date)
      setEndDate(event.endDate || "")
      setStartTime(event.startTime)
      setEndTime(event.endTime || "")
      setTimezone(event.timezone)
      setLocationType(event.locationType)
      setAddress(event.address || "")
      setMeetingLink(event.meetingLink || "")
      setDescription(event.description)
      setEventType(event.type)
      setFlyerUrl(event.flyerUrl || "")
      setError(null)
    }
  }, [open, event])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const data: UpdateEventData = {
      title,
      date,
      endDate: endDate || null,
      startTime,
      endTime: endTime || null,
      timezone,
      locationType,
      address: address || null,
      meetingLink: meetingLink || null,
      description,
      type: eventType,
      flyerUrl: flyerUrl || null,
    }

    const result = await updateEvent(event.id, data)

    setIsSubmitting(false)

    if (result.success) {
      setOpen(false)
    } else {
      setError(result.error || "Failed to update event")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            Make changes to the event details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Start Date *</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end-date">End Date</Label>
              <Input
                id="edit-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-start-time">Start Time *</Label>
              <Input
                id="edit-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end-time">End Time</Label>
              <Input
                id="edit-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-timezone">Timezone *</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="edit-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-location-type">Location Type *</Label>
              <Select value={locationType} onValueChange={(v) => setLocationType(v as LocationType)}>
                <SelectTrigger id="edit-location-type">
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
            <div className="space-y-2">
              <Label htmlFor="edit-event-type">Event Type *</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                <SelectTrigger id="edit-event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(locationType === "in-person" || locationType === "hybrid") && (
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address *</Label>
              <Input
                id="edit-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., 123 Main St, City, MN 55555"
              />
            </div>
          )}

          {(locationType === "online" || locationType === "hybrid") && (
            <div className="space-y-2">
              <Label htmlFor="edit-meeting-link">Meeting Link *</Label>
              <Input
                id="edit-meeting-link"
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description *</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-flyer-url">Flyer URL</Label>
            <Input
              id="edit-flyer-url"
              type="url"
              value={flyerUrl}
              onChange={(e) => setFlyerUrl(e.target.value)}
              placeholder="https://..."
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
