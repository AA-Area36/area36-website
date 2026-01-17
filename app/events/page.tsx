"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Calendar, MapPin, Clock, ExternalLink, List, CalendarDays, Search, Plus, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

const events = [
  {
    id: 1,
    title: "West Central Region Forum",
    date: "2025-09-19",
    endDate: "2025-09-21",
    time: "5:00 PM - 12:00 PM",
    location: "Hilton Hotel, Omaha, Nebraska",
    description:
      "Area 41 hosts the West Central Region Forum. A great opportunity to meet A.A. members from across the region.",
    type: "Regional",
  },
  {
    id: 2,
    title: "Area Assembly – Budget (Hybrid)",
    date: "2025-10-18",
    time: "9:00 AM - 4:00 PM",
    location: "Jordan Community Center, 500 Sunset Drive, Suite #19, Jordan, MN 55352",
    description: "Budget assembly with hybrid attendance options. All GSRs encouraged to attend.",
    type: "Assembly",
  },
  {
    id: 3,
    title: "2025 Area 35/36 Joint Corrections Workshop",
    date: "2025-10-25",
    time: "9:30 AM - 3:30 PM",
    location: "TBA",
    description:
      "Joint workshop with Area 35 focused on corrections service. Learn how to carry the message to those in treatment and correctional facilities.",
    type: "Workshop",
  },
  {
    id: 4,
    title: "Area Inventory",
    date: "2025-11-08",
    time: "9:00 AM - 1:00 PM",
    location: "Wyndham, 14201 Nicollet Ave, Burnsville, MN 55337",
    description: "Annual area inventory meeting. An opportunity to reflect on how we can better serve the fellowship.",
    type: "Meeting",
  },
  {
    id: 5,
    title: "Area Committee Meeting Annual Meeting (Online)",
    date: "2025-12-06",
    time: "9:30 AM - 5:00 PM",
    location: "Online",
    description: "Committees 9:30 – 11:30 am, GSR/Alts 10:30 – 11:30 (Optional), Area Committee 12:30 – 5:00 pm",
    type: "Committee",
  },
  {
    id: 6,
    title: "Spring Assembly",
    date: "2026-03-21",
    time: "9:00 AM - 4:00 PM",
    location: "TBA",
    description: "Spring assembly for Area 36. Topics and location to be announced.",
    type: "Assembly",
  },
  {
    id: 7,
    title: "District 5 Monthly Meeting",
    date: "2025-10-12",
    time: "2:00 PM - 4:00 PM",
    location: "First Lutheran Church, Rochester, MN",
    description: "Monthly district meeting. All GSRs and interested members welcome.",
    type: "District",
  },
  {
    id: 8,
    title: "District 12 Fall Workshop",
    date: "2025-11-15",
    time: "10:00 AM - 2:00 PM",
    location: "Community Center, Mankato, MN",
    description: "Workshop on sponsorship and service. Lunch provided.",
    type: "District",
  },
  {
    id: 9,
    title: "District 8 Planning Meeting",
    date: "2025-10-26",
    time: "1:00 PM - 3:00 PM",
    location: "Unity Church, Burnsville, MN",
    description: "Planning session for upcoming district events and gratitude dinner.",
    type: "District",
  },
  {
    id: 10,
    title: "District 3 Gratitude Dinner",
    date: "2025-11-22",
    time: "5:00 PM - 8:00 PM",
    location: "American Legion, Faribault, MN",
    description: "Annual gratitude dinner with speaker. Tickets $15, families welcome.",
    type: "District",
  },
  {
    id: 11,
    title: "District 15 Service Workshop",
    date: "2025-12-07",
    time: "9:00 AM - 12:00 PM",
    location: "St. Mary's Church, Winona, MN",
    description: "Introduction to service positions at group, district, and area levels.",
    type: "District",
  },
  {
    id: 12,
    title: "District 9 Holiday Alcathon",
    date: "2025-12-25",
    time: "12:00 AM - 11:59 PM",
    location: "Alano Club, Bloomington, MN",
    description: "24-hour marathon meetings on Christmas Day. Fellowship and food all day.",
    type: "District",
  },
]

