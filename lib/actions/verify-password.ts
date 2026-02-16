"use server"

import { getDb } from "@/lib/db"
import { recordingFolders, fileMetadata } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { setUnlockedFolder } from "@/lib/recordings/session"
import { setUnlockedFile } from "@/lib/files/session"
import { verifyPassword } from "@/lib/security/passwords"

/**
 * Verify password for a recording folder and unlock it
 * This function is intentionally isolated from GDrive imports to keep bundle size small
 */
export async function verifyFolderPassword(
  driveId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb()
    const [folder] = await db
      .select()
      .from(recordingFolders)
      .where(eq(recordingFolders.driveId, driveId))

    if (!folder) {
      return { success: false, error: "Folder not found" }
    }

    const valid = await verifyPassword(password, folder.password)
    if (!valid) {
      return { success: false, error: "Incorrect password" }
    }

    await setUnlockedFolder(driveId)
    return { success: true }
  } catch (error) {
    console.error("Error verifying folder password:", error)
    return { success: false, error: "Verification failed" }
  }
}

/**
 * Verify password for a file and unlock it.
 * On success, returns the direct GDrive preview/download URLs so the client
 * can use them immediately without a cookie-gated round-trip.
 */
export async function verifyFilePassword(
  driveId: string,
  password: string
): Promise<{ success: boolean; error?: string; previewUrl?: string; downloadUrl?: string }> {
  try {
    const db = await getDb()
    const results = await db
      .select()
      .from(fileMetadata)
      .where(eq(fileMetadata.driveId, driveId))
      .limit(1)

    const meta = results[0]
    if (!meta || !meta.password) {
      return { success: false, error: "File not found" }
    }

    const valid = await verifyPassword(password, meta.password)
    if (!valid) {
      return { success: false, error: "Incorrect password" }
    }

    // Set cookie to unlock file (for subsequent page loads)
    await setUnlockedFile(driveId)

    // Return direct GDrive URLs so client can use them immediately
    const { getPreviewUrl, getDownloadUrl } = await import("@/lib/gdrive/client")

    return {
      success: true,
      previewUrl: getPreviewUrl(driveId),
      downloadUrl: getDownloadUrl(driveId),
    }
  } catch (error) {
    console.error("Error verifying file password:", error)
    return { success: false, error: "Verification failed" }
  }
}
