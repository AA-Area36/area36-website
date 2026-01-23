import { getDb } from "@/lib/db"
import { events } from "@/lib/db/schema"
import { eq, asc, gte, and, or, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"

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
function formatICalDateTime(date: string, time: string): string {
  // date format: YYYY-MM-DD, time format: HH:MM
  const [year, month, day] = date.split("-")
  const [hour, minute] = time.split(":")
  return `${year}${month}${day}T${hour}${minute}00`
}

/**
 * Format a date as iCal DATE format (for all-day events)
 * Returns format: YYYYMMDD
 */
function formatICalDate(date: string): string {
  return date.replace(/-/g, "")
}

/**
 * Generate a unique identifier for an event
 */
function generateUID(eventId: string, domain: string): string {
  return `${eventId}@${domain}`
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

export async function GET(request: Request) {
  try {
    const db = await getDb()

    // Get today's date
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]

    // Fetch approved events from today onwards
    const approvedEvents = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.status, "approved"),
          or(
            gte(events.endDate, todayStr),
            and(isNull(events.endDate), gte(events.date, todayStr))
          )
        )
      )
      .orderBy(asc(events.date))

    // Get domain from request for UID generation
    const url = new URL(request.url)
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

      lines.push("BEGIN:VEVENT")
      lines.push(`UID:${uid}`)
      lines.push(`DTSTAMP:${dtstamp}`)

      // Handle start date/time
      const startDateTime = formatICalDateTime(event.date, event.startTime)
      lines.push(`DTSTART;TZID=${event.timezone}:${startDateTime}`)

      // Handle end date/time
      if (event.endTime) {
        const endDate = event.endDate || event.date
        const endDateTime = formatICalDateTime(endDate, event.endTime)
        lines.push(`DTEND;TZID=${event.timezone}:${endDateTime}`)
      } else if (event.endDate) {
        // Multi-day event without specific end time - use end of day
        const endDateTime = formatICalDateTime(event.endDate, "23:59")
        lines.push(`DTEND;TZID=${event.timezone}:${endDateTime}`)
      }

      // Summary (title)
      lines.push(foldLine(`SUMMARY:${escapeICalText(event.title)}`))

      // Description
      let description = event.description
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
      lines.push(`CATEGORIES:${event.type}`)

      // Status
      lines.push("STATUS:CONFIRMED")

      lines.push("END:VEVENT")
    }

    lines.push("END:VCALENDAR")

    // Join with CRLF as per iCal spec
    const icalContent = lines.join("\r\n")

    return new Response(icalContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="area36-events.ics"',
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error("Calendar feed error:", error)
    return new Response("Error generating calendar feed", { status: 500 })
  }
}
