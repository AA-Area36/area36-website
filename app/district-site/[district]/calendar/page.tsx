import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CalendarDays, Clock, MapPin } from "lucide-react"
import { notFound } from "next/navigation"
import { getDistrictPublicEvents } from "@/lib/district/queries"
import { formatTimeRange } from "@/lib/timezone"
import { coerceDistrict, districtHref, getDistrictBasePath, resolveDistrictSiteForRender } from "../district-utils"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Calendar",
  description: "Upcoming district events and activities.",
}

// Format date for the date badge
function formatDateBadge(dateString: string) {
  const date = new Date(dateString + "T12:00:00")
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: date.getDate().toString(),
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    full: date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  }
}

export default async function DistrictCalendarPage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const site = await resolveDistrictSiteForRender(districtNumber)
  if (!site) notFound()

  const events = await getDistrictPublicEvents(districtNumber)
  const { title } = site
  const basePath = await getDistrictBasePath(districtNumber)
  const href = (path: string) => districtHref(basePath, path)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-surface-accent p-6 shadow-sm lg:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/[0.03]" />
        <div className="absolute right-0 top-0 h-12 w-12 bg-gradient-to-bl from-primary/5 to-transparent" />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Events</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight [font-family:var(--font-district-display)]">
            {title} Calendar
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Upcoming district events and activities.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            {events.length} event{events.length !== 1 ? "s" : ""} posted
          </div>
        </div>
      </section>

      {/* Events List */}
      <section className="rounded-xl border border-border/50 bg-card shadow-sm">
        {events.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={CalendarDays}
              title="No events scheduled"
              description="Check back soon for district meetings, workshops, and service events."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {events.map((event, index) => {
              const dateBadge = formatDateBadge(event.date)
              return (
                <li
                  key={event.id}
                  className="group px-5 py-5 transition-colors hover:bg-muted/30 lg:px-6"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex gap-5">
                    {/* Date badge */}
                    <div className="hidden shrink-0 sm:block">
                      <div className="flex h-16 w-16 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <span className="text-[10px] font-semibold uppercase tracking-wide">{dateBadge.month}</span>
                        <span className="text-2xl font-bold [font-family:var(--font-district-display)]">{dateBadge.day}</span>
                      </div>
                    </div>

                    {/* Event content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h2 className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                            {event.title}
                          </h2>
                          
                          {/* Mobile date */}
                          <p className="mt-1 text-sm text-muted-foreground sm:hidden">
                            {dateBadge.full}
                          </p>
                        </div>

                        {/* Time badge */}
                        {(event.startTime || event.timeTBD) && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {event.timeTBD ? "Time TBD" : formatTimeRange(event.startTime, event.endTime)}
                          </span>
                        )}
                      </div>

                      {/* Location */}
                      {event.address && (
                        <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
                          <span>{event.address}</span>
                        </p>
                      )}

                      {/* Description */}
                      {event.description && (
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground/90">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Footer link */}
      <p className="text-sm text-muted-foreground">
        Need committee updates?{" "}
        <Link
          href={href("/updates")}
          className="inline-flex items-center gap-1 font-medium text-primary transition-colors hover:text-primary/80"
        >
          View agenda notes
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </div>
  )
}

// Empty State Component
function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
