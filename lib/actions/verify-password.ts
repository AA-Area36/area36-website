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
 * On success, returns the appropriate preview/download URLs so the client
 * can use them immediately.
 *
 * If the file lives in a restricted (non-public) Google Drive folder, proxied
 * API routes are returned instead of direct GDrive URLs, since the browser
 * cannot access those files directly.
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

    // Check whether the file's folder is restricted (not publicly shared).
    // If so, direct GDrive URLs would 403 in the browser — use proxied routes.
    const { isFileInRestrictedFolder } = await import("@/lib/gdrive/restricted")
    const { getGDriveEnv, getGDriveCredentials } = await import("@/lib/files/access")

    const env = await getGDriveEnv()
    const credentials = await getGDriveCredentials(env)
    const restricted = await isFileInRestrictedFolder(driveId, credentials)

    if (restricted) {
      return {
        success: true,
        previewUrl: `/api/files/preview/${driveId}`,
        downloadUrl: `/api/files/download/${driveId}`,
      }
    }

    // File is publicly accessible — return direct GDrive URLs
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
