import Link from "next/link"
import { Calendar, MapPin, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const upcomingEvents = [
  {
    id: 1,
    title: "West Central Region Forum",
    date: "September 19-21, 2025",
    location: "Hilton Hotel, Omaha, Nebraska",
    type: "Regional",
  },
  {
    id: 2,
    title: "Area Assembly – Budget (Hybrid)",
    date: "October 18, 2025",
    time: "9:00 AM - 4:00 PM",
    location: "Jordan Community Center, Jordan, MN",
    type: "Assembly",
  },
  {
    id: 3,
    title: "Area 35/36 Joint Corrections Workshop",
    date: "October 25, 2025",
    time: "9:30 AM - 3:30 PM",
    location: "TBA",
    type: "Workshop",
  },
  {
    id: 4,
    title: "Area Inventory",
    date: "November 8, 2025",
    time: "9:00 AM - 1:00 PM",
    location: "Wyndham, Burnsville, MN",
    type: "Meeting",
  },
]

export function EventsPreview() {
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

        <div className="grid gap-4 sm:grid-cols-2">
          {upcomingEvents.map((event) => (
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
                    {event.date}
                    {event.time && ` · ${event.time}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>{event.location}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
