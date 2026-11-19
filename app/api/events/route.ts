import { parseLocalDate, formatDate } from "@/lib/utils/recurrence"
import { recurringOverlapsStart, startsBeforeHorizon } from "@/lib/events/recurring-window"
import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import {
  events,
} from "@/lib/db/schema"
import { eq, asc, gt, and, or, isNull } from "drizzle-orm"
import { getEventsForDateRange } from "@/lib/utils/event-queries"
import { APPROVED_EVENTS_CACHE_KEY } from "@/lib/utils/event-cache"
import type { DisplayEvent } from "@/lib/types/recurrence"
import { withEdgeCache } from "@/lib/cache/edge-cache"
import { createRequestLogger } from "@/lib/logger"
import { recordError } from "@/lib/monitoring/errors"
import { loadEventRelations } from "@/lib/events/load-event-relations"
import { createApiErrorResponse } from "@/lib/api/error-response"

const CACHE_TTL = 60 * 5 // 5 minutes

function parseDistrictParam(value: string | null): number | null {
  if (!value) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

async function buildApprovedEvents(
  log: ReturnType<typeof createRequestLogger>,
  districtNumber: number | null
): Promise<DisplayEvent[]> {
  const db = await log.tracker.time("db.connect", () => getDb())

  // Get today's date in Central time (Area 36 is in Minnesota)
  const now = new Date()
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })

  const rangeEnd = parseLocalDate(todayStr)
  rangeEnd.setFullYear(rangeEnd.getFullYear() + 1)
  const baseWhere = [
    eq(events.status, "approved"),
    startsBeforeHorizon(formatDate(rangeEnd)),
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
        recurringOverlapsStart(todayStr)
      )
    ),
  ]
  if (districtNumber !== null) {
    baseWhere.push(eq(events.districtNumber, districtNumber))
  }

  const eventsData = await log.tracker.time("db.events", () =>
    db
      .select()
      .from(events)
      .where(and(...baseWhere))
      .orderBy(asc(events.date))
  )

  const recurringEventIds = eventsData.filter((e) => e.isRecurring).map((e) => e.id)
  const eventsWithRelations = await loadEventRelations(db, eventsData, log)

  const rangeStart = parseLocalDate(todayStr)
  rangeStart.setDate(rangeStart.getDate() - 1)

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

export async function GET(request: Request) {
  const log = createRequestLogger("/api/events", "GET")
  const districtNumber = parseDistrictParam(new URL(request.url).searchParams.get("district"))

  try {
    const cacheKey = districtNumber ? `${APPROVED_EVENTS_CACHE_KEY}:district:${districtNumber}` : APPROVED_EVENTS_CACHE_KEY
    const { data, status } = await withEdgeCache(
      cacheKey,
      () => buildApprovedEvents(log, districtNumber),
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
        // Every read must reach the Worker, which selects the current public DTO cache namespace.
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Cloudflare-CDN-Cache-Control": "no-store",
      },
    })
  } catch (error) {
    log.error("Events API failed")
    void recordError({
      kind: "D1_QUERY_FAILED",
      route: "/api/events",
      error,
      messageOverride: "Events API failed",
    })
    log.tracker.finish(500)

    return createApiErrorResponse({
      message: "Events are temporarily unavailable.",
      requestId: log.requestId,
    })
  }
}
