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

// D1 allows at most 100 bound parameters per statement. Process each relation
// in sequential batches; the three relation loaders together use at most three
// concurrent queries, regardless of the number of selected events.
async function loadInBatches<T>(ids: string[], query: (batch: string[]) => PromiseLike<T[]>): Promise<T[]> {
  const rows: T[] = []
  const uniqueIds = [...new Set(ids)]
  for (let offset = 0; offset < uniqueIds.length; offset += 100) {
    rows.push(...await query(uniqueIds.slice(offset, offset + 100)))
  }
  return rows
}

/**
 * Loads event relations only for the selected base events. Keeping this query
 * scoped prevents a cache miss on a public event route from reading every
 * relation row in D1.
 */
export async function loadEventRelations(
  db: Database,
  eventRows: Event[],
  log?: RequestLog
): Promise<EventWithRelations[]> {
  if (eventRows.length === 0) return []
  const time = <T>(name: string, operation: () => Promise<T>) =>
    log ? log.tracker.time(name, operation) : operation()

  const eventIds = eventRows.map((event) => event.id)
  const recurringEventIds = eventRows.filter((event) => event.isRecurring).map((event) => event.id)

  const [eventTypesData, flyersData, exceptionsData] = await Promise.all([
    time("db.eventTypes", () =>
      loadInBatches(eventIds, (batch) =>
        db.select().from(eventToTypes).where(inArray(eventToTypes.eventId, batch))
      )
    ),
    time("db.flyers", () =>
      loadInBatches(eventIds, (batch) =>
        db.select().from(eventFlyers)
          .where(inArray(eventFlyers.eventId, batch))
          .orderBy(eventFlyers.order)
      )
    ),
    recurringEventIds.length > 0
      ? time("db.exceptions", () =>
          loadEventExceptions(db, recurringEventIds)
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

/** The calendar feed needs exceptions without fetching unrelated types and flyers. */
export function loadEventExceptions(db: Database, eventIds: string[]): Promise<EventException[]> {
  return loadInBatches(eventIds, (batch) =>
    db.select().from(eventExceptions).where(inArray(eventExceptions.eventId, batch))
  )
}