const eventTypes = ["All", "Assembly", "Regional", "Workshop", "Meeting", "Committee", "District"]

const eventTypeColors: Record<string, string> = {
  Regional: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Assembly: "bg-primary/10 text-primary",
  Workshop: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Meeting: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Committee: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  District: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
}

function formatDateRange(start: string, end?: string) {
  const startDate = new Date(start)
  if (!end) {
    return formatDate(start)
  }
  const endDate = new Date(end)
  const startMonth = startDate.toLocaleDateString("en-US", { month: "long" })
  const endMonth = endDate.toLocaleDateString("en-US", { month: "long" })

  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`
  }
  return `${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
}

function getMonthEvents(year: number, month: number) {
  return events.filter((event) => {
    const eventDate = new Date(event.date)
    return eventDate.getFullYear() === year && eventDate.getMonth() === month
  })
}

// Multi-select options with colors
const eventTypeOptions = eventTypes
  .filter((t) => t !== "All")
  .map((type) => ({
    label: type,
    value: type,
    color: eventTypeColors[type],
  }))

export default function EventsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get initial values from URL
  const initialSearch = searchParams.get("q") || ""
  const initialTypes = searchParams.get("types")?.split(",").filter(Boolean) || []
  const initialView = searchParams.get("view") || "list"
  const initialDateFrom = searchParams.get("from")
  const initialDateTo = searchParams.get("to")
  const initialDateRange: DateRange | undefined = initialDateFrom
    ? { from: new Date(initialDateFrom), to: initialDateTo ? new Date(initialDateTo) : undefined }
    : undefined

  const [searchQuery, setSearchQuery] = React.useState(initialSearch)
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>(initialTypes)
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(initialDateRange)
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  const [submitDialogOpen, setSubmitDialogOpen] = React.useState(false)
  const [activeView, setActiveView] = React.useState(initialView)
  const tabsRef = React.useRef<HTMLDivElement>(null)

  // Update URL when filters change
  const updateURL = React.useCallback((search: string, types: string[], range: DateRange | undefined, view: string) => {
    const params = new URLSearchParams()
    if (search) params.set("q", search)
    if (types.length > 0) params.set("types", types.join(","))
    if (range?.from) params.set("from", range.from.toISOString().split("T")[0])
    if (range?.to) params.set("to", range.to.toISOString().split("T")[0])
    if (view && view !== "list") params.set("view", view)

    const queryString = params.toString()
    router.replace(queryString ? `?${queryString}` : "/events", { scroll: false })
  }, [router])

  // Wrapped state setters to update URL
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    updateURL(value, selectedTypes, dateRange, activeView)
  }

  const handleTypesChange = (types: string[]) => {
    setSelectedTypes(types)
    updateURL(searchQuery, types, dateRange, activeView)
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
    updateURL(searchQuery, selectedTypes, range, activeView)
  }

  const handleViewChange = (view: string) => {
    setActiveView(view)
    updateURL(searchQuery, selectedTypes, dateRange, view)
  }

  // Common filter logic for search and date
  const applyCommonFilters = (event: typeof events[0]) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase())

    const eventDate = new Date(event.date)
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
    updateURL("", [], undefined, activeView)
  }

  const hasActiveFilters = selectedTypes.length > 0 || dateRange?.from || searchQuery

  const monthEvents = getMonthEvents(currentMonth.getFullYear(), currentMonth.getMonth())

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
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
                <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      Submit Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Submit an Event</DialogTitle>
                      <DialogDescription>
                        Submit an event for review. Events will be published after approval by an Area administrator.
                      </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="eventTitle">Event Title</Label>
                        <Input id="eventTitle" placeholder="e.g., District 5 Workshop" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="eventDate">Date</Label>
                          <Input id="eventDate" type="date" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="eventTime">Time</Label>
                          <Input id="eventTime" placeholder="e.g., 9:00 AM - 3:00 PM" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="eventLocation">Location</Label>
                        <Input id="eventLocation" placeholder="Full address or 'Online'" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="eventType">Event Type</Label>
                        <Select>
                          <SelectTrigger id="eventType">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {eventTypes
                              .filter((t) => t !== "All")
                              .map((type) => (
                                <SelectItem key={type} value={type.toLowerCase()}>
                                  {type}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="eventDescription">Description</Label>
                        <Textarea id="eventDescription" placeholder="Describe the event..." rows={3} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="eventFlyer">Flyer/Graphic (Optional)</Label>
                        <Input id="eventFlyer" type="file" accept="image/*,.pdf" />
                        <p className="text-xs text-muted-foreground">
                          Upload a flyer or graphic for your event (JPG, PNG, or PDF)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="submitterEmail">Your Email</Label>
                        <Input id="submitterEmail" type="email" placeholder="For follow-up questions" required />
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setSubmitDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Submit for Review</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button asChild variant="outline">
                  <Link href="#" target="_blank" rel="noopener noreferrer">
                    <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
                    Subscribe
                  </Link>
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
            <Tabs value={activeView} onValueChange={handleViewChange} className="space-y-6">
              <TabsList>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" aria-hidden="true" />
                  List View
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Calendar View
                </TabsTrigger>
              </TabsList>

              {/* List View */}
              <TabsContent value="list" className="space-y-4">
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-12 rounded-xl border border-border bg-card">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium text-foreground">No events found</h3>
                    <p className="mt-2 text-muted-foreground">Try adjusting your search or filter criteria.</p>
                  </div>
                ) : (
                  filteredEvents.map((event) => (
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
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-muted-foreground lg:justify-end">
                            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                            <span className="lg:text-right">{event.location}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </TabsContent>

              {/* Calendar View */}
              <TabsContent value="calendar">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
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
                      const dayEvents = events.filter((e) => e.date === dateStr)
                      const isToday = new Date().toDateString() === new Date(dateStr).toDateString()

                      return (
                        <div
                          key={day}
                          className={`p-2 min-h-24 border-b border-r border-border ${isToday ? "bg-primary/5" : ""}`}
                        >
                          <span className={`text-sm font-medium ${isToday ? "text-primary" : "text-foreground"}`}>
                            {day}
                          </span>
                          <div className="mt-1 space-y-1">
                            {dayEvents.map((event) => (
                              <div
                                key={event.id}
                                className={`text-xs p-1 rounded truncate ${eventTypeColors[event.type]}`}
                                title={event.title}
                              >
                                {event.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Month Events Summary */}
                  {monthEvents.length > 0 && (
                    <div className="p-4 border-t border-border bg-muted/30">
                      <h4 className="text-sm font-medium text-foreground mb-3">Events this month</h4>
                      <div className="space-y-2">
                        {monthEvents.map((event) => (
                          <div key={event.id} className="flex items-center gap-3 text-sm">
                            <Badge variant="secondary" className={`${eventTypeColors[event.type]} text-xs`}>
                              {event.type}
                            </Badge>
                            <span className="text-foreground font-medium">{event.title}</span>
                            <span className="text-muted-foreground">
                              {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

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
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-muted-foreground lg:justify-end">
                            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                            <span className="lg:text-right">{event.location}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Calendar Subscription */}
            <div className="mt-12 rounded-xl border border-border bg-muted/30 p-6">
              <h3 className="font-semibold text-foreground mb-4">Subscribe to Calendar</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add Area 36 events directly to your calendar application.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline" size="sm">
                  <Link href="#" target="_blank" rel="noopener noreferrer">
                    Google Calendar
                    <ExternalLink className="ml-2 h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="#" target="_blank" rel="noopener noreferrer">
                    Apple Calendar
                    <ExternalLink className="ml-2 h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="#" target="_blank" rel="noopener noreferrer">
                    Outlook
                    <ExternalLink className="ml-2 h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="#" target="_blank" rel="noopener noreferrer">
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
