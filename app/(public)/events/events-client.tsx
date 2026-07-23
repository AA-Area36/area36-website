"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { Calendar, CalendarPlus, MapPin, Clock, ExternalLink, Search, Plus, X, Globe, HelpCircle, Repeat, ChevronDown, Check, Video } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { MultiSelect } from "@/components/multi-select"
import { DateRangePicker } from "@/components/date-range-picker"
import { FlyerUpload, type FlyerFile } from "@/components/flyer-upload"
import { RecurrenceOptions } from "@/components/recurrence-options"
import { DateRange } from "react-day-picker"
import type { RecurrenceConfig } from "@/lib/types/recurrence"
import { submitEvent } from "./actions"
import { shouldResetEventSubmissionOnOpen, uploadSelectedFlyers } from "./upload-selected-flyers"
import { uploadEventFlyer } from "./flyer-actions"
import { AnnualCalendarSection } from "./annual-calendar-section"
import type { CalendarFile } from "./calendar-file-actions"
import type { Event, LocationType, EventType, EventFlyer } from "@/lib/db/schema"
import type { DisplayEvent } from "@/lib/types/recurrence"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { getCalendarCellLabel } from "./calendar-a11y"

// Event with types array and flyers (from junction tables)
export interface EventWithTypes extends Event {
  types: EventType[]
  flyers: EventFlyer[]
}
import { eventTypes as configuredEventTypes, locationTypes } from "@/lib/db/schema"
import { formatTimeRange, TIMEZONES, DEFAULT_TIMEZONE } from "@/lib/timezone"

const locationTypeLabels: Record<LocationType, string> = {
  "in-person": "In Person",
  "hybrid": "Hybrid",
  "online": "Online",
}

const eventTypes = ["All", ...configuredEventTypes]

const eventTypeColors: Record<string, string> = {
  Regional: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Assembly: "bg-primary/10 text-primary",
  Workshop: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Meeting: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Committee: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  District: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  "District Report": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
}

const locationTypeBadgeClasses: Record<LocationType, string> = {
  // Outline-style, distinct from the "type" color badges and with enough contrast on white.
  "in-person": "border-amber-300/80 bg-amber-50/60 text-amber-950 dark:border-amber-300/30 dark:bg-amber-950/20 dark:text-amber-100",
  "hybrid": "border-teal-300/80 bg-teal-50/60 text-teal-950 dark:border-teal-300/30 dark:bg-teal-950/20 dark:text-teal-100",
  "online": "border-sky-300/80 bg-sky-50/60 text-sky-950 dark:border-sky-300/30 dark:bg-sky-950/20 dark:text-sky-100",
}

function LocationTypeTag({ locationType }: { locationType: LocationType }) {
  const Icon = locationType === "in-person" ? MapPin : locationType === "online" ? Video : Globe
  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1.5 ${locationTypeBadgeClasses[locationType]}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {locationTypeLabels[locationType]}
    </Badge>
  )
}

const SECTION_PAGE_SIZE = 5

function buildMapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function getPrimaryEventHref(
  event: Pick<DisplayEvent, "locationType" | "meetingLink" | "address">
): string | null {
  // Online wins for Hybrid, per requirement.
  if ((event.locationType === "online" || event.locationType === "hybrid") && event.meetingLink) {
    return event.meetingLink
  }
  if ((event.locationType === "in-person" || event.locationType === "hybrid") && event.address) {
    return buildMapsHref(event.address)
  }
  return null
}

function isFromInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  // Avoid hijacking clicks on links, buttons, form controls, etc.
  // Important: do not include `[role="link"]` here; the card container itself uses it.
  return !!target.closest('a,button,input,textarea,select,summary,label,[role="button"],[data-no-card-link]')
}

function getEventCardLinkProps(href: string | null) {
  if (!href) return {}

  return {
    role: "link" as const,
    tabIndex: 0,
    onClick: (e: React.MouseEvent) => {
      if (isFromInteractiveElement(e.target)) return
      window.open(href, "_blank", "noopener,noreferrer")
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return
      if (isFromInteractiveElement(e.target)) return
      e.preventDefault()
      window.open(href, "_blank", "noopener,noreferrer")
    },
  }
}

// Generate Google Calendar URL for individual events
function generateGoogleCalendarUrl(event: DisplayEvent): string {
  // Format dates for Google Calendar: YYYYMMDDTHHMMSS
  const formatDateTime = (date: string, time: string | null) => {
    const datePart = date.replace(/-/g, '')
    if (!time) return datePart
    const timePart = time.replace(':', '') + '00'
    return `${datePart}T${timePart}`
  }

  const startDateTime = formatDateTime(event.date, event.startTime)
  const endDate = event.endDate || event.date
  const endDateTime = event.endTime 
    ? formatDateTime(endDate, event.endTime)
    : formatDateTime(endDate, event.startTime) // If no end time, use start time

  // Build location string
  let location = ''
  if (event.address) {
    location = event.address
  } else if (event.meetingLink) {
    location = event.meetingLink
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startDateTime}/${endDateTime}`,
    details: event.description,
    location: location,
    ctz: event.timezone,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
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

// Type for grouped events (recurring series or single event)
interface EventGroup {
  type: "single" | "recurring"
  // For single events
  event?: DisplayEvent
  // For recurring events
  parentEventId?: string
  occurrences?: DisplayEvent[]
  recurrenceDescription?: string
}

// Group events: recurring events grouped by parentEventId, single events standalone
function groupEvents(events: DisplayEvent[]): EventGroup[] {
  const groups: EventGroup[] = []
  const recurringGroups = new Map<string, DisplayEvent[]>()

  for (const event of events) {
    if (event.isRecurringInstance && event.parentEventId) {
      // Add to recurring group
      const existing = recurringGroups.get(event.parentEventId) || []
      existing.push(event)
      recurringGroups.set(event.parentEventId, existing)
    } else if (event.isRecurring && !event.isRecurringInstance) {
      // This is a parent recurring event without occurrences in range - skip
      // (occurrences should be generated as instances)
    } else {
      // Single non-recurring event
      groups.push({ type: "single", event })
    }
  }

  // Add recurring groups
  for (const [parentEventId, occurrences] of recurringGroups) {
    // Sort occurrences by date
    occurrences.sort((a, b) => a.date.localeCompare(b.date))
    groups.push({
      type: "recurring",
      parentEventId,
      occurrences,
      recurrenceDescription: occurrences[0]?.recurrenceDescription,
    })
  }

  // Sort groups by the first/only event date
  groups.sort((a, b) => {
    const dateA = a.type === "single" ? a.event!.date : a.occurrences![0].date
    const dateB = b.type === "single" ? b.event!.date : b.occurrences![0].date
    return dateA.localeCompare(dateB)
  })

  return groups
}

// Same grouping logic as groupEvents, but sorted for "most recent first" UIs (past events).
function groupEventsDescending(events: DisplayEvent[]): EventGroup[] {
  const groups: EventGroup[] = []
  const recurringGroups = new Map<string, DisplayEvent[]>()

  for (const event of events) {
    if (event.isRecurringInstance && event.parentEventId) {
      const existing = recurringGroups.get(event.parentEventId) || []
      existing.push(event)
      recurringGroups.set(event.parentEventId, existing)
    } else if (event.isRecurring && !event.isRecurringInstance) {
      // Parent recurring event row (shouldn't normally be present in DisplayEvent lists).
    } else {
      groups.push({ type: "single", event })
    }
  }

  for (const [parentEventId, occurrences] of recurringGroups) {
    // Sort occurrences by date DESC so the first card shows the most recent occurrence.
    occurrences.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date)
      if (dateCompare !== 0) return dateCompare
      if (!a.startTime && !b.startTime) return 0
      if (!a.startTime) return 1
      if (!b.startTime) return -1
      return b.startTime.localeCompare(a.startTime)
    })

    groups.push({
      type: "recurring",
      parentEventId,
      occurrences,
      recurrenceDescription: occurrences[0]?.recurrenceDescription,
    })
  }

  groups.sort((a, b) => {
    const aFirst = a.type === "single" ? a.event! : a.occurrences![0]
    const bFirst = b.type === "single" ? b.event! : b.occurrences![0]
    const dateCompare = bFirst.date.localeCompare(aFirst.date)
    if (dateCompare !== 0) return dateCompare
    if (!aFirst.startTime && !bFirst.startTime) return 0
    if (!aFirst.startTime) return 1
    if (!bFirst.startTime) return -1
    return bFirst.startTime.localeCompare(aFirst.startTime)
  })

  return groups
}

function SectionPagination({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  page: number
  totalPages: number
  onPageChange: (next: number) => void
  className?: string
}) {
  if (totalPages <= 1) return null
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 pt-2 ${className ?? ""}`}>
      <div className="text-sm text-muted-foreground">
        Page <span className="font-medium text-foreground">{page}</span> of{" "}
        <span className="font-medium text-foreground">{totalPages}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

