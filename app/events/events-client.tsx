"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Calendar, MapPin, Clock, ExternalLink, Search, Plus, X, Globe, HelpCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MultiSelect } from "@/components/multi-select"
import { DateRangePicker } from "@/components/date-range-picker"
import { DateRange } from "react-day-picker"
import { submitEvent } from "./actions"
import type { Event, LocationType } from "@/lib/db/schema"
import { locationTypes } from "@/lib/db/schema"
import { formatTimeRange, getUserTimezone, TIMEZONES, DEFAULT_TIMEZONE } from "@/lib/timezone"

const locationTypeLabels: Record<LocationType, string> = {
  "in-person": "In Person",
  "hybrid": "Hybrid",
  "online": "Online",
}

const eventTypes = ["All", "Assembly", "Regional", "Workshop", "Meeting", "Committee", "District"]

const eventTypeColors: Record<string, string> = {
  Regional: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Assembly: "bg-primary/10 text-primary",
  Workshop: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Meeting: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Committee: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  District: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
}

// Parse date string as local date to avoid timezone issues
// "2025-01-15" should be Jan 15, not Jan 14 (which happens when parsed as UTC)
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.substring(0, 10).split("-").map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(dateString: string) {
  const date = parseLocalDate(dateString)
  return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
}

function formatDateRange(start: string, end?: string | null) {
  const startDate = parseLocalDate(start)
  if (!end) {
    return formatDate(start)
  }
  const endDate = parseLocalDate(end)
  const startMonth = startDate.toLocaleDateString("en-US", { month: "long" })
  const endMonth = endDate.toLocaleDateString("en-US", { month: "long" })

  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`
  }
  return `${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
}

// Multi-select options with colors
const eventTypeOptions = eventTypes
  .filter((t) => t !== "All")
  .map((type) => ({
    label: type,
    value: type,
    color: eventTypeColors[type],
  }))

interface EventsClientProps {
  events: Event[]
}

export function EventsClient({ events }: EventsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { executeRecaptcha } = useGoogleReCaptcha()

  // Get initial values from URL
  const initialSearch = searchParams.get("q") || ""
  const initialTypes = searchParams.get("types")?.split(",").filter(Boolean) || []
  const initialDateFrom = searchParams.get("from")
  const initialDateTo = searchParams.get("to")
  const initialDateRange: DateRange | undefined = initialDateFrom
    ? { from: parseLocalDate(initialDateFrom), to: initialDateTo ? parseLocalDate(initialDateTo) : undefined }
    : undefined

  const [searchQuery, setSearchQuery] = React.useState(initialSearch)
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>(initialTypes)
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(initialDateRange)
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  const [submitDialogOpen, setSubmitDialogOpen] = React.useState(false)
  const [instructionsDialogOpen, setInstructionsDialogOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitMessage, setSubmitMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})
  const [userTimezone, setUserTimezone] = React.useState(DEFAULT_TIMEZONE)
  const [selectedTimezone, setSelectedTimezone] = React.useState(DEFAULT_TIMEZONE)
  const [locationType, setLocationType] = React.useState<LocationType>("in-person")
  const tabsRef = React.useRef<HTMLDivElement>(null)
  const formRef = React.useRef<HTMLFormElement>(null)

  // Reset form to initial state
  const resetForm = React.useCallback(() => {
    formRef.current?.reset()
    setSubmitMessage(null)
    setFieldErrors({})
    setSelectedTimezone(DEFAULT_TIMEZONE)
    setLocationType("in-person")
  }, [])

  // Detect user timezone
  React.useEffect(() => {
    setUserTimezone(getUserTimezone())
  }, [])

  // Update URL when filters change
  const updateURL = React.useCallback((search: string, types: string[], range: DateRange | undefined) => {
    const params = new URLSearchParams()
    if (search) params.set("q", search)
    if (types.length > 0) params.set("types", types.join(","))
    if (range?.from) params.set("from", range.from.toISOString().split("T")[0])
    if (range?.to) params.set("to", range.to.toISOString().split("T")[0])

    const queryString = params.toString()
    router.replace(queryString ? `?${queryString}` : "/events", { scroll: false })
  }, [router])

  // Wrapped state setters to update URL
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    updateURL(value, selectedTypes, dateRange)
  }

  const handleTypesChange = (types: string[]) => {
    setSelectedTypes(types)
    updateURL(searchQuery, types, dateRange)
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
    updateURL(searchQuery, selectedTypes, range)
  }

  // Common filter logic for search and date
  const applyCommonFilters = (event: Event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.address?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

    const eventDate = parseLocalDate(event.date)
    const matchesDateRange = !dateRange?.from || (
      eventDate >= dateRange.from &&
      (!dateRange.to || eventDate <= dateRange.to)
    )

    return matchesSearch && matchesDateRange
  }

  // Types selected excluding District (for main list filtering)
  const nonDistrictSelectedTypes = selectedTypes.filter(t => t !== "District")
  const isDistrictSelected = selectedTypes.includes("District")

  // Main list: NEVER shows District events
  const filteredEvents = events.filter((event) => {
    // Always exclude District from main list
    if (event.type === "District") return false

    if (!applyCommonFilters(event)) return false

    // If no types selected, show all non-District events
    // If types selected (excluding District), filter by those types
    const matchesType = nonDistrictSelectedTypes.length === 0 || nonDistrictSelectedTypes.includes(event.type)

    return matchesType
  })

  // District list: ONLY shows District events
  const filteredDistrictEvents = events.filter((event) => {
    // Only include District events
    if (event.type !== "District") return false

    if (!applyCommonFilters(event)) return false

    // If type filters are active but District is not selected, hide district events
    if (selectedTypes.length > 0 && !isDistrictSelected) return false

    return true
  })

  const clearFilters = () => {
    setSelectedTypes([])
    setDateRange(undefined)
    setSearchQuery("")
    updateURL("", [], undefined)
  }

  const hasActiveFilters = selectedTypes.length > 0 || dateRange?.from || searchQuery

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

  // Compute slot assignments for events in the current month view
  // This ensures multi-day events maintain their vertical position
  const eventSlots = React.useMemo(() => {
    const slots: Map<string, number> = new Map() // eventId -> slot number
    const monthStart = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-01`
    const monthEnd = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`
    
    // Get all events that appear in this month
    const monthEvents = events.filter((e) => {
      const eventStart = e.date.substring(0, 10)
      const eventEnd = e.endDate ? e.endDate.substring(0, 10) : eventStart
      // Event overlaps with month if: eventStart <= monthEnd AND eventEnd >= monthStart
      return eventStart <= monthEnd && eventEnd >= monthStart
    })
    
    // Sort by start date, then by end date (longer events first), then by id for consistency
    monthEvents.sort((a, b) => {
      const aStart = a.date.substring(0, 10)
      const bStart = b.date.substring(0, 10)
      if (aStart !== bStart) return aStart.localeCompare(bStart)
      const aEnd = a.endDate?.substring(0, 10) || aStart
      const bEnd = b.endDate?.substring(0, 10) || bStart
      if (aEnd !== bEnd) return bEnd.localeCompare(aEnd) // Longer events first
      return a.id.localeCompare(b.id)
    })
    
    // For each day, track which slots are occupied
    // Process events in order and assign them the first available slot
    const daySlots: Map<string, Set<number>> = new Map() // dateStr -> Set of occupied slots
    
    for (const event of monthEvents) {
      const eventStart = event.date.substring(0, 10)
      const eventEnd = event.endDate ? event.endDate.substring(0, 10) : eventStart
      
      // Find the first slot that's available for ALL days this event spans
      let slot = 0
      let foundSlot = false
      while (!foundSlot) {
        foundSlot = true
        // Check each day the event spans (within the month)
        const checkStart = eventStart < monthStart ? monthStart : eventStart
        const checkEnd = eventEnd > monthEnd ? monthEnd : eventEnd
        
        let currentDate = checkStart
        while (currentDate <= checkEnd) {
          const occupiedSlots = daySlots.get(currentDate) || new Set()
          if (occupiedSlots.has(slot)) {
            foundSlot = false
            slot++
            break
          }
          // Move to next day
          const d = new Date(currentDate + "T00:00:00")
          d.setDate(d.getDate() + 1)
          currentDate = d.toISOString().substring(0, 10)
        }
      }
      
      // Assign this slot to the event
      slots.set(event.id, slot)
      
      // Mark this slot as occupied for all days the event spans (within the month)
      const markStart = eventStart < monthStart ? monthStart : eventStart
      const markEnd = eventEnd > monthEnd ? monthEnd : eventEnd
      let currentDate = markStart
      while (currentDate <= markEnd) {
        if (!daySlots.has(currentDate)) {
          daySlots.set(currentDate, new Set())
        }
        daySlots.get(currentDate)!.add(slot)
        // Move to next day
        const d = new Date(currentDate + "T00:00:00")
        d.setDate(d.getDate() + 1)
        currentDate = d.toISOString().substring(0, 10)
      }
    }
    
    return slots
  }, [events, currentMonth, daysInMonth])

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitMessage(null)
    setFieldErrors({})

    try {
      if (!executeRecaptcha) {
        setSubmitMessage({ type: "error", text: "reCAPTCHA not loaded. Please refresh and try again." })
        setIsSubmitting(false)
        return
      }
      console.log("Executing reCAPTCHA for event...")
      const recaptchaToken = await executeRecaptcha("submit_event")
      console.log("reCAPTCHA token received:", recaptchaToken ? "yes" : "no")

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
        type: formData.get("eventType") as "Assembly" | "Regional" | "Workshop" | "Meeting" | "Committee" | "District",
        description: formData.get("eventDescription") as string,
        submitterEmail: formData.get("submitterEmail") as string,
        flyerUrl: formData.get("eventFlyerUrl") as string,
        recaptchaToken,
      }

      const result = await submitEvent(data)
      console.log("Server result:", result)

      if (result.success) {
        // Reset form but keep the success message visible
        formRef.current?.reset()
        setFieldErrors({})
        setSelectedTimezone(DEFAULT_TIMEZONE)
        setLocationType("in-person")
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
    }

    setIsSubmitting(false)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20"
          aria-labelledby="events-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <h1 id="events-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
                  Events Calendar
                </h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
                  Stay connected with Area 36 assemblies, workshops, and service events throughout southern Minnesota.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {/* Instructions Dialog */}
                <Dialog open={instructionsDialogOpen} onOpenChange={setInstructionsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <HelpCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                      How to Submit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>How to Submit an Event</DialogTitle>
                      <DialogDescription>
                        Follow these steps to get your event listed on the Area 36 calendar.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                            1
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Fill out the submission form</p>
                            <p className="text-sm text-muted-foreground">
                              Click &quot;Submit Event&quot; and provide all the required details about your event.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                            2
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Include key information</p>
                            <p className="text-sm text-muted-foreground">
                              Make sure to include the event title, date, time, location (or meeting link for online events), and a description.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                            3
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Add a flyer (optional)</p>
                            <p className="text-sm text-muted-foreground">
                              If you have a flyer, upload it to Google Drive or another file hosting service and include the link.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                            4
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Wait for approval</p>
                            <p className="text-sm text-muted-foreground">
                              An Area administrator will review your submission. You&apos;ll receive an email if we have any questions.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground">
                          <strong>Tips:</strong> Submit events at least 2 weeks in advance. Include all details upfront to speed up approval.
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={() => {
                          setInstructionsDialogOpen(false)
                          setSubmitDialogOpen(true)
                        }}>
                          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                          Submit an Event
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Submit Event Dialog */}
                <Dialog open={submitDialogOpen} onOpenChange={(open) => {
                  if (open) {
                    // Reset form when opening to clear any previous state
                    resetForm()
                  }
                  setSubmitDialogOpen(open)
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      Submit Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Submit an Event</DialogTitle>
                      <DialogDescription>
                        Submit an event for review. Events will be published after approval by an Area administrator.
                      </DialogDescription>
                    </DialogHeader>
                    {submitMessage?.type === "success" ? (
                      <div className="py-6 text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                          <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-foreground font-medium mb-2">Event Submitted!</p>
                        <p className="text-sm text-muted-foreground">{submitMessage.text}</p>
                        <Button className="mt-4" onClick={() => setSubmitDialogOpen(false)}>
                          Close
                        </Button>
                      </div>
                    ) : (
                      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 mt-4">
                        {submitMessage?.type === "error" && (
                          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
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
                            aria-invalid={!!fieldErrors.title}
                          />
                          {fieldErrors.title && (
                            <p className="text-sm text-destructive">{fieldErrors.title}</p>
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
                              aria-invalid={!!fieldErrors.date}
                            />
                            {fieldErrors.date && (
                              <p className="text-sm text-destructive">{fieldErrors.date}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="eventEndDate">End Date (Optional)</Label>
                            <Input
                              id="eventEndDate"
                              name="eventEndDate"
                              type="date"
                              aria-invalid={!!fieldErrors.endDate}
                            />
                            {fieldErrors.endDate && (
                              <p className="text-sm text-destructive">{fieldErrors.endDate}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="startTime">Start Time *</Label>
                            <Input
                              type="time"
                              id="startTime"
                              name="startTime"
                              required
                              aria-invalid={!!fieldErrors.startTime}
                            />
                            {fieldErrors.startTime && (
                              <p className="text-sm text-destructive">{fieldErrors.startTime}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="endTime">End Time</Label>
                            <Input
                              type="time"
                              id="endTime"
                              name="endTime"
                              aria-invalid={!!fieldErrors.endTime}
                            />
                            {fieldErrors.endTime && (
                              <p className="text-sm text-destructive">{fieldErrors.endTime}</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="eventTimezone">Timezone *</Label>
                          <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                            <SelectTrigger id="eventTimezone" aria-invalid={!!fieldErrors.timezone}>
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
                            <p className="text-sm text-destructive">{fieldErrors.timezone}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="locationType">Location Type *</Label>
                          <Select value={locationType} onValueChange={(value) => setLocationType(value as LocationType)}>
                            <SelectTrigger id="locationType" aria-invalid={!!fieldErrors.locationType}>
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
                            <p className="text-sm text-destructive">{fieldErrors.locationType}</p>
                          )}
                        </div>
                        {(locationType === "in-person" || locationType === "hybrid") && (
                          <div className="space-y-2">
                            <Label htmlFor="eventAddress">Address *</Label>
                            <Input
                              id="eventAddress"
                              name="eventAddress"
                              placeholder="e.g., 123 Main St, City, MN 55555"
                              aria-invalid={!!fieldErrors.address}
                            />
                            {fieldErrors.address ? (
                              <p className="text-sm text-destructive">{fieldErrors.address}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Full street address including city, state, and zip
                              </p>
                            )}
                          </div>
                        )}
                        {(locationType === "hybrid" || locationType === "online") && (
                          <div className="space-y-2">
                            <Label htmlFor="eventMeetingLink">
                              Meeting Link *
                            </Label>
                            <Input
                              id="eventMeetingLink"
                              name="eventMeetingLink"
                              type="url"
                              placeholder="https://zoom.us/j/..."
                              aria-invalid={!!fieldErrors.meetingLink}
                            />
                            {fieldErrors.meetingLink ? (
                              <p className="text-sm text-destructive">{fieldErrors.meetingLink}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Zoom, Google Meet, or other video conference link
                              </p>
                            )}
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="eventType">Event Type</Label>
                          <Select name="eventType" required>
                            <SelectTrigger id="eventType" aria-invalid={!!fieldErrors.type}>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {eventTypes
                                .filter((t) => t !== "All")
                                .map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {fieldErrors.type && (
                            <p className="text-sm text-destructive">{fieldErrors.type}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="eventDescription">Description</Label>
                          <Textarea
                            id="eventDescription"
                            name="eventDescription"
                            placeholder="Describe the event..."
                            rows={3}
                            required
                            aria-invalid={!!fieldErrors.description}
                          />
                          {fieldErrors.description && (
                            <p className="text-sm text-destructive">{fieldErrors.description}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="eventFlyerUrl">Flyer URL (Optional)</Label>
                          <Input
                            id="eventFlyerUrl"
                            name="eventFlyerUrl"
                            type="url"
                            placeholder="https://..."
                            aria-invalid={!!fieldErrors.flyerUrl}
                          />
                          {fieldErrors.flyerUrl ? (
                            <p className="text-sm text-destructive">{fieldErrors.flyerUrl}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Link to an image or PDF flyer for your event
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="submitterEmail">Your Email</Label>
                          <Input
                            id="submitterEmail"
                            name="submitterEmail"
                            type="email"
                            placeholder="For follow-up questions"
                            required
                            aria-invalid={!!fieldErrors.submitterEmail}
                          />
                          {fieldErrors.submitterEmail && (
                            <p className="text-sm text-destructive">{fieldErrors.submitterEmail}</p>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground text-center py-2">
                          This form is protected by Google reCAPTCHA v3.
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button type="button" variant="outline" onClick={() => setSubmitDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Submitting..." : "Submit for Review"}
                          </Button>
                        </div>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>
                <Button asChild variant="outline">
                  <a href="#calendar-subscribe">
                    <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
                    Subscribe
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="border-b border-border bg-muted/30 py-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    type="search"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 h-9"
                    aria-label="Search events"
                  />
                </div>
                <MultiSelect
                  options={eventTypeOptions}
                  value={selectedTypes}
                  onChange={handleTypesChange}
                  placeholder="Event type"
                  className="w-full sm:w-44"
                />
                <DateRangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  placeholder="Date range"
                  className="w-full sm:w-52"
                />
              </div>

              {/* Active filter badges */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  {selectedTypes.map((type) => (
                    <Badge
                      key={type}
                      variant="secondary"
                      className={eventTypeColors[type]}
                    >
                      {type}
                      <button
                        onClick={() => handleTypesChange(selectedTypes.filter((t) => t !== type))}
                        className="ml-1.5 rounded-full hover:bg-foreground/10"
                        aria-label={`Remove ${type} filter`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {dateRange?.from && (
                    <Badge variant="secondary">
                      {dateRange.to
                        ? `${dateRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${dateRange.to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                        : `From ${dateRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                      <button
                        onClick={() => handleDateRangeChange(undefined)}
                        className="ml-1.5 rounded-full hover:bg-foreground/10"
                        aria-label="Remove date filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {searchQuery && (
                    <Badge variant="secondary">
                      &quot;{searchQuery}&quot;
                      <button
                        onClick={() => handleSearchChange("")}
                        className="ml-1.5 rounded-full hover:bg-foreground/10"
                        aria-label="Remove search filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  <button
                    onClick={clearFilters}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Events Content */}
        <section className="py-8 sm:py-12" aria-label="Events" ref={tabsRef}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Calendar - Always Visible */}
            <div className="rounded-xl border border-border bg-card overflow-hidden mb-8">
              {/* Calendar Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <Button variant="ghost" size="sm" onClick={prevMonth} aria-label="Previous month">
                  ← Previous
                </Button>
                <h3 className="text-lg font-semibold text-foreground">
                  {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h3>
                <Button variant="ghost" size="sm" onClick={nextMonth} aria-label="Next month">
                  Next →
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="p-2 text-center text-sm font-medium text-muted-foreground border-b border-border bg-muted/30"
                  >
                    {day}
                  </div>
                ))}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2 min-h-24 border-b border-r border-border bg-muted/10" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  // Filter calendar events based on search and type filters
                  const dayEvents = events.filter((e) => {
                    // Check if this day falls within the event's date range
                    const eventStart = e.date.substring(0, 10)
                    const eventEnd = e.endDate ? e.endDate.substring(0, 10) : eventStart
                    // Date is within range if: startDate <= dateStr <= endDate
                    if (dateStr < eventStart || dateStr > eventEnd) return false
                    // Apply search filter
                    if (searchQuery) {
                      const matchesSearch =
                        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (e.address?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
                      if (!matchesSearch) return false
                    }
                    // Apply type filter
                    if (selectedTypes.length > 0 && !selectedTypes.includes(e.type)) {
                      return false
                    }
                    return true
                  })
                  // Check if this is today by comparing year, month, day directly
                  // This avoids timezone issues from parsing date strings
                  const today = new Date()
                  const isToday =
                    today.getFullYear() === currentMonth.getFullYear() &&
                    today.getMonth() === currentMonth.getMonth() &&
                    today.getDate() === day

                  return (
                    <div
                      key={day}
                      className={`p-2 min-h-24 border-b border-r border-border overflow-visible relative ${isToday ? "bg-primary/5" : ""}`}
                    >
                      <span className={`text-sm font-medium ${isToday ? "text-primary" : "text-foreground"}`}>
                        {day}
                      </span>
                      <div className="mt-1 overflow-visible">
                        {(() => {
                          // Sort events by their assigned slot
                          const sortedEvents = [...dayEvents].sort((a, b) => {
                            const slotA = eventSlots.get(a.id) ?? 0
                            const slotB = eventSlots.get(b.id) ?? 0
                            return slotA - slotB
                          })
                          
                          // Find max slot to render empty spacers
                          const maxSlot = sortedEvents.length > 0 
                            ? Math.max(...sortedEvents.map(e => eventSlots.get(e.id) ?? 0))
                            : -1
                          
                          // Create array of slots with events or null for empty
                          const slotArray: (typeof sortedEvents[0] | null)[] = []
                          for (let s = 0; s <= maxSlot; s++) {
                            const event = sortedEvents.find(e => eventSlots.get(e.id) === s)
                            slotArray.push(event || null)
                          }
                          
                          return slotArray.map((event, slotIndex) => {
                            if (!event) {
                              // Empty spacer to maintain alignment
                              return <div key={`empty-${slotIndex}`} className="h-6" />
                            }
                            
                            const eventStart = event.date.substring(0, 10)
                            const eventEnd = event.endDate ? event.endDate.substring(0, 10) : eventStart
                            const isMultiDay = eventStart !== eventEnd
                            const isStart = dateStr === eventStart
                            const isEnd = dateStr === eventEnd
                            
                            // Determine position styling for multi-day events
                            let positionClasses = "rounded"
                            let marginClasses = ""
                            if (isMultiDay) {
                              if (isStart) {
                                positionClasses = "rounded-l rounded-r-none"
                                marginClasses = "-mr-2"
                              } else if (isEnd) {
                                positionClasses = "rounded-r rounded-l-none"
                                marginClasses = "-ml-2"
                              } else {
                                positionClasses = "rounded-none"
                                marginClasses = "-mx-2"
                              }
                            }
                            
                            return (
                              <div
                                key={event.id}
                                className={`text-xs p-1 truncate relative z-10 h-6 ${eventTypeColors[event.type]} ${positionClasses} ${marginClasses}`}
                                title={event.title}
                              >
                                {isStart || !isMultiDay ? event.title : "\u00A0"}
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Events List */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground">Upcoming Events</h3>
              {filteredEvents.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-border bg-card">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium text-foreground">No events found</h3>
                  <p className="mt-2 text-muted-foreground">Try adjusting your search or filter criteria.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEvents.map((event) => (
                    <article
                      key={event.id}
                      className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Badge variant="secondary" className={eventTypeColors[event.type]}>
                              {event.type}
                            </Badge>
                          </div>
                          <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                            {event.title}
                          </h2>
                          <p className="mt-2 text-muted-foreground">{event.description}</p>
                        </div>

                        <div className="flex flex-col gap-3 lg:text-right lg:min-w-64">
                          <div className="flex items-center gap-2 text-sm text-foreground lg:justify-end">
                            <Calendar className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                            <span className="font-medium">{formatDateRange(event.date, event.endDate)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                            <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                            <span>{formatTimeRange(event.startTime, event.endTime, userTimezone)}</span>
                          </div>
                          {event.address && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground lg:justify-end">
                              <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lg:text-right text-primary hover:underline"
                              >
                                {event.address}
                              </a>
                            </div>
                          )}
                          {(event.locationType === "online" || event.locationType === "hybrid") && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                              <Globe className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                              {event.meetingLink ? (
                                <a
                                  href={event.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {event.locationType === "hybrid" ? "Join Online (Hybrid)" : "Join Online"}
                                </a>
                              ) : (
                                <span>{event.locationType === "hybrid" ? "Hybrid Event" : "Online Event"}</span>
                              )}
                            </div>
                          )}
                          {!event.address && event.locationType === "in-person" && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                              <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                              <span>Location TBD</span>
                            </div>
                          )}
                          {event.flyerUrl && (
                            <div className="flex items-center gap-2 text-sm lg:justify-end">
                              <ExternalLink className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
                              <a
                                href={event.flyerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-medium"
                              >
                                View Flyer
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* District Events */}
            <div className="mt-12 pt-8 border-t border-border">
              <h3 id="district-events-heading" className="text-xl font-semibold text-foreground mb-6">
                District Events
              </h3>

              {filteredDistrictEvents.length === 0 ? (
                <div className="text-center py-8 rounded-xl border border-border bg-card">
                  <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-muted-foreground">
                    {selectedTypes.length > 0 && !isDistrictSelected
                      ? "District events are hidden by current filters."
                      : "No district events match your filters."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDistrictEvents.map((event) => (
                    <article
                      key={event.id}
                      className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Badge variant="secondary" className={eventTypeColors[event.type]}>
                              {event.type}
                            </Badge>
                          </div>
                          <h4 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                            {event.title}
                          </h4>
                          <p className="mt-2 text-muted-foreground">{event.description}</p>
                        </div>

                        <div className="flex flex-col gap-3 lg:text-right lg:min-w-64">
                          <div className="flex items-center gap-2 text-sm text-foreground lg:justify-end">
                            <Calendar className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                            <span className="font-medium">{formatDateRange(event.date, event.endDate)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                            <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                            <span>{formatTimeRange(event.startTime, event.endTime, userTimezone)}</span>
                          </div>
                          {event.address && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground lg:justify-end">
                              <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lg:text-right text-primary hover:underline"
                              >
                                {event.address}
                              </a>
                            </div>
                          )}
                          {(event.locationType === "online" || event.locationType === "hybrid") && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                              <Globe className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                              {event.meetingLink ? (
                                <a
                                  href={event.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {event.locationType === "hybrid" ? "Join Online (Hybrid)" : "Join Online"}
                                </a>
                              ) : (
                                <span>{event.locationType === "hybrid" ? "Hybrid Event" : "Online Event"}</span>
                              )}
                            </div>
                          )}
                          {!event.address && event.locationType === "in-person" && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                              <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                              <span>Location TBD</span>
                            </div>
                          )}
                          {event.flyerUrl && (
                            <div className="flex items-center gap-2 text-sm lg:justify-end">
                              <ExternalLink className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
                              <a
                                href={event.flyerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-medium"
                              >
                                View Flyer
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Calendar Subscription */}
            <div id="calendar-subscribe" className="mt-12 rounded-xl border border-border bg-muted/30 p-6 scroll-mt-24">
              <h3 className="font-semibold text-foreground mb-4">Subscribe to Calendar</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add Area 36 events directly to your calendar application.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline" size="sm">
                  <Link
                    href="https://calendar.google.com/calendar/r?cid=webcal://area36.org/api/calendar"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Calendar
                    <ExternalLink className="ml-2 h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="webcal://area36.org/api/calendar">
                    Apple Calendar
                    <ExternalLink className="ml-2 h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link
                    href="https://outlook.live.com/calendar/0/addfromweb?url=https%3A%2F%2Farea36.org%2Fapi%2Fcalendar&name=Area%2036%20A.A.%20Events"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Outlook
                    <ExternalLink className="ml-2 h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/api/calendar" download="area36-events.ics">
                    Download iCal
                    <ExternalLink className="ml-2 h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
