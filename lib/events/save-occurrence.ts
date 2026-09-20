import type { Event, NewEventException } from "@/lib/db/schema"
import { isOccurrenceDate } from "@/lib/utils/recurrence"

/** Recheck the exact validated parent snapshot in the same transaction as the write. */
export async function saveOccurrence(db: D1Database, parent: Event, date: string, data: Partial<NewEventException>, createdBy: string) {
  if (!isOccurrenceDate(parent, date)) throw new Error("Date is outside this event series")
  const fields = ["date", "is_recurring", "recurrence_type", "recurrence_pattern", "monthly_pattern_type", "monthly_pattern_value", "recur_until"]
  const values = [parent.date, Number(parent.isRecurring), parent.recurrenceType, parent.recurrencePattern, parent.monthlyPatternType, parent.monthlyPatternValue, parent.recurUntil]
  const guard = `EXISTS (SELECT 1 FROM events WHERE id = ? AND ${fields.map(field => `${field} IS ?`).join(" AND ")})`
  const overrides: Record<string, string | number | null> = {
    exception_type: data.exceptionType ?? "cancelled", title: data.title ?? null,
    start_time: data.startTime ?? null, end_time: data.endTime ?? null, end_date: data.endDate ?? null,
    location_type: data.locationType ?? null, address: data.address ?? null, meeting_link: data.meetingLink ?? null,
    description: data.description ?? null, time_tbd: data.timeTBD == null ? null : Number(data.timeTBD),
    address_tbd: data.addressTBD == null ? null : Number(data.addressTBD), meeting_link_tbd: data.meetingLinkTBD == null ? null : Number(data.meetingLinkTBD),
  }
  // D1 batch is transactional; delete+insert also reconciles historical duplicate exceptions.
  const results = await db.batch([
    db.prepare(`DELETE FROM event_exceptions WHERE event_id = ? AND occurrence_date = ? AND ${guard}`).bind(parent.id, date, parent.id, ...values),
    db.prepare(`INSERT INTO event_exceptions (id, event_id, occurrence_date, created_by, ${Object.keys(overrides).join(", ")}) SELECT ?, ?, ?, ?, ${Object.keys(overrides).map(() => "?").join(", ")} WHERE ${guard}`)
      .bind(crypto.randomUUID(), parent.id, date, createdBy, ...Object.values(overrides), parent.id, ...values),
  ])
  if (results[1].meta.changes !== 1) throw new Error("The event series changed. Refresh and try again.")
}