interface EventsClientProps {
  events: DisplayEvent[]
  calendarFiles: CalendarFile[]
  hero: {
    title: string
    description: string
  }
}

export function EventsClient({ events, calendarFiles, hero }: EventsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { executeRecaptcha } = useGoogleReCaptcha()

  // Get initial values from URL
  const initialSearch = searchParams.get("q") || ""
  const initialTypes = searchParams.get("types")?.split(",").filter(Boolean) || []
  const initialDateFrom = searchParams.get("from")
  const initialDateTo = searchParams.get("to")
  const initialShowDistrictMeetings = searchParams.get("districtMeetings") !== "0"
  const initialDateRange: DateRange | undefined = initialDateFrom
    ? { from: parseLocalDate(initialDateFrom), to: initialDateTo ? parseLocalDate(initialDateTo) : undefined }
    : undefined

  const [searchQuery, setSearchQuery] = React.useState(initialSearch)
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>(initialTypes)
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(initialDateRange)
  const [showDistrictMeetings, setShowDistrictMeetings] = React.useState(initialShowDistrictMeetings)
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  const [submitDialogOpen, setSubmitDialogOpen] = React.useState(false)
  const [instructionsDialogOpen, setInstructionsDialogOpen] = React.useState(false)
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
  // Track which recurring event groups are expanded
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set())
  const [expandedPastGroups, setExpandedPastGroups] = React.useState<Set<string>>(new Set())

  // Pagination (10 per section)
  const [upcomingPage, setUpcomingPage] = React.useState(1)
  const [districtPage, setDistrictPage] = React.useState(1)
  const [districtMeetingsPage, setDistrictMeetingsPage] = React.useState(1)

  // Past events (collapsible + API pagination)
  const [pastOpen, setPastOpen] = React.useState(false)
  const [pastSearchQuery, setPastSearchQuery] = React.useState("")
  const [pastSelectedTypes, setPastSelectedTypes] = React.useState<string[]>([])
  const [pastDateRange, setPastDateRange] = React.useState<DateRange | undefined>(undefined)
  const [pastPages, setPastPages] = React.useState<Array<{ events: DisplayEvent[]; nextCursor: string | null }>>([])
  const [pastPageIndex, setPastPageIndex] = React.useState(0)
  const [pastLoading, setPastLoading] = React.useState(false)
  const [pastError, setPastError] = React.useState<string | null>(null)
  const [pastAppliedQueryKey, setPastAppliedQueryKey] = React.useState<string>("")
  const tabsRef = React.useRef<HTMLDivElement>(null)
  const formRef = React.useRef<HTMLFormElement>(null)

  const debouncedUrlSearchQuery = useDebouncedValue(searchQuery, 500)
  const debouncedPastSearchQuery = useDebouncedValue(pastSearchQuery, 500)

  // Toggle expansion of a recurring event group
  const toggleGroupExpansion = (parentEventId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(parentEventId)) {
        next.delete(parentEventId)
      } else {
        next.add(parentEventId)
      }
      return next
    })
  }

  const togglePastGroupExpansion = (parentEventId: string) => {
    setExpandedPastGroups(prev => {
      const next = new Set(prev)
      if (next.has(parentEventId)) {
        next.delete(parentEventId)
      } else {
        next.add(parentEventId)
      }
      return next
    })
  }

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
  }, [])

  // Update URL when filters change
  const updateURL = React.useCallback((
    search: string,
    types: string[],
    range: DateRange | undefined,
    districtMeetings: boolean
  ) => {
    const params = new URLSearchParams()
    if (search) params.set("q", search)
    if (types.length > 0) params.set("types", types.join(","))
    if (range?.from) params.set("from", range.from.toISOString().split("T")[0])
    if (range?.to) params.set("to", range.to.toISOString().split("T")[0])
    if (!districtMeetings) params.set("districtMeetings", "0")

    const queryString = params.toString()
    router.replace(queryString ? `?${queryString}` : "/events", { scroll: false })
  }, [router])

  // Wrapped state setters to update URL
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleTypesChange = (types: string[]) => {
    setSelectedTypes(types)
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
  }

  const handleDistrictMeetingsChange = (next: boolean) => {
    setShowDistrictMeetings(next)
  }

  // Debounce URL updates for the search query to avoid spamming router.replace while typing.
  React.useEffect(() => {
    updateURL(debouncedUrlSearchQuery, selectedTypes, dateRange, showDistrictMeetings)
  }, [
    debouncedUrlSearchQuery,
    selectedTypes.join(","),
    dateRange?.from?.getTime(),
    dateRange?.to?.getTime(),
    showDistrictMeetings,
    updateURL,
  ])

  // Common filter logic for search and date
  const applyCommonFilters = (event: DisplayEvent) => {
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

  const [districtMeetingEvents, setDistrictMeetingEvents] = React.useState<DisplayEvent[]>([])
  const [districtMeetingLoadError, setDistrictMeetingLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" })
    const rangeStart = parseLocalDate(todayStr)
    rangeStart.setDate(rangeStart.getDate() - 1)
    const rangeEnd = parseLocalDate(todayStr)
    rangeEnd.setFullYear(rangeEnd.getFullYear() + 1)

    const start = rangeStart.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })
    const end = rangeEnd.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })

    const load = async () => {
      try {
        const res = await fetch(`/api/district-meetings?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
        if (!res.ok) throw new Error(`District meetings API error: ${res.status}`)
        const data = (await res.json()) as DisplayEvent[]
        if (!active) return
        setDistrictMeetingEvents(Array.isArray(data) ? data : [])
        setDistrictMeetingLoadError(null)
      } catch (e) {
        if (!active) return
        setDistrictMeetingEvents([])
        setDistrictMeetingLoadError(e instanceof Error ? e.message : "Failed to load district meetings")
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const filteredDistrictMeetingEvents = districtMeetingEvents.filter(applyCommonFilters)

  // Types selected excluding District (for main list filtering)
  const nonDistrictSelectedTypes = selectedTypes.filter(t => t !== "District")
  const isDistrictSelected = selectedTypes.includes("District")

  // Helper to check if an event has any of the specified types
  const eventHasType = (event: DisplayEvent, types: string[]) => {
    return event.types.some(t => types.includes(t))
  }

  // Main list: NEVER shows District events (District events are in a separate section)
  const filteredEvents = events.filter((event) => {
    // Exclude any event that has District as one of its types
    // District events are intentionally separate from Area events
    if (event.types.includes("District")) return false

    if (!applyCommonFilters(event)) return false

    // If no types selected, show all non-District events
    // If types selected (excluding District), filter by events that have at least one matching type
    const matchesType = nonDistrictSelectedTypes.length === 0 || eventHasType(event, nonDistrictSelectedTypes)

    return matchesType
  })

  // District list: ONLY shows events that include District type
  const filteredDistrictEvents = events.filter((event) => {
    // Only include events with District type
    if (!event.types.includes("District")) return false

    if (!applyCommonFilters(event)) return false

    // If type filters are active but District is not selected, hide district events
    if (selectedTypes.length > 0 && !isDistrictSelected) return false

    return true
  })

  const upcomingGroups = React.useMemo(() => groupEvents(filteredEvents), [filteredEvents])
  const districtGroups = React.useMemo(() => groupEvents(filteredDistrictEvents), [filteredDistrictEvents])
  const districtMeetingGroups = React.useMemo(() => groupEvents(filteredDistrictMeetingEvents), [filteredDistrictMeetingEvents])

  const upcomingTotalPages = Math.max(1, Math.ceil(upcomingGroups.length / SECTION_PAGE_SIZE))
  const districtTotalPages = Math.max(1, Math.ceil(districtGroups.length / SECTION_PAGE_SIZE))
  const districtMeetingsTotalPages = Math.max(1, Math.ceil(districtMeetingGroups.length / SECTION_PAGE_SIZE))

  React.useEffect(() => {
    setUpcomingPage((p) => Math.min(Math.max(1, p), upcomingTotalPages))
  }, [upcomingTotalPages])

  React.useEffect(() => {
    setDistrictPage((p) => Math.min(Math.max(1, p), districtTotalPages))
  }, [districtTotalPages])

  React.useEffect(() => {
    setDistrictMeetingsPage((p) => Math.min(Math.max(1, p), districtMeetingsTotalPages))
  }, [districtMeetingsTotalPages])

  // When filters change, reset pagination back to the first page.
  React.useEffect(() => {
    setUpcomingPage(1)
    setDistrictPage(1)
    setDistrictMeetingsPage(1)
  }, [
    debouncedUrlSearchQuery,
    selectedTypes.join(","),
    dateRange?.from?.getTime(),
    dateRange?.to?.getTime(),
  ])

  const pagedUpcomingGroups = upcomingGroups.slice((upcomingPage - 1) * SECTION_PAGE_SIZE, upcomingPage * SECTION_PAGE_SIZE)
  const pagedDistrictGroups = districtGroups.slice((districtPage - 1) * SECTION_PAGE_SIZE, districtPage * SECTION_PAGE_SIZE)
  const pagedDistrictMeetingGroups = districtMeetingGroups.slice(
    (districtMeetingsPage - 1) * SECTION_PAGE_SIZE,
    districtMeetingsPage * SECTION_PAGE_SIZE
  )

  const clearFilters = () => {
    setSelectedTypes([])
    setDateRange(undefined)
    setSearchQuery("")
    setShowDistrictMeetings(true)
    updateURL("", [], undefined, true)
  }

  const hasActiveFilters = selectedTypes.length > 0 || dateRange?.from || searchQuery || !showDistrictMeetings

  const requestPastEventsPage = React.useCallback(async (cursor: string | null, opts: {
    q: string
    types: string[]
    range: DateRange | undefined
  }) => {
    const params = new URLSearchParams()
    params.set("limit", String(SECTION_PAGE_SIZE))
    if (cursor) params.set("cursor", cursor)
    if (opts.q.trim()) params.set("q", opts.q.trim())
    if (opts.types.length > 0) params.set("types", opts.types.join(","))
    if (opts.range?.from) params.set("from", opts.range.from.toISOString().split("T")[0])
    if (opts.range?.to) params.set("to", opts.range.to.toISOString().split("T")[0])

    const response = await fetch(`/api/events/past?${params.toString()}`)
    if (!response.ok) {
      throw new Error(`Past events API error: ${response.status}`)
    }
    return (await response.json()) as { events: DisplayEvent[]; nextCursor: string | null }
  }, [])

  const pastQueryKey = React.useMemo(() => {
    const from = pastDateRange?.from ? pastDateRange.from.toISOString().split("T")[0] : ""
    const to = pastDateRange?.to ? pastDateRange.to.toISOString().split("T")[0] : ""
    return JSON.stringify({
      q: debouncedPastSearchQuery.trim(),
      types: [...pastSelectedTypes].sort(),
      from,
      to,
    })
  }, [
    debouncedPastSearchQuery,
    pastSelectedTypes.join(","),
    pastDateRange?.from?.getTime(),
    pastDateRange?.to?.getTime(),
  ])

  React.useEffect(() => {
    if (!pastOpen) return
    if (pastAppliedQueryKey === pastQueryKey && pastPages.length > 0) return

    let active = true
    setPastLoading(true)
    setPastError(null)

    void (async () => {
      try {
        const data = await requestPastEventsPage(null, {
          q: debouncedPastSearchQuery,
          types: pastSelectedTypes,
          range: pastDateRange,
        })
        if (!active) return
        setPastPages([data])
        setPastPageIndex(0)
        setPastAppliedQueryKey(pastQueryKey)
      } catch (err) {
        if (!active) return
        const message = err instanceof Error ? err.message : "Failed to load past events"
        setPastError(message)
      } finally {
        if (!active) return
        setPastLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [
    pastOpen,
    pastQueryKey,
    pastAppliedQueryKey,
    pastPages.length,
    requestPastEventsPage,
    debouncedPastSearchQuery,
    pastSelectedTypes.join(","),
    pastDateRange?.from?.getTime(),
    pastDateRange?.to?.getTime(),
  ])

  const currentPastPage = pastPages[pastPageIndex] || null

  const goToNextPastPage = async () => {
    if (!currentPastPage?.nextCursor) return
    const nextIndex = pastPageIndex + 1
    if (pastPages[nextIndex]) {
      setPastPageIndex(nextIndex)
      return
    }
    setPastLoading(true)
    setPastError(null)
    try {
      const data = await requestPastEventsPage(currentPastPage.nextCursor, {
        q: debouncedPastSearchQuery,
        types: pastSelectedTypes,
        range: pastDateRange,
      })
      setPastPages((prev) => [...prev, data])
      setPastPageIndex(nextIndex)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load past events"
      setPastError(message)
    } finally {
      setPastLoading(false)
    }
  }

  const goToPrevPastPage = () => {
    setPastPageIndex((p) => Math.max(0, p - 1))
  }

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

  const calendarEvents = React.useMemo(() => {
    return showDistrictMeetings ? [...events, ...districtMeetingEvents] : events
  }, [events, districtMeetingEvents, showDistrictMeetings])

  // Compute slot assignments for events in the current month view
  // This ensures multi-day events maintain their vertical position
  const eventSlots = React.useMemo(() => {
    const slots: Map<string, number> = new Map() // eventId -> slot number
    const monthStart = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-01`
    const monthEnd = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`
    
    // Get all events that appear in this month
    const monthEvents = calendarEvents.filter((e) => {
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
  }, [calendarEvents, currentMonth, daysInMonth])

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

      if (result.success && result.eventId) {
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
    <>
      {/* Hero */}
      <section
        className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20"
        aria-labelledby="events-heading"
      >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <h1 id="events-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
                  {hero.title}
                </h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
                  {hero.description}
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
                  if (shouldResetEventSubmissionOnOpen(open, pendingFlyerUpload)) {
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
                      <div className="py-6 text-center" role="status" aria-live="polite">
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
                          <Button type="button" variant="outline" onClick={() => setSubmitDialogOpen(false)}>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDistrictMeetingsChange(!showDistrictMeetings)}
                  className={`h-9 w-full sm:w-44 justify-between font-normal ${!showDistrictMeetings ? "text-muted-foreground" : ""}`}
                  aria-pressed={showDistrictMeetings}
                >
                  <span className="truncate">District meetings</span>
                  {showDistrictMeetings ? (
                    <Check className="ml-2 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                  ) : (
                    <span className="ml-2 text-xs shrink-0 opacity-70">Off</span>
                  )}
                </Button>
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
                  {!showDistrictMeetings && (
                    <Badge variant="secondary">
                      District meetings hidden
                      <button
                        onClick={() => handleDistrictMeetingsChange(true)}
                        className="ml-1.5 rounded-full hover:bg-foreground/10"
                        aria-label="Show district meetings"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
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
                <h3 id="events-calendar-heading" className="text-lg font-semibold text-foreground" aria-live="polite">
                  {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h3>
                <Button variant="ghost" size="sm" onClick={nextMonth} aria-label="Next month">
                  Next →
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7" role="table" aria-labelledby="events-calendar-heading">
                <div role="rowgroup" className="contents">
                  <div role="row" className="contents">
                    {[
                      ["Sun", "Sunday"],
                      ["Mon", "Monday"],
                      ["Tue", "Tuesday"],
                      ["Wed", "Wednesday"],
                      ["Thu", "Thursday"],
                      ["Fri", "Friday"],
                      ["Sat", "Saturday"],
                    ].map(([shortDay, fullDay]) => (
                      <div
                        key={shortDay}
                        role="columnheader"
                        aria-label={fullDay}
                        className="p-2 text-center text-sm font-medium text-muted-foreground border-b border-border bg-muted/30"
                      >
                        <span aria-hidden="true">{shortDay}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div role="rowgroup" className="contents">
                  {Array.from({
                    length: Math.ceil((firstDayOfMonth + daysInMonth) / 7),
                  }).map((_, weekIndex) => (
                    <div key={`week-${weekIndex}`} role="row" className="contents">
                      {Array.from({ length: 7 }).map((_, weekdayIndex) => {
                  const day = weekIndex * 7 + weekdayIndex - firstDayOfMonth + 1
                  if (day < 1 || day > daysInMonth) {
                    return (
                      <div
                        key={`empty-${weekIndex}-${weekdayIndex}`}
                        role="cell"
                        aria-label="Outside current month"
                        className="p-2 min-h-24 border-b border-r border-border bg-muted/10"
                      />
                    )
                  }
                  const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  // Filter calendar events based on search and type filters
                  const dayEvents = calendarEvents.filter((e) => {
                    const isDistrictMeeting = e.id.startsWith("district-meeting:")
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
                    // Apply type filter - event must have at least one matching type
                    // District monthly meetings are controlled by their own toggle; they shouldn't disappear when filtering other event types.
                    if (!isDistrictMeeting && selectedTypes.length > 0 && !eventHasType(e, selectedTypes)) {
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
                      role="cell"
                      aria-label={getCalendarCellLabel({
                        date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
                        isToday,
                        eventTitles: dayEvents.map((event) => event.title),
                      })}
                      className={`p-2 min-h-24 border-b border-r border-border overflow-visible relative ${isToday ? "bg-primary/5" : ""}`}
                    >
                      <span aria-hidden="true" className={`text-sm font-medium ${isToday ? "text-primary" : "text-foreground"}`}>
                        {day}
                      </span>
                      <div className="mt-1 overflow-visible" aria-hidden="true">
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
                            
                            // Use first type for color (events with multiple types show primary type color)
                            const primaryType = event.types[0]
                            
                            return (
                              <div
                                key={event.id}
                                className={`text-xs p-1 truncate relative z-10 h-6 ${primaryType ? eventTypeColors[primaryType] : ''} ${positionClasses} ${marginClasses}`}
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
                  ))}
                </div>
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
                  {pagedUpcomingGroups.map((group) => {
                    if (group.type === "single" && group.event) {
                      const event = group.event
                      const primaryHref = getPrimaryEventHref(event)
                      return (
                        <article
                          key={event.id}
                          className={`group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md ${primaryHref ? "cursor-pointer" : ""}`}
                          {...getEventCardLinkProps(primaryHref)}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <LocationTypeTag locationType={event.locationType} />
                                {event.types.map((type) => (
                                  <Badge key={type} variant="secondary" className={eventTypeColors[type]}>
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                              <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                                {event.title}
                              </h2>
                              <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                            </div>

                            <div className="flex flex-col gap-3 lg:text-right lg:min-w-64">
                              <div className="flex items-center gap-2 text-sm text-foreground lg:justify-end">
                                <Calendar className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                                <span className="font-medium">{formatDateRange(event.date, event.endDate)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                <span>{event.timeTBD ? "Time TBD" : formatTimeRange(event.startTime, event.endTime)}</span>
                              </div>
                              {event.address ? (
                                <div className="flex items-start gap-2 text-sm text-muted-foreground lg:justify-end">
                                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                  <a
                                    href={buildMapsHref(event.address)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="lg:text-right text-primary hover:underline"
                                  >
                                    {event.address}
                                  </a>
                                </div>
                              ) : (event.locationType === "in-person" || event.locationType === "hybrid") && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                  <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                  <span>Location TBD</span>
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
                                    <span>Meeting Link TBD</span>
                                  )}
                                </div>
                              )}
                              {/* Show flyers */}
                              {event.flyers.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 text-sm lg:justify-end">
                                  {event.flyers.map((flyer, index) => (
                                    <a
                                      key={flyer.id}
                                      href={`/api/flyers/${flyer.fileKey}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                    >
                                      <ExternalLink className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                      {event.flyers.length > 1 ? `Flyer ${index + 1}` : "View Flyer"}
                                    </a>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm lg:justify-end pt-2">
                                <Button variant="outline" size="sm" asChild>
                                  <a
                                    href={generateGoogleCalendarUrl(event)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <CalendarPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                                    Add to Calendar
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </article>
                      )
                    }

                    // Recurring event group
                    if (group.type === "recurring" && group.occurrences && group.parentEventId) {
                      const firstOccurrence = group.occurrences[0]
                      const remainingOccurrences = group.occurrences.slice(1)
                      const isExpanded = expandedGroups.has(group.parentEventId)
                      const primaryHref = getPrimaryEventHref(firstOccurrence)

                      return (
                        <article
                          key={group.parentEventId}
                          className="rounded-xl border border-border bg-card overflow-hidden"
                        >
                          {/* Main event card (first occurrence) */}
                          <div
                            className={`p-6 transition-all hover:bg-muted/30 ${primaryHref ? "cursor-pointer" : ""}`}
                            {...getEventCardLinkProps(primaryHref)}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <LocationTypeTag locationType={firstOccurrence.locationType} />
                                  {firstOccurrence.types.map((type) => (
                                    <Badge key={type} variant="secondary" className={eventTypeColors[type]}>
                                      {type}
                                    </Badge>
                                  ))}
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Repeat className="h-3 w-3" />
                                    {group.recurrenceDescription}
                                  </Badge>
                                </div>
                                <h2 className="text-xl font-semibold text-foreground">
                                  {firstOccurrence.title}
                                </h2>
                                <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{firstOccurrence.description}</p>
                              </div>

                              <div className="flex flex-col gap-3 lg:text-right lg:min-w-64">
                                <div className="flex items-center gap-2 text-sm text-foreground lg:justify-end">
                                  <Calendar className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                                  <span className="font-medium">Next: {formatDateRange(firstOccurrence.date, firstOccurrence.endDate)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                  <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                  <span>{firstOccurrence.timeTBD ? "Time TBD" : formatTimeRange(firstOccurrence.startTime, firstOccurrence.endTime)}</span>
                                </div>
                                {firstOccurrence.address ? (
                                  <div className="flex items-start gap-2 text-sm text-muted-foreground lg:justify-end">
                                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                    <a
                                      href={buildMapsHref(firstOccurrence.address)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="lg:text-right text-primary hover:underline"
                                    >
                                      {firstOccurrence.address}
                                    </a>
                                  </div>
                                ) : (firstOccurrence.locationType === "in-person" || firstOccurrence.locationType === "hybrid") && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                    <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                    <span>Location TBD</span>
                                  </div>
                                )}
                                {(firstOccurrence.locationType === "online" || firstOccurrence.locationType === "hybrid") && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                    <Globe className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                    {firstOccurrence.meetingLink ? (
                                      <a
                                        href={firstOccurrence.meetingLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        {firstOccurrence.locationType === "hybrid" ? "Join Online (Hybrid)" : "Join Online"}
                                      </a>
                                    ) : (
                                      <span>Meeting Link TBD</span>
                                    )}
                                  </div>
                                )}
                                {/* Show flyers */}
                                {firstOccurrence.flyers.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-2 text-sm lg:justify-end">
                                    {firstOccurrence.flyers.map((flyer, index) => (
                                      <a
                                        key={flyer.id}
                                        href={`/api/flyers/${flyer.fileKey}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                      >
                                        <ExternalLink className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                        {firstOccurrence.flyers.length > 1 ? `Flyer ${index + 1}` : "View Flyer"}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-sm lg:justify-end pt-2">
                                  <Button variant="outline" size="sm" asChild>
                                    <a
                                      href={generateGoogleCalendarUrl(firstOccurrence)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <CalendarPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                                      Add to Calendar
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Expandable section for additional occurrences */}
                          {remainingOccurrences.length > 0 && (
                            <>
                              <button
                                onClick={() => toggleGroupExpansion(group.parentEventId!)}
                                className="w-full px-6 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors border-t border-border"
                              >
                                <span className="text-sm font-medium text-muted-foreground">
                                  {remainingOccurrences.length} more occurrence{remainingOccurrences.length > 1 ? "s" : ""} in this series
                                </span>
                                <ChevronDown 
                                  className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} 
                                />
                              </button>
                              
                              {isExpanded && (
                                <div className="border-t border-border divide-y divide-border">
                                  {remainingOccurrences.map((occurrence) => (
                                    <div key={occurrence.id} className="p-4 bg-muted/10 hover:bg-muted/20 transition-colors">
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                          <Calendar className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                                          <span className="font-medium text-sm">{formatDateRange(occurrence.date, occurrence.endDate)}</span>
                                          <span className="text-sm text-muted-foreground">
                                            {occurrence.timeTBD ? "Time TBD" : formatTimeRange(occurrence.startTime, occurrence.endTime)}
                                          </span>
                                          {occurrence.isModified && (
                                            <Badge variant="outline" className="text-xs">Modified</Badge>
                                          )}
                                        </div>
                                        <Button variant="ghost" size="sm" asChild>
                                          <a
                                            href={generateGoogleCalendarUrl(occurrence)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <CalendarPlus className="h-4 w-4 mr-1" aria-hidden="true" />
                                            Add
                                          </a>
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </article>
                      )
                    }

                    return null
                  })}
                  <SectionPagination page={upcomingPage} totalPages={upcomingTotalPages} onPageChange={setUpcomingPage} />
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
                  {pagedDistrictGroups.map((group) => {
                    if (group.type === "single" && group.event) {
                      const event = group.event
                      const primaryHref = getPrimaryEventHref(event)
                      return (
                        <article
                          key={event.id}
                          className={`group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md ${primaryHref ? "cursor-pointer" : ""}`}
                          {...getEventCardLinkProps(primaryHref)}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <LocationTypeTag locationType={event.locationType} />
                                {event.types.map((type) => (
                                  <Badge key={type} variant="secondary" className={eventTypeColors[type]}>
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                              <h4 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                                {event.title}
                              </h4>
                              <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                            </div>

                            <div className="flex flex-col gap-3 lg:text-right lg:min-w-64">
                              <div className="flex items-center gap-2 text-sm text-foreground lg:justify-end">
                                <Calendar className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                                <span className="font-medium">{formatDateRange(event.date, event.endDate)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                <span>{event.timeTBD ? "Time TBD" : formatTimeRange(event.startTime, event.endTime)}</span>
                              </div>
                              {event.address ? (
                                <div className="flex items-start gap-2 text-sm text-muted-foreground lg:justify-end">
                                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                  <a
                                    href={buildMapsHref(event.address)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="lg:text-right text-primary hover:underline"
                                  >
                                    {event.address}
                                  </a>
                                </div>
                              ) : (event.locationType === "in-person" || event.locationType === "hybrid") && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                  <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                  <span>Location TBD</span>
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
                                    <span>Meeting Link TBD</span>
                                  )}
                                </div>
                              )}
                              {/* Show flyers */}
                              {event.flyers.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 text-sm lg:justify-end">
                                  {event.flyers.map((flyer, index) => (
                                    <a
                                      key={flyer.id}
                                      href={`/api/flyers/${flyer.fileKey}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                    >
                                      <ExternalLink className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                      {event.flyers.length > 1 ? `Flyer ${index + 1}` : "View Flyer"}
                                    </a>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm lg:justify-end pt-2">
                                <Button variant="outline" size="sm" asChild>
                                  <a
                                    href={generateGoogleCalendarUrl(event)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <CalendarPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                                    Add to Calendar
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </article>
                      )
                    }

                    // Recurring event group
                    if (group.type === "recurring" && group.occurrences && group.parentEventId) {
                      const firstOccurrence = group.occurrences[0]
                      const remainingOccurrences = group.occurrences.slice(1)
                      const isExpanded = expandedGroups.has(group.parentEventId)
                      const primaryHref = getPrimaryEventHref(firstOccurrence)

                      return (
                        <article
                          key={group.parentEventId}
                          className="rounded-xl border border-border bg-card overflow-hidden"
                        >
                          {/* Main event card (first occurrence) */}
                          <div
                            className={`p-6 transition-all hover:bg-muted/30 ${primaryHref ? "cursor-pointer" : ""}`}
                            {...getEventCardLinkProps(primaryHref)}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <LocationTypeTag locationType={firstOccurrence.locationType} />
                                  {firstOccurrence.types.map((type) => (
                                    <Badge key={type} variant="secondary" className={eventTypeColors[type]}>
                                      {type}
                                    </Badge>
                                  ))}
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Repeat className="h-3 w-3" />
                                    {group.recurrenceDescription}
                                  </Badge>
                                </div>
                                <h4 className="text-xl font-semibold text-foreground">
                                  {firstOccurrence.title}
                                </h4>
                                <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{firstOccurrence.description}</p>
                              </div>

                              <div className="flex flex-col gap-3 lg:text-right lg:min-w-64">
                                <div className="flex items-center gap-2 text-sm text-foreground lg:justify-end">
                                  <Calendar className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                                  <span className="font-medium">Next: {formatDateRange(firstOccurrence.date, firstOccurrence.endDate)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                  <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                  <span>{firstOccurrence.timeTBD ? "Time TBD" : formatTimeRange(firstOccurrence.startTime, firstOccurrence.endTime)}</span>
                                </div>
                                {firstOccurrence.address ? (
                                  <div className="flex items-start gap-2 text-sm text-muted-foreground lg:justify-end">
                                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                    <a
                                      href={buildMapsHref(firstOccurrence.address)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="lg:text-right text-primary hover:underline"
                                    >
                                      {firstOccurrence.address}
                                    </a>
                                  </div>
                                ) : (firstOccurrence.locationType === "in-person" || firstOccurrence.locationType === "hybrid") && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                    <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                    <span>Location TBD</span>
                                  </div>
                                )}
                                {(firstOccurrence.locationType === "online" || firstOccurrence.locationType === "hybrid") && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                    <Globe className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                    {firstOccurrence.meetingLink ? (
                                      <a
                                        href={firstOccurrence.meetingLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        {firstOccurrence.locationType === "hybrid" ? "Join Online (Hybrid)" : "Join Online"}
                                      </a>
                                    ) : (
                                      <span>Meeting Link TBD</span>
                                    )}
                                  </div>
                                )}
                                {/* Show flyers */}
                                {firstOccurrence.flyers.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-2 text-sm lg:justify-end">
                                    {firstOccurrence.flyers.map((flyer, index) => (
                                      <a
                                        key={flyer.id}
                                        href={`/api/flyers/${flyer.fileKey}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                      >
                                        <ExternalLink className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                        {firstOccurrence.flyers.length > 1 ? `Flyer ${index + 1}` : "View Flyer"}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-sm lg:justify-end pt-2">
                                  <Button variant="outline" size="sm" asChild>
                                    <a
                                      href={generateGoogleCalendarUrl(firstOccurrence)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <CalendarPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                                      Add to Calendar
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Expandable section for additional occurrences */}
                          {remainingOccurrences.length > 0 && (
                            <>
                              <button
                                onClick={() => toggleGroupExpansion(group.parentEventId!)}
                                className="w-full px-6 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors border-t border-border"
                              >
                                <span className="text-sm font-medium text-muted-foreground">
                                  {remainingOccurrences.length} more occurrence{remainingOccurrences.length > 1 ? "s" : ""} in this series
                                </span>
                                <ChevronDown 
                                  className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} 
                                />
                              </button>
                              
                              {isExpanded && (
                                <div className="border-t border-border divide-y divide-border">
                                  {remainingOccurrences.map((occurrence) => (
                                    <div key={occurrence.id} className="p-4 bg-muted/10 hover:bg-muted/20 transition-colors">
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                          <Calendar className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                                          <span className="font-medium text-sm">{formatDateRange(occurrence.date, occurrence.endDate)}</span>
                                          <span className="text-sm text-muted-foreground">
                                            {occurrence.timeTBD ? "Time TBD" : formatTimeRange(occurrence.startTime, occurrence.endTime)}
                                          </span>
                                          {occurrence.isModified && (
                                            <Badge variant="outline" className="text-xs">Modified</Badge>
                                          )}
                                        </div>
                                        <Button variant="ghost" size="sm" asChild>
                                          <a
                                            href={generateGoogleCalendarUrl(occurrence)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <CalendarPlus className="h-4 w-4 mr-1" aria-hidden="true" />
                                            Add
                                          </a>
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </article>
                      )
                    }

                    return null
                  })}
                  <SectionPagination page={districtPage} totalPages={districtTotalPages} onPageChange={setDistrictPage} />
                </div>
              )}
            </div>

            {/* District Monthly Meetings */}
            <div className="mt-12 pt-8 border-t border-border">
              <h3 id="district-monthly-meetings-heading" className="text-xl font-semibold text-foreground mb-2">
                District Monthly Meetings
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Recurring monthly district meetings, generated from the Districts content.
              </p>

              {!showDistrictMeetings ? (
                <div className="text-center py-8 rounded-xl border border-border bg-card">
                  <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-muted-foreground">
                    District monthly meetings are hidden. Turn on <span className="font-medium text-foreground">District meetings</span> in the filters.
                  </p>
                </div>
              ) : filteredDistrictMeetingEvents.length === 0 ? (
                <div className="text-center py-8 rounded-xl border border-border bg-card">
                  <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-muted-foreground">No district monthly meetings match your filters.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pagedDistrictMeetingGroups.map((group) => {
                    if (group.type === "single" && group.event) {
                      const event = group.event
                      const primaryHref = getPrimaryEventHref(event)
                      return (
                        <article
                          key={event.id}
                          className={`group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md ${primaryHref ? "cursor-pointer" : ""}`}
                          {...getEventCardLinkProps(primaryHref)}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <LocationTypeTag locationType={event.locationType} />
                                {event.types.map((type) => (
                                  <Badge key={type} variant="secondary" className={eventTypeColors[type]}>
                                    {type}
                                  </Badge>
                                ))}
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Repeat className="h-3 w-3" />
                                  Monthly
                                </Badge>
                              </div>
                              <h4 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                                {event.title}
                              </h4>
                              <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                            </div>

                            <div className="flex flex-col gap-3 lg:text-right lg:min-w-64">
                              <div className="flex items-center gap-2 text-sm text-foreground lg:justify-end">
                                <Calendar className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                                <span className="font-medium">{formatDateRange(event.date, event.endDate)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                <span>{event.timeTBD ? "Time TBD" : formatTimeRange(event.startTime, event.endTime)}</span>
                              </div>
                              {event.address ? (
                                <div className="flex items-start gap-2 text-sm text-muted-foreground lg:justify-end">
                                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                  <a
                                    href={buildMapsHref(event.address)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="lg:text-right text-primary hover:underline"
                                  >
                                    {event.address}
                                  </a>
                                </div>
                              ) : (event.locationType === "in-person" || event.locationType === "hybrid") && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                  <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                  <span>Location TBD</span>
                                </div>
                              )}
                              {(event.locationType === "online" || event.locationType === "hybrid") && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                  <Globe className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                  <span>Contact DCM for online meeting details</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm lg:justify-end pt-2">
                                <Button variant="outline" size="sm" asChild>
                                  <a
                                    href={generateGoogleCalendarUrl(event)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <CalendarPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                                    Add to Calendar
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </article>
                      )
                    }

                    if (group.type === "recurring" && group.occurrences && group.parentEventId) {
                      const firstOccurrence = group.occurrences[0]
                      const remainingOccurrences = group.occurrences.slice(1)
                      const isExpanded = expandedGroups.has(group.parentEventId)
                      const primaryHref = getPrimaryEventHref(firstOccurrence)

                      return (
                        <article
                          key={group.parentEventId}
                          className="rounded-xl border border-border bg-card overflow-hidden"
                        >
                          <div
                            className={`p-6 transition-all hover:bg-muted/30 ${primaryHref ? "cursor-pointer" : ""}`}
                            {...getEventCardLinkProps(primaryHref)}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <LocationTypeTag locationType={firstOccurrence.locationType} />
                                  {firstOccurrence.types.map((type) => (
                                    <Badge key={type} variant="secondary" className={eventTypeColors[type]}>
                                      {type}
                                    </Badge>
                                  ))}
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Repeat className="h-3 w-3" />
                                    {group.recurrenceDescription}
                                  </Badge>
                                </div>
                                <h4 className="text-xl font-semibold text-foreground">
                                  {firstOccurrence.title}
                                </h4>
                                <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{firstOccurrence.description}</p>
                              </div>

                              <div className="flex flex-col gap-3 lg:text-right lg:min-w-64">
                                <div className="flex items-center gap-2 text-sm text-foreground lg:justify-end">
                                  <Calendar className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                                  <span className="font-medium">Next: {formatDateRange(firstOccurrence.date, firstOccurrence.endDate)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                  <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                  <span>{firstOccurrence.timeTBD ? "Time TBD" : formatTimeRange(firstOccurrence.startTime, firstOccurrence.endTime)}</span>
                                </div>
                                {firstOccurrence.address ? (
                                  <div className="flex items-start gap-2 text-sm text-muted-foreground lg:justify-end">
                                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                    <a
                                      href={buildMapsHref(firstOccurrence.address)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="lg:text-right text-primary hover:underline"
                                    >
                                      {firstOccurrence.address}
                                    </a>
                                  </div>
                                ) : (firstOccurrence.locationType === "in-person" || firstOccurrence.locationType === "hybrid") && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                    <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                    <span>Location TBD</span>
                                  </div>
                                )}
                                {(firstOccurrence.locationType === "online" || firstOccurrence.locationType === "hybrid") && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                    <Globe className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                    <span>Contact DCM for online meeting details</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-sm lg:justify-end pt-2">
                                  <Button variant="outline" size="sm" asChild>
                                    <a
                                      href={generateGoogleCalendarUrl(firstOccurrence)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <CalendarPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                                      Add to Calendar
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {remainingOccurrences.length > 0 && (
                            <>
                              <button
                                onClick={() => toggleGroupExpansion(group.parentEventId!)}
                                className="w-full px-6 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors border-t border-border"
                              >
                                <span className="text-sm font-medium text-muted-foreground">
                                  {remainingOccurrences.length} more occurrence{remainingOccurrences.length > 1 ? "s" : ""} in this series
                                </span>
                                <ChevronDown
                                  className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                />
                              </button>

                              {isExpanded && (
                                <div className="border-t border-border divide-y divide-border">
                                  {remainingOccurrences.map((occurrence) => (
                                    <div key={occurrence.id} className="p-4 bg-muted/10 hover:bg-muted/20 transition-colors">
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                          <Calendar className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                                          <span className="font-medium text-sm">{formatDateRange(occurrence.date, occurrence.endDate)}</span>
                                          <span className="text-sm text-muted-foreground">
                                            {occurrence.timeTBD ? "Time TBD" : formatTimeRange(occurrence.startTime, occurrence.endTime)}
                                          </span>
                                        </div>
                                        <Button variant="ghost" size="sm" asChild>
                                          <a
                                            href={generateGoogleCalendarUrl(occurrence)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <CalendarPlus className="h-4 w-4 mr-1" aria-hidden="true" />
                                            Add
                                          </a>
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </article>
                      )
                    }

                    return null
                  })}

                  <SectionPagination
                    page={districtMeetingsPage}
                    totalPages={districtMeetingsTotalPages}
                    onPageChange={setDistrictMeetingsPage}
                  />
                </div>
              )}
            </div>

            {/* Annual Calendar Download */}
            <AnnualCalendarSection files={calendarFiles} />

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

            {/* Past Events */}
            <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => setPastOpen((v) => !v)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
                aria-expanded={pastOpen}
              >
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Past Events</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    View recent past events. This section starts collapsed to keep the page focused on upcoming items.
                  </p>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${pastOpen ? "rotate-180" : ""}`} />
              </button>

              {pastOpen && (
                <div className="border-t border-border p-6">
                  {pastError && (
                    <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                      {pastError}
                    </div>
                  )}

                  <div className="space-y-3 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="relative flex-1 max-w-sm">
                        <Search
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <Input
                          type="search"
                          placeholder="Search past events..."
                          value={pastSearchQuery}
                          onChange={(e) => setPastSearchQuery(e.target.value)}
                          className="pl-9 h-9"
                          aria-label="Search past events"
                        />
                      </div>
                      <MultiSelect
                        options={eventTypeOptions}
                        value={pastSelectedTypes}
                        onChange={setPastSelectedTypes}
                        placeholder="Event type"
                        className="w-full sm:w-44"
                      />
                      <DateRangePicker
                        value={pastDateRange}
                        onChange={setPastDateRange}
                        placeholder="Date range"
                        className="w-full sm:w-52"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-start text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setPastSearchQuery("")
                          setPastSelectedTypes([])
                          setPastDateRange(undefined)
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Past events are filtered on the server so results include events beyond what has already been loaded.
                    </p>
                    {pastLoading && pastPages.length > 0 && (
                      <p className="text-xs text-muted-foreground">Updating results…</p>
                    )}
                  </div>

                  {pastLoading && pastPages.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Loading past events...</div>
                  ) : currentPastPage && currentPastPage.events.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No past events found.</div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {groupEventsDescending(currentPastPage?.events ?? []).map((group) => {
                          if (group.type === "single" && group.event) {
                            const event = group.event
                            const primaryHref = getPrimaryEventHref(event)
                            return (
                              <article
                                key={event.id}
                                className={`group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md ${primaryHref ? "cursor-pointer" : ""}`}
                                {...getEventCardLinkProps(primaryHref)}
                              >
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                                  <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                      <LocationTypeTag locationType={event.locationType} />
                                      {event.types.map((type) => (
                                        <Badge key={type} variant="secondary" className={eventTypeColors[type]}>
                                          {type}
                                        </Badge>
                                      ))}
                                      {event.isRecurring && event.recurrenceDescription && (
                                        <Badge variant="outline" className="flex items-center gap-1">
                                          <Repeat className="h-3 w-3" />
                                          {event.recurrenceDescription}
                                        </Badge>
                                      )}
                                    </div>
                                    <h4 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                                      {event.title}
                                    </h4>
                                    <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                                  </div>

                                  <div className="flex flex-col gap-3 lg:text-right lg:min-w-64">
                                    <div className="flex items-center gap-2 text-sm text-foreground lg:justify-end">
                                      <Calendar className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                                      <span className="font-medium">{formatDateRange(event.date, event.endDate)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                      <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                      <span>{event.timeTBD ? "Time TBD" : formatTimeRange(event.startTime, event.endTime)}</span>
                                    </div>
                                    {event.address ? (
                                      <div className="flex items-start gap-2 text-sm text-muted-foreground lg:justify-end">
                                        <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                        <a
                                          href={buildMapsHref(event.address)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="lg:text-right text-primary hover:underline"
                                        >
                                          {event.address}
                                        </a>
                                      </div>
                                    ) : (event.locationType === "in-person" || event.locationType === "hybrid") && (
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                        <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                        <span>Location TBD</span>
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
                                            {event.locationType === "hybrid" ? "Online (Hybrid)" : "Online"}
                                          </a>
                                        ) : (
                                          <span>Meeting Link TBD</span>
                                        )}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm lg:justify-end pt-2">
                                      <Button variant="outline" size="sm" asChild>
                                        <a
                                          href={generateGoogleCalendarUrl(event)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <CalendarPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                                          Add to Calendar
                                        </a>
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </article>
                            )
                          }

                          if (group.type === "recurring" && group.occurrences && group.parentEventId) {
                            const firstOccurrence = group.occurrences[0]
                            const remainingOccurrences = group.occurrences.slice(1)
                            const isExpanded = expandedPastGroups.has(group.parentEventId)
                            const primaryHref = getPrimaryEventHref(firstOccurrence)

                            return (
                              <article
                                key={group.parentEventId}
                                className="rounded-xl border border-border bg-card overflow-hidden"
                              >
                                <div
                                  className={`p-6 transition-all hover:bg-muted/30 ${primaryHref ? "cursor-pointer" : ""}`}
                                  {...getEventCardLinkProps(primaryHref)}
                                >
                                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                                    <div className="flex-1">
                                      <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <LocationTypeTag locationType={firstOccurrence.locationType} />
                                        {firstOccurrence.types.map((type) => (
                                          <Badge key={type} variant="secondary" className={eventTypeColors[type]}>
                                            {type}
                                          </Badge>
                                        ))}
                                        <Badge variant="outline" className="flex items-center gap-1">
                                          <Repeat className="h-3 w-3" />
                                          {group.recurrenceDescription}
                                        </Badge>
                                      </div>
                                      <h4 className="text-xl font-semibold text-foreground">
                                        {firstOccurrence.title}
                                      </h4>
                                      <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{firstOccurrence.description}</p>
                                    </div>

                                    <div className="flex flex-col gap-3 lg:text-right lg:min-w-64">
                                      <div className="flex items-center gap-2 text-sm text-foreground lg:justify-end">
                                        <Calendar className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                                        <span className="font-medium">{formatDateRange(firstOccurrence.date, firstOccurrence.endDate)}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                        <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                        <span>{firstOccurrence.timeTBD ? "Time TBD" : formatTimeRange(firstOccurrence.startTime, firstOccurrence.endTime)}</span>
                                      </div>
                                      {firstOccurrence.address ? (
                                        <div className="flex items-start gap-2 text-sm text-muted-foreground lg:justify-end">
                                          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                          <a
                                            href={buildMapsHref(firstOccurrence.address)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="lg:text-right text-primary hover:underline"
                                          >
                                            {firstOccurrence.address}
                                          </a>
                                        </div>
                                      ) : (firstOccurrence.locationType === "in-person" || firstOccurrence.locationType === "hybrid") && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                          <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                          <span>Location TBD</span>
                                        </div>
                                      )}
                                      {(firstOccurrence.locationType === "online" || firstOccurrence.locationType === "hybrid") && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-end">
                                          <Globe className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                          {firstOccurrence.meetingLink ? (
                                            <a
                                              href={firstOccurrence.meetingLink}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-primary hover:underline"
                                            >
                                              {firstOccurrence.locationType === "hybrid" ? "Online (Hybrid)" : "Online"}
                                            </a>
                                          ) : (
                                            <span>Meeting Link TBD</span>
                                          )}
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2 text-sm lg:justify-end pt-2">
                                        <Button variant="outline" size="sm" asChild>
                                          <a
                                            href={generateGoogleCalendarUrl(firstOccurrence)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <CalendarPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                                            Add to Calendar
                                          </a>
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {remainingOccurrences.length > 0 && (
                                  <>
                                    <button
                                      onClick={() => togglePastGroupExpansion(group.parentEventId!)}
                                      className="w-full px-6 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors border-t border-border"
                                    >
                                      <span className="text-sm font-medium text-muted-foreground">
                                        {remainingOccurrences.length} more occurrence{remainingOccurrences.length > 1 ? "s" : ""} in this series
                                      </span>
                                      <ChevronDown
                                        className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                      />
                                    </button>

                                    {isExpanded && (
                                      <div className="border-t border-border divide-y divide-border">
                                        {remainingOccurrences.map((occurrence) => (
                                          <div key={occurrence.id} className="p-4 bg-muted/10 hover:bg-muted/20 transition-colors">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                              <div className="flex items-center gap-3">
                                                <Calendar className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                                                <span className="font-medium text-sm">{formatDateRange(occurrence.date, occurrence.endDate)}</span>
                                                <span className="text-sm text-muted-foreground">
                                                  {occurrence.timeTBD ? "Time TBD" : formatTimeRange(occurrence.startTime, occurrence.endTime)}
                                                </span>
                                                {occurrence.isModified && (
                                                  <Badge variant="outline" className="text-xs">Modified</Badge>
                                                )}
                                              </div>
                                              <Button variant="ghost" size="sm" asChild>
                                                <a
                                                  href={generateGoogleCalendarUrl(occurrence)}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                >
                                                  <CalendarPlus className="h-4 w-4 mr-1" aria-hidden="true" />
                                                  Add
                                                </a>
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                              </article>
                            )
                          }

                          return null
                        })}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                        <div className="text-sm text-muted-foreground">
                          Page <span className="font-medium text-foreground">{pastPageIndex + 1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={goToPrevPastPage}
                            disabled={pastPageIndex <= 0 || pastLoading}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={goToNextPastPage}
                            disabled={!currentPastPage?.nextCursor || pastLoading}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
    </>
  )
}
