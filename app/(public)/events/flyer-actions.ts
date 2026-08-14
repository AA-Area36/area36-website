"use server"

import { getDb } from "@/lib/db"
import { eventFlyers, events } from "@/lib/db/schema"
import { uploadFlyer, deleteFlyer } from "@/lib/r2"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { requireAreaAdminSession } from "@/lib/auth/guards"
import { verifyEventUploadToken } from "@/lib/security/upload-token"
import { persistUploadedObject } from "@/lib/storage/persist-upload"
import { invalidateEventCaches } from "@/lib/utils/event-cache"
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit"
import {
  releasePublicEventFlyerReservation,
  reservePublicEventFlyerUpload,
} from "@/lib/events/flyer-upload-budget"

export interface UploadFlyerResponse {
  success: true
  flyer: {
    id: string
    fileKey: string
    fileName: string
    fileType: string
    fileSize: number
  }
}

export interface UploadFlyerErrorResponse {
  success: false
  error: string
}

/**
 * Upload a flyer for an event
 * This can be called during event submission or when editing an event
 */
export async function uploadEventFlyer(
  eventId: string,
  formData: FormData
): Promise<UploadFlyerResponse | UploadFlyerErrorResponse> {
  const session = await auth()
  const isAdmin = !!session?.user?.email

  const file = formData.get("file")

  if (!(file instanceof File)) {
    return { success: false, error: "No file provided" }
  }

  const db = await getDb()
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  if (!event) {
    return { success: false, error: "Event not found" }
  }

  let reservationId: string | null = null
  if (!isAdmin) {
    const uploadToken = formData.get("uploadToken") as string | null
    const tokenClaims = uploadToken
      ? await verifyEventUploadToken(uploadToken, eventId)
      : null
    if (!tokenClaims) {
      return { success: false, error: "Upload not authorized" }
    }
    if (event.status !== "pending") {
      return { success: false, error: "Uploads are only allowed for pending events" }
    }

    const ip = await getClientIp()
    const rateLimit = await checkRateLimit(`event-flyer:${ip}`, {
      limit: 10,
      windowMs: 10 * 60 * 1000,
    })
    if (!rateLimit.ok) {
      return { success: false, error: "Too many uploads. Please try again later." }
    }

    reservationId = crypto.randomUUID()
    const reserved = await reservePublicEventFlyerUpload(db.$client, {
      id: reservationId,
      eventId,
      tokenId: tokenClaims.tokenId,
      fileSize: file.size,
      expiresAt: tokenClaims.expiresAt,
    })
    if (!reserved) {
      return {
        success: false,
        error: "This event has reached its flyer upload limit.",
      }
    }
  }

  // Upload to R2
  const uploadResult = await uploadFlyer(eventId, file)

  if (!uploadResult.success) {
    if (reservationId) {
      try {
        await releasePublicEventFlyerReservation(db.$client, reservationId)
      } catch (error) {
        console.error("Failed to release event flyer reservation", error)
      }
    }
    return { success: false, error: uploadResult.error }
  }

  const flyerId = crypto.randomUUID()
  try {
    await persistUploadedObject(async () => {
      // Calculate and insert the next order in one D1 statement so concurrent
      // uploads cannot all reuse a stale application-side MAX snapshot.
      const result = await db.$client
        .prepare(
          `INSERT INTO event_flyers (
            id, event_id, file_key, file_name, file_type, file_size, "order"
          )
          SELECT ?, ?, ?, ?, ?, ?, COALESCE(MAX("order"), -1) + 1
          FROM event_flyers
          WHERE event_id = ?`
        )
        .bind(
          flyerId,
          eventId,
          uploadResult.key,
          uploadResult.fileName,
          uploadResult.fileType,
          uploadResult.fileSize,
          eventId
        )
      if (reservationId) {
        await db.$client.batch([
          result,
          db.$client.prepare(
            `UPDATE event_flyer_upload_reservations
             SET state = 'committed', updated_at = datetime('now')
             WHERE id = ? AND state = 'reserved'`
          ).bind(reservationId),
        ])
        return
      }

      const insertResult = await result.run()
      if (!insertResult.success) {
        throw new Error("Flyer metadata insert failed")
      }
    }, () => deleteFlyer(uploadResult.key))
  } catch (error) {
    if (reservationId) {
      try {
        await releasePublicEventFlyerReservation(db.$client, reservationId)
      } catch (reservationError) {
        console.error("Failed to release event flyer reservation", reservationError)
      }
    }
    console.error("Failed to persist flyer metadata", error)
    return { success: false, error: "Failed to save flyer. Please try again." }
  }

  try {
    revalidatePath("/events")
    revalidatePath("/admin/events")
    await invalidateEventCaches(event.districtNumber)
  } catch (error) {
    // The upload is committed; cache invalidation can recover independently.
    console.error("Flyer saved but cache invalidation failed", error)
  }

  return {
    success: true,
    flyer: {
      id: flyerId,
      fileKey: uploadResult.key,
      fileName: uploadResult.fileName,
      fileType: uploadResult.fileType,
      fileSize: uploadResult.fileSize,
    },
  }
}

/**
 * Delete a flyer from an event
 */
export async function deleteEventFlyer(
  flyerId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAreaAdminSession()
  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  const db = await getDb()

  // Get the flyer to find its R2 key
  const [flyer] = await db
    .select()
    .from(eventFlyers)
    .where(eq(eventFlyers.id, flyerId))

  if (!flyer) {
    return { success: false, error: "Flyer not found" }
  }

  try {
    // Delete from R2
    await deleteFlyer(flyer.fileKey)

    // Delete from database
    await db.delete(eventFlyers).where(eq(eventFlyers.id, flyerId))

    revalidatePath("/events")
    revalidatePath("/admin/events")
    await invalidateEventCaches()

    return { success: true }
  } catch (error) {
    console.error("Failed to delete flyer:", error)
    return { success: false, error: "Failed to delete flyer" }
  }
}

/**
 * Get all flyers for an event
 */
export async function getEventFlyers(eventId: string) {
  const db = await getDb()
  return db
    .select()
    .from(eventFlyers)
    .where(eq(eventFlyers.eventId, eventId))
    .orderBy(eventFlyers.order)
}

/**
 * Reorder flyers for an event
 */
export async function reorderEventFlyers(
  eventId: string,
  flyerIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAreaAdminSession()
  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  const db = await getDb()

  try {
    const eventFlyerRows = flyerIds.length > 0
      ? await db
          .select({ id: eventFlyers.id, eventId: eventFlyers.eventId })
          .from(eventFlyers)
          .where(eq(eventFlyers.eventId, eventId))
      : []
    const eventFlyerIds = new Set(eventFlyerRows.map((flyer) => flyer.id))
    if (flyerIds.some((flyerId) => !eventFlyerIds.has(flyerId))) {
      return { success: false, error: "One or more flyers do not belong to this event" }
    }

    // Update each flyer's order based on its position in the array
    for (let i = 0; i < flyerIds.length; i++) {
      await db
        .update(eventFlyers)
        .set({ order: i })
        .where(eq(eventFlyers.id, flyerIds[i]))
    }

    revalidatePath("/events")
    revalidatePath("/admin/events")
    await invalidateEventCaches()

    return { success: true }
  } catch (error) {
    console.error("Failed to reorder flyers:", error)
    return { success: false, error: "Failed to reorder flyers" }
  }
}
