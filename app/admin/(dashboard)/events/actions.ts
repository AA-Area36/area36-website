"use server"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { events, eventToTypes, type LocationType, type EventType } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { sendDenialEmailToSubmitter, sendDenialEmailToChair } from "@/lib/email"

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

    return { success: true }
  } catch (error) {
    console.error("Failed to update event:", error)
    return { success: false, error: "Failed to update event" }
  }
}
