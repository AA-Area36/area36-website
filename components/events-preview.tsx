import Link from "next/link"
import { Calendar, MapPin, ArrowRight, CalendarX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchUpcomingEvents } from "./events-preview-actions"
import type { Event } from "@/lib/db/schema"

// Format date for display
function formatEventDate(event: Event): string {
  const startDate = new Date(event.date + "T00:00:00")
  
  if (event.endDate && event.endDate !== event.date) {
    const endDate = new Date(event.endDate + "T00:00:00")
    const startMonth = startDate.toLocaleDateString("en-US", { month: "long" })
    const endMonth = endDate.toLocaleDateString("en-US", { month: "long" })
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`
    }
    return `${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
  }
  
  return startDate.toLocaleDateString("en-US", { 
    weekday: "long",
    month: "long", 
    day: "numeric", 
    year: "numeric" 
  })
}

// Format time for display
function formatEventTime(event: Event): string | null {
  if (!event.startTime) return null
  
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const h = parseInt(hours)
    const ampm = h >= 12 ? "PM" : "AM"
    const hour12 = h % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }
  
  if (event.endTime) {
    return `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`
  }
  return formatTime(event.startTime)
}

// Get location display
function formatLocation(event: Event): string {
  if (event.locationType === "online") {
    return "Online"
  }
  if (event.address) {
    return event.address
  }
  if (event.locationType === "hybrid") {
    return "Hybrid (Online + In-Person)"
  }
  return "Location TBD"
}

export async function EventsPreview() {
  const events = await fetchUpcomingEvents()

  return (
    <section className="py-16 sm:py-24" aria-labelledby="events-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <h2 id="events-heading" className="text-3xl font-bold text-foreground">
              Upcoming Events
            </h2>
            <p className="mt-2 text-muted-foreground">
              Stay connected with Area 36 assemblies, workshops, and service events.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/events">
              View All Events
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12 rounded-lg border border-border bg-card">
            <CalendarX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No upcoming events at this time.</p>
            <Button asChild variant="link" className="mt-2">
              <Link href="/events">View all events</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => {
              const time = formatEventTime(event)
              return (
                <article
                  key={event.id}
                  className="group relative flex flex-col rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {event.type}
                      </span>
                      <h3 className="mt-3 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                        {event.title}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span>
                        {formatEventDate(event)}
                        {time && ` · ${time}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span>{formatLocation(event)}</span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
