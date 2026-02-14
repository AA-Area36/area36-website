import Link from "next/link"
import { ArrowRight, CalendarDays, ExternalLink, MapPin, NotebookText, Search, UsersRound } from "lucide-react"
import { notFound } from "next/navigation"
import {
  getDistrictPublicEvents,
  getDistrictContacts,
  getDistrictPositions,
  getDistrictPublishedUpdates,
  getDistrictSiteConfig,
} from "@/lib/district/queries"
import { districtDirectory } from "@/lib/constants/district-directory"
import {
  coerceDistrict,
  districtHref,
  extractFirstUrl,
  formatDistrictDate,
  getAgendaDocumentLink,
  getDistrictBasePath,
  MEETING_FINDER_URL,
  NEW_TO_AA_URL,
  resolveDistrictSiteForRender,
} from "./district-utils"

export const dynamic = "force-dynamic"

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const
const LOCATION_TYPE_LABELS = {
  "in-person": "In person",
  hybrid: "Hybrid",
  online: "Online",
} as const

function ordinal(value: number): string {
  if (value % 100 >= 11 && value % 100 <= 13) return `${value}th`
  if (value % 10 === 1) return `${value}st`
  if (value % 10 === 2) return `${value}nd`
  if (value % 10 === 3) return `${value}rd`
  return `${value}th`
}

function formatMeetingTime(value: string | null | undefined): string | null {
  if (!value) return null
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return value
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const period = hours >= 12 ? "PM" : "AM"
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12
  return `${twelveHour}:${String(minutes).padStart(2, "0")} ${period}`
}

