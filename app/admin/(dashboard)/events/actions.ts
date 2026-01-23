"use server"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { events } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { sendDenialEmailToSubmitter, sendDenialEmailToChair } from "@/lib/email"

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
