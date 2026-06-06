"use server"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { events, eventToTypes, eventExceptions, type LocationType, type EventType, type MonthlyPatternType, type RecurrenceType } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { sendDenialEmailToSubmitter, sendDenialEmailToChair } from "@/lib/email"
import { serializeWeeklyPattern, serializeMonthlyPatternValue } from "@/lib/utils/recurrence"
import type { WeeklyPattern, MonthlyPattern } from "@/lib/types/recurrence"
import { invalidateEventCaches } from "@/lib/utils/event-cache"

export interface UpdateEventData {
  title: string
  date: string
  endDate?: string | null
  startTime?: string | null
  endTime?: string | null
  timezone: string
  locationType: LocationType
  address?: string | null
  meetingLink?: string | null
  description: string
  types: EventType[]
  flyerUrl?: string | null
  timeTBD?: boolean
  addressTBD?: boolean
  meetingLinkTBD?: boolean
  // Recurrence fields
  isRecurring?: boolean
  recurrenceType?: RecurrenceType
  weeklyPattern?: WeeklyPattern
  monthlyPattern?: MonthlyPattern
  recurUntil?: string | null
}

export type UpdateScope = "occurrence" | "series"

export interface UpdateRecurringEventData extends UpdateEventData {
  scope: UpdateScope
  occurrenceDate?: string // Required when scope is "occurrence"
}