export default async function DistrictHomePage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const site = await resolveDistrictSiteForRender(districtNumber)
  if (!site) notFound()

  const [events, contacts, positions, updates, siteConfig] = await Promise.all([
    getDistrictPublicEvents(districtNumber),
    getDistrictContacts(districtNumber),
    getDistrictPositions(districtNumber),
    getDistrictPublishedUpdates(districtNumber),
    getDistrictSiteConfig(districtNumber),
  ])

  const nextEvents = events.slice(0, 6)
  const activeContacts = contacts.filter((contact) => contact.active)
  const chairs = activeContacts.filter((contact) => contact.category === "chair").slice(0, 5)
  const officers = activeContacts.filter((contact) => contact.category === "officer").slice(0, 3)
  const featuredContacts = chairs.length > 0 ? chairs : officers
  const openPositions = positions.filter((position) => position.status === "open").slice(0, 4)
  const latestUpdates = updates.slice(0, 3)

  const { title } = site
  const basePath = await getDistrictBasePath(districtNumber)
  const href = (path: string) => districtHref(basePath, path)
  const directoryEntry = districtDirectory.find((entry) => entry.number === districtNumber)
  const monthlyMeetingOnlineLink =
    siteConfig?.meetingLink ??
    extractFirstUrl(`${directoryEntry?.meetingLocation ?? ""} ${directoryEntry?.meetingNote ?? ""}`)
  const monthlyMeetingId = siteConfig?.meetingId?.trim() || null
  const monthlyMeetingPasscode = siteConfig?.meetingPasscode?.trim() || null
  const monthlyMeetingMapLink = siteConfig?.meetingAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteConfig.meetingAddress)}`
    : directoryEntry?.meetingAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directoryEntry.meetingAddress)}`
      : null

  const monthlyRecurrence =
    siteConfig?.meetingRecurrenceMode === "day_of_month"
      ? siteConfig.meetingDayOfMonth
        ? `Every month on the ${ordinal(siteConfig.meetingDayOfMonth)}`
        : null
      : siteConfig?.meetingWeekOfMonth && typeof siteConfig?.meetingWeekday === "number"
        ? `Every ${ordinal(siteConfig.meetingWeekOfMonth)} ${WEEKDAY_LABELS[siteConfig.meetingWeekday] ?? "weekday"}`
        : null
  const fallbackRecurrence = directoryEntry?.meetingDay ?? null
  const monthlyWhen = monthlyRecurrence ?? fallbackRecurrence

  const monthlyTime = formatMeetingTime(siteConfig?.meetingTime) ?? directoryEntry?.meetingTime ?? null
  const monthlyLocationName = siteConfig?.meetingLocationName ?? directoryEntry?.meetingLocation ?? null
  const monthlyAddress = siteConfig?.meetingAddress ?? directoryEntry?.meetingAddress ?? null
  const monthlyLocationType =
    siteConfig?.meetingLocationType ??
    (directoryEntry?.meetingLocation?.toLowerCase().includes("zoom") ? "online" : "in-person")
  const monthlyContactForDetails = siteConfig?.meetingContactForDetails ?? false
  const monthlyExtraNote =
    directoryEntry?.meetingNote && !directoryEntry.meetingNote.match(/contact dcm for location/i)
      ? directoryEntry.meetingNote
      : null
  const isInPersonMeeting = monthlyLocationType === "in-person"
  const isOnlineMeeting = monthlyLocationType === "online"
  const isHybridMeeting = monthlyLocationType === "hybrid"
  const showLocationDetails = !monthlyContactForDetails && (isInPersonMeeting || isHybridMeeting)
  const showOnlineDetails = !monthlyContactForDetails && (isOnlineMeeting || isHybridMeeting)

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">District Home</p>
            <h1 className="mt-2 text-3xl font-semibold [font-family:var(--font-district-display)] lg:text-4xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground lg:text-base">
              Primary tools for district members: events, chair contacts, and agenda notes. Meeting search for newcomers is
              available as a secondary resource.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={href("/calendar")} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                View Events
              </Link>
              <Link href={href("/contacts")} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                Contact Chairs
              </Link>
              <Link href={href("/updates")} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                Agenda Notes
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:col-span-4">
            <StatBox label="Upcoming events" value={events.length} />
            <StatBox label="Active chairs" value={chairs.length} />
            <StatBox label="Agenda notes" value={updates.length} />
            <StatBox label="Open positions" value={openPositions.length} />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-primary/25 bg-card">
        <div className="border-b border-primary/15 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5 lg:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/80">Monthly District Meeting</p>
          <h2 className="mt-1 text-2xl font-semibold [font-family:var(--font-district-display)]">Meeting Time & Access</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Central monthly meeting details for district members and trusted servants.
          </p>
        </div>

        {monthlyWhen || monthlyTime || monthlyLocationName || monthlyAddress || monthlyContactForDetails ? (
          <div className="space-y-3 p-6 lg:p-7">
            <div className="rounded-xl border border-border bg-background/90 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Schedule</p>
              <p className="mt-2 text-lg font-semibold">
                {monthlyWhen ?? "Schedule not posted"}
                {monthlyTime ? ` at ${monthlyTime}` : ""}
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-background/90 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {LOCATION_TYPE_LABELS[monthlyLocationType as keyof typeof LOCATION_TYPE_LABELS] ?? "In person"}
              </p>

              {monthlyContactForDetails ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Meeting Details</p>
                  <Link
                    href={href("/contacts")}
                    className="mt-2 inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Contact DCM
                  </Link>
                </div>
              ) : (
                <>
                  {showLocationDetails && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
                      <p className="mt-2 font-medium">{monthlyLocationName ?? "Location not posted"}</p>
                      {monthlyAddress && <p className="mt-1 text-sm text-muted-foreground">{monthlyAddress}</p>}
                      {monthlyMeetingMapLink && (
                        <a
                          href={monthlyMeetingMapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <MapPin className="h-4 w-4" />
                          Get Directions
                        </a>
                      )}
                    </div>
                  )}

                  {showOnlineDetails && (
                    <div className={showLocationDetails ? "mt-3 border-t border-border pt-3" : ""}>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Online Access</p>
                      {monthlyMeetingOnlineLink && (
                        <a
                          href={monthlyMeetingOnlineLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          Join Online Meeting
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}

                      {(monthlyMeetingId || monthlyMeetingPasscode) && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Meeting ID</p>
                            <p className="mt-1 text-sm font-medium">{monthlyMeetingId ?? "Not posted"}</p>
                          </div>
                          <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Passcode</p>
                            <p className="mt-1 text-sm font-medium">{monthlyMeetingPasscode ?? "Not posted"}</p>
                          </div>
                        </div>
                      )}

                      {!monthlyMeetingOnlineLink && !monthlyMeetingId && !monthlyMeetingPasscode && (
                        <p className="mt-2 text-sm text-muted-foreground">Contact DCM for current online access details.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {monthlyExtraNote && (
              <p className="rounded-xl border border-border bg-background/90 px-4 py-3 text-sm text-muted-foreground">{monthlyExtraNote}</p>
            )}
          </div>
        ) : (
          <p className="px-6 py-6 text-sm text-muted-foreground lg:px-7">Monthly meeting details have not been posted yet.</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-border bg-card p-6 lg:col-span-8 lg:p-7">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold [font-family:var(--font-district-display)]">Upcoming Events</h2>
            <Link href={href("/calendar")} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              All events
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {nextEvents.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-7 text-sm text-muted-foreground">No events posted yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-background">
              {nextEvents.map((event) => (
                <li key={event.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{event.title}</p>
                      {event.address && <p className="text-sm text-muted-foreground">{event.address}</p>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDistrictDate(event.date)}
                      {event.startTime ? ` • ${event.startTime}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-6 lg:col-span-4">
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold [font-family:var(--font-district-display)]">Find a Meeting</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">For newcomers, start with these links.</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href={MEETING_FINDER_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                  Find a Meeting
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
              <li>
                <a href={NEW_TO_AA_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                  NewToAA.org
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold [font-family:var(--font-district-display)]">Open Service Positions</h2>
            </div>
            {openPositions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No open positions listed.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {openPositions.map((position) => (
                  <li key={position.id} className="rounded-lg border border-border bg-background px-3 py-2">{position.title}</li>
                ))}
              </ul>
            )}
            <Link href={href("/positions")} className="mt-3 inline-block text-sm text-primary hover:underline">View all positions</Link>
          </section>
        </aside>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 lg:p-7">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-xl font-semibold [font-family:var(--font-district-display)]">
              <UsersRound className="h-4 w-4 text-primary" />
              Chairs & Contacts
            </h2>
            <Link href={href("/contacts")} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Directory
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {featuredContacts.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No contacts listed yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {featuredContacts.map((contact) => (
                <li key={contact.id} className="rounded-lg border border-border bg-background px-4 py-3">
                  <p className="font-medium">{contact.role}</p>
                  {contact.name && <p className="text-sm text-muted-foreground">{contact.name}</p>}
                  {contact.email && <a href={`mailto:${contact.email}`} className="text-sm text-primary hover:underline">{contact.email}</a>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 lg:p-7">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-xl font-semibold [font-family:var(--font-district-display)]">
              <NotebookText className="h-4 w-4 text-primary" />
              Agenda Notes
            </h2>
            <Link href={href("/updates")} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              All notes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {latestUpdates.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No agenda notes published yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {latestUpdates.map((note) => {
                const documentLink = getAgendaDocumentLink(note.body)
                return (
                  <li key={note.id} className="rounded-lg border border-border bg-background px-4 py-3">
                    <p className="font-medium">{note.title}</p>
                    {note.committee && <p className="text-xs uppercase tracking-wide text-muted-foreground">{note.committee}</p>}
                    {documentLink ? (
                      <a href={documentLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        Open agenda document
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">Document link not provided.</p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
