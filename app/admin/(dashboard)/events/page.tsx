import { getDb } from "@/lib/db"
import { events, type EventStatus } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, MapPin, Mail, ExternalLink, Check, Trash2, Video, Globe } from "lucide-react"
import type { Event, LocationType } from "@/lib/db/schema"

const locationTypeLabels: Record<LocationType, string> = {
  "in-person": "In Person",
  "hybrid": "Hybrid",
  "online": "Online",
}

function formatEventLocation(event: Event) {
  const parts: string[] = []

  if (event.locationType === "online") {
    parts.push("Online")
  } else if (event.locationType === "hybrid") {
    parts.push("Hybrid")
  }

  if (event.address) {
    parts.push(event.address)
  }

  return parts.length > 0 ? parts.join(" • ") : "Location TBD"
}
import { approveEvent, deleteEvent } from "./actions"
import { DenyEventDialog } from "./deny-event-dialog"
import { EditEventDialog } from "./edit-event-dialog"
import { formatTimeRange } from "@/lib/timezone"

export const dynamic = "force-dynamic"

const statusColors: Record<EventStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  denied: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
}

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
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function AdminEventsPage() {
  const db = await getDb()
  const allEvents = await db.select().from(events).orderBy(desc(events.createdAt))

  const pendingEvents = allEvents.filter((e) => e.status === "pending")
  const approvedEvents = allEvents.filter((e) => e.status === "approved")
  const deniedEvents = allEvents.filter((e) => e.status === "denied")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Event Management</h1>
        <p className="text-muted-foreground mt-1">
          Review and manage event submissions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-3xl">{pendingEvents.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-3xl">{approvedEvents.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Denied</CardDescription>
            <CardTitle className="text-3xl">{deniedEvents.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {pendingEvents.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="denied">Denied</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingEvents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending events to review.
              </CardContent>
            </Card>
          ) : (
            pendingEvents.map((event) => (
              <EventCard key={event.id} event={event} showActions />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedEvents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No approved events.
              </CardContent>
            </Card>
          ) : (
            approvedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </TabsContent>

        <TabsContent value="denied" className="space-y-4">
          {deniedEvents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No denied events.
              </CardContent>
            </Card>
          ) : (
            deniedEvents.map((event) => <EventCard key={event.id} event={event} />)
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {allEvents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No events found.
              </CardContent>
            </Card>
          ) : (
            allEvents.map((event) => <EventCard key={event.id} event={event} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EventCard({
  event,
  showActions = false,
}: {
  event: typeof events.$inferSelect
  showActions?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={eventTypeColors[event.type]}>
                {event.type}
              </Badge>
              <Badge variant="secondary" className={statusColors[event.status]}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </Badge>
            </div>

            <h3 className="text-lg font-semibold">{event.title}</h3>
            <p className="text-sm text-muted-foreground">{event.description}</p>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDate(event.date)}
                  {event.endDate && ` - ${formatDate(event.endDate)}`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatTimeRange(event.startTime, event.endTime, event.timezone)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{formatEventLocation(event)}</span>
              </div>
              {event.meetingLink && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Video className="h-4 w-4" />
                  <a
                    href={event.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Meeting Link
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Submitted by: {event.submitterEmail}</span>
            </div>

            {event.flyerUrl && (
              <div className="flex items-center gap-2 text-sm">
                <a
                  href={event.flyerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  View Flyer <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {event.reviewedBy && (
              <p className="text-xs text-muted-foreground">
                Reviewed by {event.reviewedBy} on{" "}
                {event.reviewedAt ? formatDate(event.reviewedAt) : "unknown date"}
              </p>
            )}
            {event.status === "denied" && event.denialReason && (
              <div className="mt-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-medium text-destructive">Denial Reason:</p>
                <p className="text-sm text-muted-foreground mt-1">{event.denialReason}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 lg:min-w-32">
            {showActions && (
              <>
                <form action={approveEvent.bind(null, event.id)}>
                  <Button type="submit" size="sm" className="w-full">
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </form>
                <DenyEventDialog eventId={event.id} eventTitle={event.title} />
              </>
            )}
            <EditEventDialog event={event} />
            <form action={deleteEvent.bind(null, event.id)}>
              <Button type="submit" variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