export async function approveEvent(eventId: string): Promise<void> {
  const session = await auth()

  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const db = await getDb()
  await db
    .update(events)
    .set({
      status: "approved",
      reviewedBy: session.user.email,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(events.id, eventId))

  revalidatePath("/admin/events")
  revalidatePath("/events")
  await invalidateEventCaches()
}

export async function denyEvent(eventId: string, reason: string): Promise<void> {
  const session = await auth()

  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const db = await getDb()

  // Fetch event details before updating
  const [event] = await db.select().from(events).where(eq(events.id, eventId))

  if (!event) {
    throw new Error("Event not found")
  }

  // Update the event status and denial reason
  await db
    .update(events)
    .set({
      status: "denied",
      denialReason: reason,
      reviewedBy: session.user.email,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(events.id, eventId))

  // Send email notifications (wrapped in try/catch - don't fail denial if email fails)
  try {
    // Email to submitter (NO reviewer info - just event title and reason)
    await sendDenialEmailToSubmitter({
      to: event.submitterEmail,
      eventTitle: event.title,
      reason,
    })

    // Email to chair (WITH reviewer email, event details, and reason)
    await sendDenialEmailToChair({
      eventTitle: event.title,
      eventDetails: event,
      reason,
      reviewedBy: session.user.email,
    })
  } catch (error) {
    console.error("Failed to send denial emails:", error)
  }

  revalidatePath("/admin/events")
  revalidatePath("/events")
  await invalidateEventCaches()
}

export async function deleteEvent(eventId: string): Promise<void> {
  const session = await auth()

  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const db = await getDb()
  await db.delete(events).where(eq(events.id, eventId))

  revalidatePath("/admin/events")
  revalidatePath("/events")
  await invalidateEventCaches()
}

export async function updateEvent(eventId: string, data: UpdateEventData): Promise<{ success: boolean; error?: string }> {
  const session = await auth()

  if (!session?.user?.email) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const db = await getDb()
    
    // Use first type for backward compatibility with legacy `type` column
    const primaryType = data.types[0] || null

    await db
      .update(events)
      .set({
        title: data.title,
        date: data.date,
        endDate: data.endDate || null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        timezone: data.timezone,
        locationType: data.locationType,
        address: data.address || null,
        meetingLink: data.meetingLink || null,
        description: data.description,
        type: primaryType, // For backward compatibility
        flyerUrl: data.flyerUrl || null,
        timeTBD: data.timeTBD ?? false,
        addressTBD: data.addressTBD ?? false,
        meetingLinkTBD: data.meetingLinkTBD ?? false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(events.id, eventId))

    // Update event types in junction table
    // First, delete existing types
    await db.delete(eventToTypes).where(eq(eventToTypes.eventId, eventId))
    
    // Then insert new types
    if (data.types.length > 0) {
      await db.insert(eventToTypes).values(
        data.types.map((type) => ({
          eventId,
          type,
        }))
      )
    }

    revalidatePath("/admin/events")
    revalidatePath("/events")
    await invalidateEventCaches()

    return { success: true }
  } catch (error) {
    console.error("Failed to update event:", error)
    return { success: false, error: "Failed to update event" }
  }
}

/**
 * Update a recurring event - either the entire series or a specific occurrence
 */
export async function updateRecurringEvent(
  eventId: string,
  data: UpdateRecurringEventData
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()

  if (!session?.user?.email) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const db = await getDb()

    if (data.scope === "series") {
      // Update the parent event (affects all future occurrences)
      // Serialize recurrence patterns
      let recurrencePattern: string | null = null
      let monthlyPatternType: MonthlyPatternType | null = null
      let monthlyPatternValue: string | null = null

      if (data.isRecurring) {
        if (data.recurrenceType === "weekly" && data.weeklyPattern) {
          recurrencePattern = serializeWeeklyPattern(data.weeklyPattern)
        } else if (data.recurrenceType === "monthly" && data.monthlyPattern) {
          monthlyPatternType = data.monthlyPattern.type as MonthlyPatternType
          monthlyPatternValue = serializeMonthlyPatternValue(data.monthlyPattern)
        }
      }

      const primaryType = data.types[0] || null

      await db
        .update(events)
        .set({
          title: data.title,
          date: data.date,
          endDate: data.endDate || null,
          startTime: data.startTime || null,
          endTime: data.endTime || null,
          timezone: data.timezone,
          locationType: data.locationType,
          address: data.address || null,
          meetingLink: data.meetingLink || null,
          description: data.description,
          type: primaryType,
          flyerUrl: data.flyerUrl || null,
          timeTBD: data.timeTBD ?? false,
          addressTBD: data.addressTBD ?? false,
          meetingLinkTBD: data.meetingLinkTBD ?? false,
          isRecurring: data.isRecurring ?? false,
          recurrenceType: data.recurrenceType || "none",
          recurrencePattern,
          monthlyPatternType,
          monthlyPatternValue,
          recurUntil: data.recurUntil || null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(events.id, eventId))

      // Update event types
      await db.delete(eventToTypes).where(eq(eventToTypes.eventId, eventId))
      if (data.types.length > 0) {
        await db.insert(eventToTypes).values(
          data.types.map((type) => ({
            eventId,
            type,
          }))
        )
      }

      revalidatePath("/admin/events")
      revalidatePath("/events")
      await invalidateEventCaches()

      return { success: true }
    }

    // scope === "occurrence" - create or update an exception
    if (!data.occurrenceDate) {
      return { success: false, error: "Occurrence date is required" }
    }

    // Check if exception already exists
    const [existingException] = await db
      .select()
      .from(eventExceptions)
      .where(
        and(
          eq(eventExceptions.eventId, eventId),
          eq(eventExceptions.occurrenceDate, data.occurrenceDate)
        )
      )

    const exceptionData = {
      exceptionType: "modified" as const,
      title: data.title,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      endDate: data.endDate || null,
      locationType: data.locationType,
      address: data.address || null,
      meetingLink: data.meetingLink || null,
      description: data.description,
      timeTBD: data.timeTBD ?? false,
      addressTBD: data.addressTBD ?? false,
      meetingLinkTBD: data.meetingLinkTBD ?? false,
    }

    if (existingException) {
      // Update existing exception
      await db
        .update(eventExceptions)
        .set(exceptionData)
        .where(eq(eventExceptions.id, existingException.id))
    } else {
      // Create new exception
      await db.insert(eventExceptions).values({
        id: crypto.randomUUID(),
        eventId,
        occurrenceDate: data.occurrenceDate,
        ...exceptionData,
        createdBy: session.user.email,
      })
    }

    revalidatePath("/admin/events")
    revalidatePath("/events")
    await invalidateEventCaches()

    return { success: true }
  } catch (error) {
    console.error("Failed to update recurring event:", error)
    return { success: false, error: "Failed to update event" }
  }
}

/**
 * Cancel a specific occurrence of a recurring event
 */
export async function cancelOccurrence(
  eventId: string,
  occurrenceDate: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()

  if (!session?.user?.email) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const db = await getDb()

    // Check if exception already exists
    const [existingException] = await db
      .select()
      .from(eventExceptions)
      .where(
        and(
          eq(eventExceptions.eventId, eventId),
          eq(eventExceptions.occurrenceDate, occurrenceDate)
        )
      )

    if (existingException) {
      // Update to cancelled
      await db
        .update(eventExceptions)
        .set({ exceptionType: "cancelled" })
        .where(eq(eventExceptions.id, existingException.id))
    } else {
      // Create cancelled exception
      await db.insert(eventExceptions).values({
        id: crypto.randomUUID(),
        eventId,
        occurrenceDate,
        exceptionType: "cancelled",
        createdBy: session.user.email,
      })
    }

    revalidatePath("/admin/events")
    revalidatePath("/events")
    await invalidateEventCaches()

    return { success: true }
  } catch (error) {
    console.error("Failed to cancel occurrence:", error)
    return { success: false, error: "Failed to cancel occurrence" }
  }
}

/**
 * Restore a cancelled occurrence
 */
export async function restoreOccurrence(
  eventId: string,
  occurrenceDate: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()

  if (!session?.user?.email) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const db = await getDb()

    // Delete the cancelled exception (this restores the occurrence)
    await db
      .delete(eventExceptions)
      .where(
        and(
          eq(eventExceptions.eventId, eventId),
          eq(eventExceptions.occurrenceDate, occurrenceDate),
          eq(eventExceptions.exceptionType, "cancelled")
        )
      )

    revalidatePath("/admin/events")
    revalidatePath("/events")
    await invalidateEventCaches()

    return { success: true }
  } catch (error) {
    console.error("Failed to restore occurrence:", error)
    return { success: false, error: "Failed to restore occurrence" }
  }
}

/**
 * Delete a modified exception (revert to parent event values)
 */
export async function revertOccurrence(
  eventId: string,
  occurrenceDate: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()

  if (!session?.user?.email) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const db = await getDb()

    await db
      .delete(eventExceptions)
      .where(
        and(
          eq(eventExceptions.eventId, eventId),
          eq(eventExceptions.occurrenceDate, occurrenceDate),
          eq(eventExceptions.exceptionType, "modified")
        )
      )

    revalidatePath("/admin/events")
    revalidatePath("/events")
    await invalidateEventCaches()

    return { success: true }
  } catch (error) {
    console.error("Failed to revert occurrence:", error)
    return { success: false, error: "Failed to revert occurrence" }
  }
}
