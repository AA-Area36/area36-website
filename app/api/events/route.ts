import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import {
  events,
  eventToTypes,
  eventFlyers,
  eventExceptions,
  type EventType,
  type EventFlyer,
  type EventException,
} from "@/lib/db/schema"
import { eq, asc, gt, gte, and, or, isNull, inArray } from "drizzle-orm"
import { getEventsForDateRange } from "@/lib/utils/event-queries"
import type { EventWithRelations, DisplayEvent } from "@/lib/types/recurrence"
import { withEdgeCache } from "@/lib/cache/edge-cache"
import { createRequestLogger } from "@/lib/logger"

const CACHE_KEY = "events:approved"
const CACHE_TTL = 60 * 5 // 5 minutes

async function buildApprovedEvents(log: ReturnType<typeof createRequestLogger>): Promise<DisplayEvent[]> {
  const db = await log.tracker.time("db.connect", () => getDb())

  // Get today's date in Central time (Area 36 is in Minnesota)
  const now = new Date()
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })

  const eventsData = await log.tracker.time("db.events", () =>
    db
      .select()
      .from(events)
      .where(
        and(
          eq(events.status, "approved"),
          or(
            and(
              eq(events.isRecurring, false),
              or(
                gt(events.endDate, yesterdayStr),
                and(isNull(events.endDate), gt(events.date, yesterdayStr))
              )
            ),
            and(
              eq(events.isRecurring, true),
              or(isNull(events.recurUntil), gte(events.recurUntil, todayStr))
            )
          )
        )
      )
      .orderBy(asc(events.date))
  )

  const eventTypesData = await log.tracker.time("db.eventTypes", () =>
    db.select().from(eventToTypes)
  )

  const typesMap = new Map<string, EventType[]>()
  for (const row of eventTypesData) {
    const existing = typesMap.get(row.eventId) || []
    existing.push(row.type)
    typesMap.set(row.eventId, existing)
  }

  const flyersData = await log.tracker.time("db.flyers", () =>
    db.select().from(eventFlyers).orderBy(eventFlyers.order)
  )

  const flyersMap = new Map<string, EventFlyer[]>()
  for (const row of flyersData) {
    const existing = flyersMap.get(row.eventId) || []
    existing.push(row)
    flyersMap.set(row.eventId, existing)
  }

  const recurringEventIds = eventsData.filter((e) => e.isRecurring).map((e) => e.id)
  const exceptionsMap = new Map<string, EventException[]>()
  if (recurringEventIds.length > 0) {
    const exceptionsData = await log.tracker.time("db.exceptions", () =>
      db
        .select()
        .from(eventExceptions)
        .where(inArray(eventExceptions.eventId, recurringEventIds))
    )

    for (const row of exceptionsData) {
      const existing = exceptionsMap.get(row.eventId) || []
      existing.push(row)
      exceptionsMap.set(row.eventId, existing)
    }
  }

  const eventsWithRelations: EventWithRelations[] = eventsData.map((event) => ({
    ...event,
    types: typesMap.get(event.id) || (event.type ? [event.type] : []),
    flyers: flyersMap.get(event.id) || [],
    exceptions: exceptionsMap.get(event.id) || [],
  }))

  const rangeStart = new Date(todayStr)
  rangeStart.setDate(rangeStart.getDate() - 1)
  const rangeEnd = new Date(todayStr)
  rangeEnd.setFullYear(rangeEnd.getFullYear() + 1)

  const endOp = log.tracker.startOperation("events.range")
  const displayEvents = getEventsForDateRange(eventsWithRelations, rangeStart, rangeEnd)
  endOp()

  log.info("Events built", {
    eventCount: displayEvents.length,
    baseEvents: eventsData.length,
    recurringEvents: recurringEventIds.length,
  })

  return displayEvents
}

export async function GET() {
  const log = createRequestLogger("/api/events", "GET")

  try {
    const { data, status } = await withEdgeCache(
      CACHE_KEY,
      () => buildApprovedEvents(log),
      { ttl: CACHE_TTL }
    )

    log.info("Events cache response", {
      cacheStatus: status,
      eventCount: data.length,
    })
    log.tracker.finish(200)

    return NextResponse.json(data, {
      headers: {
        "X-Request-Id": log.requestId,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    })
  } catch (error) {
    log.error("Events API failed", error)
    log.tracker.finish(500)

    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: message },
      {
        status: 500,
        headers: { "X-Request-Id": log.requestId },
      }
    )
  }
}
