"use server"

import { getDb } from "@/lib/db"
import { eventFlyers } from "@/lib/db/schema"
import { uploadFlyer, deleteFlyer } from "@/lib/r2"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

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
  const file = formData.get("file") as File | null

  if (!file) {
    return { success: false, error: "No file provided" }
  }

  // Upload to R2
  const uploadResult = await uploadFlyer(eventId, file)

  if (!uploadResult.success) {
    return { success: false, error: uploadResult.error }
  }

  // Get the current max order for this event's flyers
  const db = await getDb()
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
  const db = await getDb()

  try {
    // Update each flyer's order based on its position in the array
    for (let i = 0; i < flyerIds.length; i++) {
      await db
        .update(eventFlyers)
        .set({ order: i })
        .where(eq(eventFlyers.id, flyerIds[i]))
    }

    revalidatePath("/events")
    revalidatePath("/admin/events")

    return { success: true }
  } catch (error) {
    console.error("Failed to reorder flyers:", error)
    return { success: false, error: "Failed to reorder flyers" }
  }
}
