import { getDb } from "@/lib/db"
import { events, eventExceptions, type Event, type EventException } from "@/lib/db/schema"
import { eq, asc, gte, and, or, isNull, inArray } from "drizzle-orm"
import { parseWeeklyPattern, parseMonthlyPattern } from "@/lib/utils/recurrence"
import { withEdgeCache } from "@/lib/cache/edge-cache"
import { createRequestLogger } from "@/lib/logger"
import { recordError } from "@/lib/monitoring/errors"

export const dynamic = "force-dynamic"
const CACHE_KEY = "calendar:ical"
const CACHE_TTL = 60 * 10 // 10 minutes

/**
 * Escape special characters for iCal text fields
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}

/**
 * Format a date and time as iCal DATETIME format
 * Returns format: YYYYMMDDTHHMMSS
 */
function formatICalDateTime(date: string, time: string | null): string {
  // date format: YYYY-MM-DD, time format: HH:MM
  const [year, month, day] = date.split("-")
  // Default to 00:00 if time is not provided (TBD)
  const timeStr = time || "00:00"
  const [hour, minute] = timeStr.split(":")
  return `${year}${month}${day}T${hour}${minute}00`
}

/**
 * Format a date as iCal DATE format (for all-day events)
 * Returns format: YYYYMMDD
 */
function formatICalDate(date: string): string {
  return date.replace(/-/g, "")
}

function addDaysToDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function buildICalTimingLines(input: {
  date: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  timezone: string
  timeTBD: boolean
}): string[] {
  if (input.timeTBD) {
    const result = [`DTSTART;VALUE=DATE:${formatICalDate(input.date)}`]
    if (input.endDate) {
      result.push(`DTEND;VALUE=DATE:${formatICalDate(addDaysToDate(input.endDate, 1))}`)
    }
    return result
  }

  const result = [
    `DTSTART;TZID=${input.timezone}:${formatICalDateTime(input.date, input.startTime)}`,
  ]
  if (input.endTime) {
    const endDate = input.endDate || input.date
    result.push(`DTEND;TZID=${input.timezone}:${formatICalDateTime(endDate, input.endTime)}`)
  } else if (input.endDate) {
    result.push(`DTEND;TZID=${input.timezone}:${formatICalDateTime(input.endDate, "23:59")}`)
  }
  return result
}

/**
 * Generate a unique identifier for an event
 */
function generateUID(eventId: string, domain: string): string {
  return `${eventId}@${domain}`
}

/**
 * Generate a unique identifier for an occurrence of a recurring event
 */
function generateOccurrenceUID(eventId: string, occurrenceDate: string, domain: string): string {
  return `${eventId}_${occurrenceDate}@${domain}`
}

/**
 * Generate iCal RRULE for recurring events
 */
export function generateRRule(event: Event): string | null {
  if (!event.isRecurring || event.recurrenceType === "none") {
    return null
  }

  const dayNames = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]

  if (event.recurrenceType === "weekly") {
    const pattern = parseWeeklyPattern(event.recurrencePattern)
    if (!pattern || pattern.daysOfWeek.length === 0) return null

    const byDay = pattern.daysOfWeek.map((d) => dayNames[d]).join(",")
    let rrule = `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`

    if (event.recurUntil) {
      // UNTIL must be in UTC format: YYYYMMDDTHHMMSSZ
      const untilDate = formatICalDate(event.recurUntil)
      rrule += event.timeTBD ? `;UNTIL=${untilDate}` : `;UNTIL=${untilDate}T235959Z`
    }

    return rrule
  }

  if (event.recurrenceType === "monthly") {
    const pattern = parseMonthlyPattern(event.monthlyPatternType, event.monthlyPatternValue)
    if (!pattern) return null

    let rrule = "RRULE:FREQ=MONTHLY"

    if (pattern.type === "dayOfMonth") {
      rrule += `;BYMONTHDAY=${pattern.dayOfMonth}`
    } else {
      // dayOfWeek pattern: Nth weekday of month
      const weekNum = pattern.weekOfMonth === 5 ? -1 : pattern.weekOfMonth
      rrule += `;BYDAY=${weekNum}${dayNames[pattern.dayOfWeek]}`
    }

    if (event.recurUntil) {
      const untilDate = formatICalDate(event.recurUntil)
      rrule += event.timeTBD ? `;UNTIL=${untilDate}` : `;UNTIL=${untilDate}T235959Z`
    }

    return rrule
  }

  return null
}

/**
 * Generate EXDATE entries for cancelled occurrences
 */
