import { Suspense } from "react"
import { getDb } from "@/lib/db"
import { events, eventToTypes, eventFlyers, type EventType, type EventFlyer } from "@/lib/db/schema"
import { eq, asc, gt, and, or, isNull } from "drizzle-orm"
import { EventsClient } from "./events-client"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"

export const dynamic = "force-dynamic"

async function getApprovedEvents() {
  const db = await getDb()
  // Get today's date in Central time (Area 36 is in Minnesota)
  // This ensures events are shown until the end of the day in their local timezone
  const now = new Date()
  // Format as YYYY-MM-DD in Central time
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })
  
  // Get yesterday for the comparison (events ending yesterday should be hidden)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })

  // Get approved events
  const eventsData = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.status, "approved"),
        or(
          gt(events.endDate, yesterdayStr), // Multi-day: endDate > yesterday (includes today)
          and(isNull(events.endDate), gt(events.date, yesterdayStr)) // Single day: date > yesterday
        )
      )
    )
    .orderBy(asc(events.date))

  // Get all event types from junction table
  const eventTypesData = await db
    .select()
    .from(eventToTypes)
  
  // Create a map of eventId -> types array
  const typesMap = new Map<string, EventType[]>()
  for (const row of eventTypesData) {
    const existing = typesMap.get(row.eventId) || []
    existing.push(row.type)
    typesMap.set(row.eventId, existing)
  }

  // Get all event flyers
  const flyersData = await db
    .select()
    .from(eventFlyers)
    .orderBy(eventFlyers.order)
  
  // Create a map of eventId -> flyers array
  const flyersMap = new Map<string, EventFlyer[]>()
  for (const row of flyersData) {
    const existing = flyersMap.get(row.eventId) || []
    existing.push(row)
    flyersMap.set(row.eventId, existing)
  }

  // Merge types and flyers into events
  // If event has types in junction table, use those; otherwise fall back to legacy `type` column
  return eventsData.map((event) => ({
    ...event,
    types: typesMap.get(event.id) || (event.type ? [event.type] : []),
    flyers: flyersMap.get(event.id) || [],
  }))
}

export default async function EventsPage() {
  const approvedEvents = await getApprovedEvents()

  return (
    <ReCaptchaProvider>
      <Suspense fallback={<EventsLoading />}>
        <EventsClient events={approvedEvents} />
      </Suspense>
    </ReCaptchaProvider>
  )
}

function EventsLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading events...</div>
    </div>
  )
}
