import type { DrizzleD1Database } from "drizzle-orm/d1"
import { inArray } from "drizzle-orm"
import {
  eventExceptions,
  eventFlyers,
  eventToTypes,
  type Event,
  type EventException,
  type EventFlyer,
  type EventType,
} from "@/lib/db/schema"
import type * as schema from "@/lib/db/schema"
import type { EventWithRelations } from "@/lib/types/recurrence"
import type { createRequestLogger } from "@/lib/logger"

type Database = DrizzleD1Database<typeof schema>
type RequestLog = ReturnType<typeof createRequestLogger>

/**
 * Loads event relations only for the selected base events. Keeping this query
 * scoped prevents a cache miss on a public event route from reading every
 * relation row in D1.
 */
export async function loadEventRelations(
  db: Database,
  eventRows: Event[],
  log: RequestLog
): Promise<EventWithRelations[]> {
  if (eventRows.length === 0) return []

  const eventIds = eventRows.map((event) => event.id)
  const recurringEventIds = eventRows.filter((event) => event.isRecurring).map((event) => event.id)

  const [eventTypesData, flyersData, exceptionsData] = await Promise.all([
    log.tracker.time("db.eventTypes", () =>
      db.select().from(eventToTypes).where(inArray(eventToTypes.eventId, eventIds))
    ),
    log.tracker.time("db.flyers", () =>
      db
        .select()
        .from(eventFlyers)
        .where(inArray(eventFlyers.eventId, eventIds))
        .orderBy(eventFlyers.order)
    ),
    recurringEventIds.length > 0
      ? log.tracker.time("db.exceptions", () =>
          db
            .select()
            .from(eventExceptions)
            .where(inArray(eventExceptions.eventId, recurringEventIds))
        )
      : Promise.resolve([]),
  ])

  const typesMap = new Map<string, EventType[]>()
  for (const row of eventTypesData) {
    const existing = typesMap.get(row.eventId) || []
    existing.push(row.type)
    typesMap.set(row.eventId, existing)
  }

  const flyersMap = new Map<string, EventFlyer[]>()
  for (const row of flyersData) {
    const existing = flyersMap.get(row.eventId) || []
    existing.push(row)
    flyersMap.set(row.eventId, existing)
  }

  const exceptionsMap = new Map<string, EventException[]>()
  for (const row of exceptionsData) {
    const existing = exceptionsMap.get(row.eventId) || []
    existing.push(row)
    exceptionsMap.set(row.eventId, existing)
  }

  return eventRows.map((event) => ({
    ...event,
    types: typesMap.get(event.id) || (event.type ? [event.type] : []),
    flyers: flyersMap.get(event.id) || [],
    exceptions: exceptionsMap.get(event.id) || [],
  }))
}
