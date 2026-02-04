"use server"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { recordingFolders } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { createRequestLogger } from "@/lib/logger"
import { hashPassword } from "@/lib/security/passwords"

export async function getRecordingFolders() {
  const log = createRequestLogger("/admin/recordings", "ACTION")
  const session = await log.tracker.time("auth", () => auth())
  if (!session?.user?.email) {
    log.warn("Unauthorized recordings access")
    log.tracker.finish(401)
    throw new Error("Unauthorized")
  }

  const db = await log.tracker.time("db.connect", () => getDb())
  const result = await log.tracker.time("db.select", () =>
    db.select().from(recordingFolders).orderBy(recordingFolders.folderName)
  )
  log.tracker.finish(200)
  return result
}

export async function addRecordingFolder(data: {
  driveId: string
  folderName: string
  password: string
}): Promise<{ success: boolean; error?: string }> {
  const log = createRequestLogger("/admin/recordings", "ACTION")
  const session = await log.tracker.time("auth", () => auth())
  if (!session?.user?.email) {
    log.warn("Unauthorized recordings add")
    log.tracker.finish(401)
    return { success: false, error: "Unauthorized" }
  }

  try {
    const db = await log.tracker.time("db.connect", () => getDb())
    const hashedPassword = await hashPassword(data.password)
    await log.tracker.time("db.insert", () =>
      db.insert(recordingFolders).values({
      id: crypto.randomUUID(),
      driveId: data.driveId,
      folderName: data.folderName,
      password: hashedPassword,
    })
    )

    revalidatePath("/admin/recordings")
    revalidatePath("/recordings")
    log.tracker.finish(200)
    return { success: true }
  } catch (error) {
    console.error("Failed to add recording folder:", error)
    log.error("Failed to add recording folder", error)
    log.tracker.finish(500)
    return { success: false, error: "Failed to add folder. Drive ID may already exist." }
  }
}

export async function updateRecordingFolder(
  id: string,
  data: { folderName?: string; password?: string }
): Promise<{ success: boolean; error?: string }> {
  const log = createRequestLogger("/admin/recordings", "ACTION")
  const session = await log.tracker.time("auth", () => auth())
  if (!session?.user?.email) {
    log.warn("Unauthorized recordings update")
    log.tracker.finish(401)
    return { success: false, error: "Unauthorized" }
  }

  try {
    const db = await log.tracker.time("db.connect", () => getDb())
    const updatePassword = data.password ? await hashPassword(data.password) : undefined
    await log.tracker.time("db.update", () =>
      db.update(recordingFolders)
        .set({
          ...(data.folderName && { folderName: data.folderName }),
          ...(data.password && { password: updatePassword }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(recordingFolders.id, id))
    )

    revalidatePath("/admin/recordings")
    log.tracker.finish(200)
    return { success: true }
  } catch (error) {
    console.error("Failed to update recording folder:", error)
    log.error("Failed to update recording folder", error)
    log.tracker.finish(500)
    return { success: false, error: "Failed to update folder" }
  }
}

export async function deleteRecordingFolder(id: string): Promise<{ success: boolean; error?: string }> {
  const log = createRequestLogger("/admin/recordings", "ACTION")
  const session = await log.tracker.time("auth", () => auth())
  if (!session?.user?.email) {
    log.warn("Unauthorized recordings delete")
    log.tracker.finish(401)
    return { success: false, error: "Unauthorized" }
  }

  try {
    const db = await log.tracker.time("db.connect", () => getDb())
    await log.tracker.time("db.delete", () =>
      db.delete(recordingFolders).where(eq(recordingFolders.id, id))
    )

    revalidatePath("/admin/recordings")
    revalidatePath("/recordings")
    log.tracker.finish(200)
    return { success: true }
  } catch (error) {
    console.error("Failed to delete recording folder:", error)
    log.error("Failed to delete recording folder", error)
    log.tracker.finish(500)
    return { success: false, error: "Failed to delete folder" }
  }
}
