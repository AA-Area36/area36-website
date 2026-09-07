import { sql } from "drizzle-orm"
import { events, eventExceptions } from "@/lib/db/schema"

/** Keep a final occurrence whose end (including an exception) overlaps the window. */
export function recurringOverlapsStart(start: string) {
  return sql`(${events.recurUntil} IS NULL OR
    date(${events.recurUntil}, printf('+%d days', max(0,
      julianday(coalesce(${events.endDate}, ${events.date})) - julianday(${events.date})
    ))) >= ${start} OR EXISTS (
      SELECT 1 FROM ${eventExceptions}
      WHERE ${eventExceptions.eventId} = ${events.id} AND ${eventExceptions.endDate} >= ${start}
    ))`
}
