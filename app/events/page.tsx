import { Suspense } from "react"
import { getDb } from "@/lib/db"
import { events, eventToTypes, eventFlyers, eventExceptions, type EventType, type EventFlyer, type EventException } from "@/lib/db/schema"
import { eq, asc, gt, gte, and, or, isNull, inArray } from "drizzle-orm"
import { EventsClient } from "./events-client"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { getEventsForDateRange } from "@/lib/utils/event-queries"
import type { EventWithRelations } from "@/lib/types/recurrence"

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

  // Get approved events including recurring events
  // For recurring events, we need to look back to find events that may have
  // started in the past but have occurrences in the future
  const eventsData = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.status, "approved"),
        or(
          // Non-recurring events: date/endDate in the future
          and(
            eq(events.isRecurring, false),
            or(
              gt(events.endDate, yesterdayStr), // Multi-day: endDate > yesterday
              and(isNull(events.endDate), gt(events.date, yesterdayStr)) // Single day: date > yesterday
            )
          ),
          // Recurring events: recurUntil is in the future (or null = no end)
          and(
            eq(events.isRecurring, true),
            or(
              isNull(events.recurUntil),
              gte(events.recurUntil, todayStr)
            )
          )
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

  // Get all exceptions for recurring events
  const recurringEventIds = eventsData.filter((e) => e.isRecurring).map((e) => e.id)
  const exceptionsMap = new Map<string, EventException[]>()
  
  if (recurringEventIds.length > 0) {
    const exceptionsData = await db
      .select()
      .from(eventExceptions)
      .where(inArray(eventExceptions.eventId, recurringEventIds))

    for (const row of exceptionsData) {
      const existing = exceptionsMap.get(row.eventId) || []
      existing.push(row)
      exceptionsMap.set(row.eventId, existing)
    }
  }

  // Build EventWithRelations array
  const eventsWithRelations: EventWithRelations[] = eventsData.map((event) => ({
    ...event,
    types: typesMap.get(event.id) || (event.type ? [event.type] : []),
    flyers: flyersMap.get(event.id) || [],
    exceptions: exceptionsMap.get(event.id) || [],
  }))

  // Generate display events for the next year
  const rangeStart = new Date(todayStr)
  rangeStart.setDate(rangeStart.getDate() - 1) // Include today
  const rangeEnd = new Date(todayStr)
  rangeEnd.setFullYear(rangeEnd.getFullYear() + 1)

  return getEventsForDateRange(eventsWithRelations, rangeStart, rangeEnd)
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
