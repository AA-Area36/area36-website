"use server"

import { getDb } from "@/lib/db"
import { eventFlyers, events } from "@/lib/db/schema"
import { uploadFlyer, deleteFlyer } from "@/lib/r2"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { requireAreaAdminSession } from "@/lib/auth/guards"
import { verifyEventUploadToken } from "@/lib/security/upload-token"
import { invalidateEventCaches } from "@/lib/utils/event-cache"

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

  const file = formData.get("file") as File | null

  if (!file) {
    return { success: false, error: "No file provided" }
  }

  const db = await getDb()
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  if (!event) {
    return { success: false, error: "Event not found" }
  }

  if (!isAdmin) {
    const uploadToken = formData.get("uploadToken") as string | null
    if (!uploadToken || !(await verifyEventUploadToken(uploadToken, eventId))) {
      return { success: false, error: "Upload not authorized" }
    }
    if (event.status !== "pending") {
      return { success: false, error: "Uploads are only allowed for pending events" }
    }
  }

  // Upload to R2
  const uploadResult = await uploadFlyer(eventId, file)

  if (!uploadResult.success) {
    return { success: false, error: uploadResult.error }
  }

  // Get the current max order for this event's flyers
  const existingFlyers = await db
    .select()
    .from(eventFlyers)
    .where(eq(eventFlyers.eventId, eventId))
  
  const maxOrder = existingFlyers.reduce((max, f) => Math.max(max, f.order), -1)

  // Save flyer metadata to database
  const flyerId = crypto.randomUUID()
  await db.insert(eventFlyers).values({
    id: flyerId,
    eventId,
    fileKey: uploadResult.key,
    fileName: uploadResult.fileName,
    fileType: uploadResult.fileType,
    fileSize: uploadResult.fileSize,
    order: maxOrder + 1,
  })

  revalidatePath("/events")
  revalidatePath("/admin/events")
  await invalidateEventCaches(event.districtNumber)

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