export function generateExDates(
  event: Event,
  exceptions: EventException[]
): string[] {
  const cancelledExceptions = exceptions.filter(
    (e) => e.exceptionType === "cancelled"
  )

  if (cancelledExceptions.length === 0) return []

  return cancelledExceptions.map((exception) => {
    if (event.timeTBD) {
      return `EXDATE;VALUE=DATE:${formatICalDate(exception.occurrenceDate)}`
    }
    const dateTime = formatICalDateTime(exception.occurrenceDate, event.startTime)
    return `EXDATE;TZID=${event.timezone}:${dateTime}`
  })
}

/**
 * Fold long lines according to iCal spec (max 75 octets per line)
 */
function foldLine(line: string): string {
  const maxLength = 75
  if (line.length <= maxLength) {
    return line
  }

  const lines: string[] = []
  let remaining = line

  // First line can be full length
  lines.push(remaining.substring(0, maxLength))
  remaining = remaining.substring(maxLength)

  // Subsequent lines start with a space and can be maxLength - 1
  while (remaining.length > 0) {
    lines.push(" " + remaining.substring(0, maxLength - 1))
    remaining = remaining.substring(maxLength - 1)
  }

  return lines.join("\r\n")
}

async function buildCalendar(
  log: ReturnType<typeof createRequestLogger>,
  requestUrl: string
): Promise<string> {
  const db = await log.tracker.time("db.connect", () => getDb())

  // Get today's date in Central time (Area 36 is in Minnesota)
  const today = new Date()
  const todayStr = today.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })

  // Fetch approved events from today onwards
  // For recurring events, we need events where either:
  // - The recurUntil date is >= today (recurring series still active)
  // - Or it's not recurring and the date/endDate is >= today
  const approvedEvents = await log.tracker.time("db.events", () =>
    db
      .select()
      .from(events)
      .where(
        and(
          eq(events.status, "approved"),
          or(
            // Non-recurring events: standard date check
            and(
              or(eq(events.isRecurring, false), isNull(events.isRecurring)),
              or(
                gte(events.endDate, todayStr),
                and(isNull(events.endDate), gte(events.date, todayStr))
              )
            ),
            // Recurring events: check recurUntil or startDate
            and(
              eq(events.isRecurring, true),
              or(
                gte(events.recurUntil, todayStr),
                and(isNull(events.recurUntil), gte(events.date, todayStr))
              )
            )
          )
        )
      )
      .orderBy(asc(events.date))
  )

  // Get all exceptions for recurring events
  const recurringEventIds = approvedEvents
    .filter((e) => e.isRecurring)
    .map((e) => e.id)

  const allExceptions: EventException[] = recurringEventIds.length > 0
    ? await log.tracker.time("db.exceptions", () =>
        db
          .select()
          .from(eventExceptions)
          .where(inArray(eventExceptions.eventId, recurringEventIds))
      )
    : []

  // Build exception map by event ID
  const exceptionsByEvent = new Map<string, EventException[]>()
  for (const exception of allExceptions) {
    const existing = exceptionsByEvent.get(exception.eventId) || []
    existing.push(exception)
    exceptionsByEvent.set(exception.eventId, existing)
  }

  // Get domain from request for UID generation
  const url = new URL(requestUrl)
  const domain = url.hostname || "area36.org"

  // Build iCal content
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Area 36 Southern Minnesota A.A.//Events Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Area 36 A.A. Events",
    "X-WR-TIMEZONE:America/Chicago",
  ]

  // Add VTIMEZONE for America/Chicago
  lines.push(
    "BEGIN:VTIMEZONE",
    "TZID:America/Chicago",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:-0600",
    "TZOFFSETTO:-0500",
    "TZNAME:CDT",
    "DTSTART:19700308T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0600",
    "TZNAME:CST",
    "DTSTART:19701101T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "END:STANDARD",
    "END:VTIMEZONE"
  )

  // Add each event as a VEVENT
  for (const event of approvedEvents) {
    const uid = generateUID(event.id, domain)
    const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    const eventExceptionsList = exceptionsByEvent.get(event.id) || []

    lines.push("BEGIN:VEVENT")
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${dtstamp}`)

    // Handle start date/time
    lines.push(...buildICalTimingLines(event))

    // Add RRULE for recurring events
    const rrule = generateRRule(event)
    if (rrule) {
      lines.push(rrule)
    }

    // Add EXDATE for cancelled occurrences of recurring events
    const exdates = generateExDates(event, eventExceptionsList)
    for (const exdate of exdates) {
      lines.push(exdate)
    }

    // Summary (title)
    lines.push(foldLine(`SUMMARY:${escapeICalText(event.timeTBD ? `${event.title} (Time TBD)` : event.title)}`))

    // Description
    let description = event.timeTBD ? `Time: TBD\n\n${event.description}` : event.description
    if (event.meetingLink) {
      description += `\\n\\nOnline Meeting Link: ${event.meetingLink}`
    }
    lines.push(foldLine(`DESCRIPTION:${escapeICalText(description)}`))

    // Location
    if (event.address) {
      lines.push(foldLine(`LOCATION:${escapeICalText(event.address)}`))
    } else if (event.locationType === "online" && event.meetingLink) {
      lines.push(foldLine(`LOCATION:${escapeICalText(event.meetingLink)}`))
    }

    // URL for the event (flyer if available)
    if (event.flyerUrl) {
      lines.push(`URL:${event.flyerUrl}`)
    }

    // Categories based on event type
    if (event.type) {
      lines.push(`CATEGORIES:${event.type}`)
    }

    // Status
    lines.push("STATUS:CONFIRMED")

    lines.push("END:VEVENT")

    // Add separate VEVENT entries for modified occurrences (with RECURRENCE-ID)
    const modifiedExceptions = eventExceptionsList.filter(
      (e) => e.exceptionType === "modified"
    )
    for (const exception of modifiedExceptions) {
      const occurrenceUid = generateOccurrenceUID(event.id, exception.occurrenceDate, domain)
      const recurrenceId = event.timeTBD
        ? formatICalDate(exception.occurrenceDate)
        : formatICalDateTime(exception.occurrenceDate, event.startTime)

      lines.push("BEGIN:VEVENT")
      lines.push(`UID:${uid}`) // Same UID as parent event
      lines.push(`DTSTAMP:${dtstamp}`)
      lines.push(
        event.timeTBD
          ? `RECURRENCE-ID;VALUE=DATE:${recurrenceId}`
          : `RECURRENCE-ID;TZID=${event.timezone}:${recurrenceId}`
      )

      // Use exception values if provided, otherwise fall back to parent event
      const modTitle = exception.title || event.title
      const modStartTime = exception.startTime ?? event.startTime
      const modEndTime = exception.endTime ?? event.endTime
      const modEndDate = exception.endDate || event.endDate
      const modAddress = exception.address ?? event.address
      const modMeetingLink = exception.meetingLink ?? event.meetingLink
      const modDescription = exception.description || event.description
      const modLocationType = exception.locationType || event.locationType
      const modTimeTBD = exception.timeTBD ?? event.timeTBD

      // Start date/time (occurrence date with potentially modified time)
      lines.push(...buildICalTimingLines({
        date: exception.occurrenceDate,
        endDate: modEndDate,
        startTime: modStartTime,
        endTime: modEndTime,
        timezone: event.timezone,
        timeTBD: modTimeTBD,
      }))

      // Summary
      lines.push(foldLine(`SUMMARY:${escapeICalText(modTimeTBD ? `${modTitle} (Time TBD)` : modTitle)}`))

      // Description
      let modDescriptionFull = modTimeTBD ? `Time: TBD\n\n${modDescription}` : modDescription
      if (modMeetingLink) {
        modDescriptionFull += `\\n\\nOnline Meeting Link: ${modMeetingLink}`
      }
      lines.push(foldLine(`DESCRIPTION:${escapeICalText(modDescriptionFull)}`))

      // Location
      if (modAddress) {
        lines.push(foldLine(`LOCATION:${escapeICalText(modAddress)}`))
      } else if (modLocationType === "online" && modMeetingLink) {
        lines.push(foldLine(`LOCATION:${escapeICalText(modMeetingLink)}`))
      }

      // Categories
      if (event.type) {
        lines.push(`CATEGORIES:${event.type}`)
      }

      lines.push("STATUS:CONFIRMED")
      lines.push("END:VEVENT")
    }
  }

  lines.push("END:VCALENDAR")

  // Join with CRLF as per iCal spec
  const icalContent = lines.join("\r\n")

  log.info("Calendar built", {
    eventCount: approvedEvents.length,
    exceptionCount: allExceptions.length,
    recurringEvents: recurringEventIds.length,
  })

  return icalContent
}

export async function GET(request: Request) {
  const log = createRequestLogger("/api/calendar", "GET")

  try {
    const { data, status } = await withEdgeCache(
      CACHE_KEY,
      () => buildCalendar(log, request.url),
      { ttl: CACHE_TTL }
    )

    log.info("Calendar cache response", { cacheStatus: status })
    log.tracker.finish(200)

    return new Response(data, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="area36-events.ics"',
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "X-Request-Id": log.requestId,
      },
    })
  } catch (error) {
    log.error("Calendar feed error", error)
    void recordError({ kind: "D1_QUERY_FAILED", route: "/api/calendar", error })
    log.tracker.finish(500)
    return new Response("Error generating calendar feed", {
      status: 500,
      headers: { "X-Request-Id": log.requestId },
    })
  }
}
