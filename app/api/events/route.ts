import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import {
  events,
} from "@/lib/db/schema"
import { eq, asc, gt, gte, and, or, isNull } from "drizzle-orm"
import { getEventsForDateRange } from "@/lib/utils/event-queries"
import type { DisplayEvent } from "@/lib/types/recurrence"
import { withEdgeCache } from "@/lib/cache/edge-cache"
import { createRequestLogger } from "@/lib/logger"
import { recordError } from "@/lib/monitoring/errors"
import { loadEventRelations } from "@/lib/events/load-event-relations"

const CACHE_KEY_BASE = "events:approved"
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

  const baseWhere = [
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

export async function GET(request: Request) {
  const log = createRequestLogger("/api/events", "GET")
  const districtNumber = parseDistrictParam(new URL(request.url).searchParams.get("district"))

  try {
    const cacheKey = districtNumber ? `${CACHE_KEY_BASE}:district:${districtNumber}` : CACHE_KEY_BASE
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
        // Let the CDN cache, but make the browser revalidate so edits show up quickly on refresh.
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
      },
    })
  } catch (error) {
    log.error("Events API failed", error)
    void recordError({ kind: "D1_QUERY_FAILED", route: "/api/events", error })
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
