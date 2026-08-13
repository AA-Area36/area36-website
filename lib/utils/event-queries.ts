import type { EventType, EventFlyer } from "@/lib/db/schema"
import type { EventWithRelations, DisplayEvent, FlyerInfo } from "@/lib/types/recurrence"
import {
  generateOccurrenceDates,
  getRecurrenceDescription,
} from "./recurrence"
import { buildExceptionMap, mergeEventWithException } from "./exceptions"

/**
 * Get all events (single + recurring instances) for a date range
 * This is the main function for displaying events on calendars/lists
 */
export function getEventsForDateRange(
  events: EventWithRelations[],
  rangeStart: Date,
  rangeEnd: Date,
  options: {
    includeCancelled?: boolean
  } = {}
): DisplayEvent[] {
  const result: DisplayEvent[] = []

  for (const event of events) {
    if (!event.isRecurring) {
      // Single event - check if it falls within range
      const eventDate = new Date(event.date)
      const eventEndDate = event.endDate ? new Date(event.endDate) : eventDate

      // Event is in range if it starts before range ends AND ends after range starts
      if (eventDate <= rangeEnd && eventEndDate >= rangeStart) {
        result.push(convertToDisplayEvent(event))
      }
    } else {
      // Recurring event - generate occurrences
      const occurrenceDates = generateOccurrenceDates(event, rangeStart, rangeEnd)
      const exceptionMap = buildExceptionMap(event.exceptions || [])
      const recurrenceDescription = getRecurrenceDescription(event)

      for (const occurrenceDate of occurrenceDates) {
        const exception = exceptionMap.get(occurrenceDate) || null

        // Skip cancelled occurrences unless requested
        if (exception?.exceptionType === "cancelled" && !options.includeCancelled) {
          continue
        }

        const occurrence = mergeEventWithException(event, occurrenceDate, exception)
        result.push(convertOccurrenceToDisplayEvent(occurrence, event, recurrenceDescription))
      }
    }
  }

  // Sort by date, then by start time
  result.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    // If same date, sort by start time (nulls/TBD last)
    if (!a.startTime && !b.startTime) return 0
    if (!a.startTime) return 1
    if (!b.startTime) return -1
    return a.startTime.localeCompare(b.startTime)
  })

  return result
}

/**
 * Convert a single (non-recurring) event to DisplayEvent
 */
function convertToDisplayEvent(event: EventWithRelations): DisplayEvent {
  return {
    id: event.id,
    isRecurringInstance: false,
    title: event.title,
    date: event.date,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    timezone: event.timezone,
    locationType: event.locationType,
    address: event.address,
    meetingLink: event.meetingLink,
    description: event.description,
    status: event.status,
    types: event.types,
    flyers: convertFlyers(event.flyers),
    timeTBD: event.timeTBD,
    addressTBD: event.addressTBD,
    meetingLinkTBD: event.meetingLinkTBD,
    submitterEmail: event.submitterEmail,
    isRecurring: event.isRecurring,
    recurrenceDescription: event.isRecurring ? getRecurrenceDescription(event) : undefined,
    recurUntil: event.recurUntil,
  }
}

/**
 * Convert an occurrence to DisplayEvent
 */
function convertOccurrenceToDisplayEvent(
  occurrence: ReturnType<typeof mergeEventWithException>,
  parentEvent: EventWithRelations,
  recurrenceDescription: string
): DisplayEvent {
  return {
    id: occurrence.occurrenceId,
    isRecurringInstance: true,
    parentEventId: occurrence.parentEventId,
    title: occurrence.title,
    date: occurrence.date,
    endDate: occurrence.endDate,
    startTime: occurrence.startTime,
    endTime: occurrence.endTime,
    timezone: occurrence.timezone,
    locationType: occurrence.locationType,
    address: occurrence.address,
    meetingLink: occurrence.meetingLink,
    description: occurrence.description,
    status: parentEvent.status,
    types: parentEvent.types,
    flyers: convertFlyers(parentEvent.flyers),
    timeTBD: occurrence.timeTBD,
    addressTBD: occurrence.addressTBD,
    meetingLinkTBD: occurrence.meetingLinkTBD,
    submitterEmail: parentEvent.submitterEmail,
    isRecurring: true,
    isCancelled: occurrence.isCancelled,
    isModified: occurrence.isModified,
    recurrenceDescription,
    recurUntil: parentEvent.recurUntil,
  }
}

/**
 * Convert EventFlyer[] to FlyerInfo[]
 */
function convertFlyers(flyers: EventFlyer[]): FlyerInfo[] {
  return flyers.map((f) => ({
    id: f.id,
    fileKey: f.fileKey,
    fileName: f.fileName,
    fileType: f.fileType,
    fileSize: f.fileSize,
  }))
}

/**
 * Group events by date for calendar display
 */
export function groupEventsByDate(events: DisplayEvent[]): Map<string, DisplayEvent[]> {
  const grouped = new Map<string, DisplayEvent[]>()

  for (const event of events) {
    const existing = grouped.get(event.date) || []
    existing.push(event)
    grouped.set(event.date, existing)
  }

  return grouped
}

/**
 * Filter events by type
 */
export function filterEventsByType(
  events: DisplayEvent[],
  types: EventType[]
): DisplayEvent[] {
  if (types.length === 0) return events
  return events.filter((event) =>
    event.types.some((t) => types.includes(t))
  )
}

/**
 * Search events by title or description
 */
export function searchEvents(
  events: DisplayEvent[],
  query: string
): DisplayEvent[] {
  if (!query.trim()) return events
  const lowerQuery = query.toLowerCase()
  return events.filter(
    (event) =>
      event.title.toLowerCase().includes(lowerQuery) ||
      event.description.toLowerCase().includes(lowerQuery)
  )
}
