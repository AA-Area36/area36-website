import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import {
  events,
  eventTypes as allowedEventTypes,
  type EventType,
} from "@/lib/db/schema"
import { and, eq, gte, isNull, lte, or } from "drizzle-orm"
import { getEventsForDateRange } from "@/lib/utils/event-queries"
import type { DisplayEvent } from "@/lib/types/recurrence"
import { createRequestLogger } from "@/lib/logger"
import { recordError } from "@/lib/monitoring/errors"
import { loadEventRelations } from "@/lib/events/load-event-relations"
import { getPastEventCandidateStart } from "@/lib/utils/event-query-window"
import { createApiErrorResponse } from "@/lib/api/error-response"

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
    const candidateStartStr = getPastEventCandidateStart(rangeEndStr, fromStr)

    const db = await log.tracker.time("db.connect", () => getDb())

    // Bound the D1 candidate set before recurrence expansion. A base event can
    // contribute if it starts by the window end and either starts or continues
    // into the window.
    const eventsData = await log.tracker.time("db.events", () =>
      db
        .select()
        .from(events)
        .where(
          and(
            eq(events.status, "approved"),
            lte(events.date, rangeEndStr),
            or(
              and(
                eq(events.isRecurring, false),
                or(gte(events.date, candidateStartStr), gte(events.endDate, candidateStartStr))
              ),
              and(
                eq(events.isRecurring, true),
                or(isNull(events.recurUntil), gte(events.recurUntil, candidateStartStr))
              )
            )
          )
        )
    )

    const eventsWithRelations = await loadEventRelations(db, eventsData, log)

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
    log.error("Past events API failed")
    void recordError({
      kind: "D1_QUERY_FAILED",
      route: "/api/events/past",
      error,
      messageOverride: "Past events API failed",
    })
    log.tracker.finish(500)

    return createApiErrorResponse({
      message: "Past events are temporarily unavailable.",
      requestId: log.requestId,
    })
  }
}
