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
import { MultiSelect } from "@/components/multi-select"
import { FlyerUpload, type FlyerFile } from "@/components/flyer-upload"
import { Pencil, Loader2 } from "lucide-react"
import { updateEvent, type UpdateEventData } from "./actions"
import { uploadEventFlyer, deleteEventFlyer } from "@/app/events/flyer-actions"
import { eventTypes, locationTypes, type Event, type LocationType, type EventType, type EventFlyer } from "@/lib/db/schema"
import { TIMEZONES } from "@/lib/timezone"

const locationTypeLabels: Record<LocationType, string> = {
  "in-person": "In Person",
  "hybrid": "Hybrid",
  "online": "Online",
}

const eventTypeColors: Record<string, string> = {
  Regional: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Assembly: "bg-primary/10 text-primary",
  Workshop: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Meeting: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Committee: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  District: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
}

const eventTypeOptions = eventTypes.map((type) => ({
  label: type,
  value: type,
  color: eventTypeColors[type],
}))

// Event with types array and flyers (from junction tables)
interface EventWithTypes extends Event {
  types: EventType[]
  flyers: EventFlyer[]
}

interface EditEventDialogProps {
  event: EventWithTypes
}

export function EditEventDialog({ event }: EditEventDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Form state
  const [title, setTitle] = React.useState(event.title)
  const [date, setDate] = React.useState(event.date)
  const [endDate, setEndDate] = React.useState(event.endDate || "")
  const [startTime, setStartTime] = React.useState(event.startTime || "")
  const [endTime, setEndTime] = React.useState(event.endTime || "")
  const [timezone, setTimezone] = React.useState(event.timezone)
  const [locationType, setLocationType] = React.useState<LocationType>(event.locationType)
  const [address, setAddress] = React.useState(event.address || "")
  const [meetingLink, setMeetingLink] = React.useState(event.meetingLink || "")
  const [description, setDescription] = React.useState(event.description)
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>(event.types)
  // Flyers state - convert EventFlyer[] to FlyerFile[]
  const [flyerFiles, setFlyerFiles] = React.useState<FlyerFile[]>(
    event.flyers.map((f) => ({
      id: f.id,
      fileKey: f.fileKey,
      fileName: f.fileName,
      fileType: f.fileType,
      fileSize: f.fileSize,
    }))
  )
  // TBD flags
  const [timeTBD, setTimeTBD] = React.useState(event.timeTBD || false)
  const [addressTBD, setAddressTBD] = React.useState(event.addressTBD || false)
  const [meetingLinkTBD, setMeetingLinkTBD] = React.useState(event.meetingLinkTBD || false)

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setTitle(event.title)
      setDate(event.date)
      setEndDate(event.endDate || "")
      setStartTime(event.startTime || "")
      setEndTime(event.endTime || "")
      setTimezone(event.timezone)
      setLocationType(event.locationType)
      setAddress(event.address || "")
      setMeetingLink(event.meetingLink || "")
      setDescription(event.description)
      setSelectedTypes(event.types)
      setFlyerFiles(
        event.flyers.map((f) => ({
          id: f.id,
          fileKey: f.fileKey,
          fileName: f.fileName,
          fileType: f.fileType,
          fileSize: f.fileSize,
        }))
      )
      setTimeTBD(event.timeTBD || false)
      setAddressTBD(event.addressTBD || false)
      setMeetingLinkTBD(event.meetingLinkTBD || false)
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
      startTime: startTime || null,
      endTime: endTime || null,
      timezone,
      locationType,
      address: address || null,
      meetingLink: meetingLink || null,
      description,
      types: selectedTypes as EventType[],
      flyerUrl: null, // Deprecated - now using flyer uploads
      timeTBD,
      addressTBD,
      meetingLinkTBD,
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
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-start-time">Start Time {!timeTBD && "*"}</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-timeTBD"
                    checked={timeTBD}
                    onCheckedChange={(checked) => setTimeTBD(checked === true)}
                  />
                  <Label htmlFor="edit-timeTBD" className="text-sm font-normal cursor-pointer">TBD</Label>
                </div>
              </div>
              <Input
                id="edit-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={timeTBD}
                required={!timeTBD}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center h-[24px]">
                <Label htmlFor="edit-end-time">End Time</Label>
              </div>
              <Input
                id="edit-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={timeTBD}
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
            <Label>Event Type(s) *</Label>
            <MultiSelect
              options={eventTypeOptions}
              value={selectedTypes}
              onChange={setSelectedTypes}
              placeholder="Select event type(s)"
            />
            <p className="text-xs text-muted-foreground">
              Select one or more event types
            </p>
          </div>

          {(locationType === "in-person" || locationType === "hybrid") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-address">Address {!addressTBD && "*"}</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-addressTBD"
                    checked={addressTBD}
                    onCheckedChange={(checked) => setAddressTBD(checked === true)}
                  />
                  <Label htmlFor="edit-addressTBD" className="text-sm font-normal cursor-pointer">TBD</Label>
                </div>
              </div>
              <Input
                id="edit-address"
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
                <Label htmlFor="edit-meeting-link">Meeting Link {!meetingLinkTBD && "*"}</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-meetingLinkTBD"
                    checked={meetingLinkTBD}
                    onCheckedChange={(checked) => setMeetingLinkTBD(checked === true)}
                  />
                  <Label htmlFor="edit-meetingLinkTBD" className="text-sm font-normal cursor-pointer">TBD</Label>
                </div>
              </div>
              <Input
                id="edit-meeting-link"
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
                disabled={meetingLinkTBD}
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
            <Label>Event Flyers</Label>
            <FlyerUpload
              value={flyerFiles}
              onChange={setFlyerFiles}
              onUpload={async (file) => {
                const formData = new FormData()
                formData.append("file", file)
                const result = await uploadEventFlyer(event.id, formData)
                if (result.success) {
                  return {
                    success: true,
                    flyer: {
                      id: result.flyer.id,
                      fileKey: result.flyer.fileKey,
                      fileName: result.flyer.fileName,
                      fileType: result.flyer.fileType,
                      fileSize: result.flyer.fileSize,
                    },
                  }
                }
                return { success: false, error: result.error }
              }}
              onDelete={async (flyerId) => {
                const result = await deleteEventFlyer(flyerId)
                return result
              }}
              maxFiles={5}
              disabled={isSubmitting}
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
