import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import {
  events,
  eventToTypes,
  eventFlyers,
  eventExceptions,
  eventTypes as allowedEventTypes,
  type EventType,
  type EventFlyer,
  type EventException,
} from "@/lib/db/schema"
import { eq, inArray } from "drizzle-orm"
import { getEventsForDateRange } from "@/lib/utils/event-queries"
import type { EventWithRelations, DisplayEvent } from "@/lib/types/recurrence"
import { createRequestLogger } from "@/lib/logger"
import { recordError } from "@/lib/monitoring/errors"

const PAGE_SIZE_DEFAULT = 5
const PAGE_SIZE_MAX = 50

function eventSortKey(e: DisplayEvent): string {
  const t = e.startTime ?? "00:00"
  return `${e.date}T${t}|${e.id}`
}

function isYmd(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function dateStart(ymd: string): Date {
  return new Date(`${ymd}T00:00:00`)
}

function dateEnd(ymd: string): Date {
  return new Date(`${ymd}T23:59:59`)
}

export async function GET(request: Request) {
  const log = createRequestLogger("/api/events/past", "GET")

  try {
    const url = new URL(request.url)
    const cursor = url.searchParams.get("cursor") || null
    const q = url.searchParams.get("q") || ""
    const qLower = q.trim().toLowerCase()
    const typesParam = url.searchParams.get("types") || ""
    const typesFilter = typesParam
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t): t is EventType => (allowedEventTypes as readonly string[]).includes(t))
    const fromStr = isYmd(url.searchParams.get("from")) ? url.searchParams.get("from") : null
    const toStr = isYmd(url.searchParams.get("to")) ? url.searchParams.get("to") : null

    const requestedLimit = Number(url.searchParams.get("limit") || PAGE_SIZE_DEFAULT)
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(1, requestedLimit), PAGE_SIZE_MAX)
      : PAGE_SIZE_DEFAULT

    // Central time, because Area 36 events are in Minnesota.
    const now = new Date()
    const todayStr = now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })
    const hardRangeEndStr = toStr && toStr < todayStr ? toStr : todayStr
    const cursorDay = cursor ? cursor.substring(0, 10) : null
    const rangeEndStr = cursorDay && cursorDay < hardRangeEndStr ? cursorDay : hardRangeEndStr

    const db = await log.tracker.time("db.connect", () => getDb())

    // Fetch approved base events + relations once; occurrences are generated per-request based on date window.
    const eventsData = await log.tracker.time("db.events", () =>
      db.select().from(events).where(eq(events.status, "approved"))
    )

    const eventTypesData = await log.tracker.time("db.eventTypes", () => db.select().from(eventToTypes))
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

    const rangeEnd = dateEnd(rangeEndStr)

    let yearsBack = 2
    let filteredSorted: DisplayEvent[] = []
    while (true) {
      const rangeStart = fromStr
        ? dateStart(fromStr)
        : (() => {
            const d = dateStart(rangeEndStr)
            d.setFullYear(d.getFullYear() - yearsBack)
            return d
          })()

      const displayEvents = getEventsForDateRange(eventsWithRelations, rangeStart, rangeEnd)

      const filtered = displayEvents.filter((e) => {
        // Only include events that have fully ended before today.
        const eventEnd = e.endDate || e.date
        if (eventEnd >= todayStr) return false

        // Date range filter (based on event/occurrence start date, like the main Events filters).
        if (fromStr && e.date < fromStr) return false
        if (toStr && e.date > toStr) return false

        // Type filter.
        if (typesFilter.length > 0 && !e.types.some((t) => typesFilter.includes(t))) return false

        // Search filter.
        if (qLower) {
          const hay = `${e.title}\n${e.description}\n${e.address ?? ""}\n${e.meetingLink ?? ""}`.toLowerCase()
          if (!hay.includes(qLower)) return false
        }

        // Cursor filter (older than last item on previous page).
        if (cursor && eventSortKey(e) >= cursor) return false

        // First page: most recent fully-ended events.
        return true
      })

      filtered.sort((a, b) => eventSortKey(b).localeCompare(eventSortKey(a)))
      filteredSorted = filtered

      // If we can satisfy this page (and still know there's a next), stop expanding.
      if (filteredSorted.length >= limit + 1) break
      if (fromStr) break
      if (yearsBack >= 10) break
      yearsBack += 2
    }

    const page = filteredSorted.slice(0, limit)
    const nextCursor = filteredSorted.length > limit && page.length > 0 ? eventSortKey(page[page.length - 1]) : null

    log.tracker.finish(200)
    return NextResponse.json(
      { events: page, nextCursor },
      {
        headers: {
          "X-Request-Id": log.requestId,
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (error) {
    log.error("Past events API failed", error)
    void recordError({ kind: "D1_QUERY_FAILED", route: "/api/events/past", error })
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
