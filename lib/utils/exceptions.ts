import type { Event, EventException, LocationType } from "@/lib/db/schema"
import type { EventOccurrence } from "@/lib/types/recurrence"
import { addDaysToDate, getEventDurationDays } from "./recurrence"

/**
 * Check if a specific occurrence date has an exception
 */
export function getExceptionForDate(
  exceptions: EventException[],
  occurrenceDate: string
): EventException | null {
  return exceptions.find((e) => e.occurrenceDate === occurrenceDate) || null
}

/**
 * Build a map of occurrence dates to their exceptions for efficient lookup
 */
export function buildExceptionMap(
  exceptions: EventException[]
): Map<string, EventException> {
  const map = new Map<string, EventException>()
  for (const exception of exceptions) {
    map.set(exception.occurrenceDate, exception)
  }
  return map
}

/**
 * Merge parent event with exception overrides to create final occurrence data
 */
export function mergeEventWithException(
  event: Event,
  occurrenceDate: string,
  exception: EventException | null
): EventOccurrence {
  const isCancelled = exception?.exceptionType === "cancelled"
  const isModified = exception?.exceptionType === "modified"

  // Calculate event duration for multi-day events
  const eventDurationDays = getEventDurationDays(event)

  // Calculate end date for this occurrence based on parent event duration
  const occurrenceEndDate = eventDurationDays > 0
    ? addDaysToDate(occurrenceDate, eventDurationDays)
    : null

  // For modified exceptions, merge non-null fields from exception
  const resolvedTitle = (isModified && exception?.title) || event.title
  const resolvedStartTime = (isModified && exception?.startTime !== undefined && exception?.startTime !== null)
    ? exception.startTime
    : event.startTime
  const resolvedEndTime = (isModified && exception?.endTime !== undefined && exception?.endTime !== null)
    ? exception.endTime
    : event.endTime
  const resolvedLocationType = (isModified && exception?.locationType)
    ? exception.locationType as LocationType
    : event.locationType
  const resolvedAddress = (isModified && exception?.address !== undefined)
    ? exception.address
    : event.address
  const resolvedMeetingLink = (isModified && exception?.meetingLink !== undefined)
    ? exception.meetingLink
    : event.meetingLink
  const resolvedDescription = (isModified && exception?.description) || event.description
  const resolvedTimeTBD = (isModified && exception?.timeTBD !== undefined && exception?.timeTBD !== null)
    ? exception.timeTBD
    : event.timeTBD
  const resolvedAddressTBD = (isModified && exception?.addressTBD !== undefined && exception?.addressTBD !== null)
    ? exception.addressTBD
    : event.addressTBD
  const resolvedMeetingLinkTBD = (isModified && exception?.meetingLinkTBD !== undefined && exception?.meetingLinkTBD !== null)
    ? exception.meetingLinkTBD
    : event.meetingLinkTBD

  // Handle modified endDate (for when a specific occurrence spans different days)
  const finalEndDate = (isModified && exception?.endDate) ? exception.endDate : occurrenceEndDate

  return {
    occurrenceId: `${event.id}_${occurrenceDate}`,
    parentEventId: event.id,
    parentEvent: event,
    date: occurrenceDate,
    endDate: finalEndDate,
    isModified,
    isCancelled,
    exception: exception || undefined,
    title: resolvedTitle,
    startTime: resolvedStartTime,
    endTime: resolvedEndTime,
    timezone: event.timezone,
    locationType: resolvedLocationType,
    address: resolvedAddress,
    meetingLink: resolvedMeetingLink,
    description: resolvedDescription,
    timeTBD: resolvedTimeTBD,
    addressTBD: resolvedAddressTBD,
    meetingLinkTBD: resolvedMeetingLinkTBD,
    isRecurringInstance: true,
  }
}

/**
 * Parse an occurrence ID to extract parent event ID and occurrence date
 * Occurrence ID format: `${eventId}_${YYYY-MM-DD}`
 */
export function parseOccurrenceId(occurrenceId: string): {
  eventId: string
  occurrenceDate: string
} | null {
  // Match the date pattern at the end (YYYY-MM-DD)
  const datePattern = /^(.+)_(\d{4}-\d{2}-\d{2})$/
  const match = occurrenceId.match(datePattern)

  if (!match) return null

  return {
    eventId: match[1],
    occurrenceDate: match[2],
  }
}

/**
 * Create an occurrence ID from event ID and date
 */
export function createOccurrenceId(eventId: string, occurrenceDate: string): string {
  return `${eventId}_${occurrenceDate}`
}
