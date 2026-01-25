"use server"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { recordingFolders } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function getRecordingFolders() {
  const session = await auth()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const db = await getDb()
  return db.select().from(recordingFolders).orderBy(recordingFolders.folderName)
}

export async function addRecordingFolder(data: {
  driveId: string
  folderName: string
  password: string
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.email) return { success: false, error: "Unauthorized" }

  try {
    const db = await getDb()
    await db.insert(recordingFolders).values({
      id: crypto.randomUUID(),
      driveId: data.driveId,
      folderName: data.folderName,
      password: data.password,
    })

    revalidatePath("/admin/recordings")
    revalidatePath("/recordings")
    return { success: true }
  } catch (error) {
    console.error("Failed to add recording folder:", error)
    return { success: false, error: "Failed to add folder. Drive ID may already exist." }
  }
}

export async function updateRecordingFolder(
  id: string,
  data: { folderName?: string; password?: string }
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.email) return { success: false, error: "Unauthorized" }

  try {
    const db = await getDb()
    await db.update(recordingFolders)
      .set({
        ...(data.folderName && { folderName: data.folderName }),
        ...(data.password && { password: data.password }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(recordingFolders.id, id))

    revalidatePath("/admin/recordings")
    return { success: true }
  } catch (error) {
    console.error("Failed to update recording folder:", error)
    return { success: false, error: "Failed to update folder" }
  }
}

export async function deleteRecordingFolder(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.email) return { success: false, error: "Unauthorized" }

  try {
    const db = await getDb()
    await db.delete(recordingFolders).where(eq(recordingFolders.id, id))

    revalidatePath("/admin/recordings")
    revalidatePath("/recordings")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete recording folder:", error)
    return { success: false, error: "Failed to delete folder" }
  }
}
