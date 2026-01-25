// Shared utilities for validating access to recordings

import { getFileMetadata, getGDriveCredentials } from "@/lib/gdrive/client"
import { isFolderUnlocked } from "@/lib/recordings/session"
import { getDb } from "@/lib/db"
import { recordingFolders } from "@/lib/db/schema"
import type { GDriveCredentials } from "@/lib/gdrive/types"

export interface FileAccessResult {
  valid: boolean
  folderId?: string
  filename?: string
}

/**
 * Validate that a file belongs to an unlocked recording folder
 */
export async function validateRecordingAccess(
  fileId: string,
  credentials: GDriveCredentials
): Promise<FileAccessResult> {
  try {
    // Get file metadata to check parent folder
    const file = await getFileMetadata(credentials, fileId)

    if (!file.parents || file.parents.length === 0) {
      return { valid: false }
    }

    // Get registered folders from database
    const db = await getDb()
    const registeredFolders = await db.select().from(recordingFolders)
    const registeredIds = new Set(registeredFolders.map((f) => f.driveId))

    // Check if any parent folder is registered and unlocked
    for (const parentId of file.parents) {
      if (registeredIds.has(parentId)) {
        const unlocked = await isFolderUnlocked(parentId)
        return {
          valid: unlocked,
          folderId: parentId,
          filename: file.name,
        }
      }
    }

    // File's direct parent is not registered - might be in a subfolder
    // For now, deny access to files not directly in a registered folder
    // TODO: Consider recursive parent traversal for deeply nested files
    return { valid: false }
  } catch (error) {
    console.error("Error validating recording access:", error)
    return { valid: false }
  }
}

/**
 * Get environment variables for Google Drive access
 * Works in both Cloudflare Workers and local development
 */
export async function getGDriveEnv(): Promise<{
  GDRIVE_SERVICE_ACCOUNT_EMAIL: string
  GDRIVE_PRIVATE_KEY: string
  GDRIVE_PRIVATE_KEY_ID: string
  GDRIVE_RECORDINGS_FOLDER_ID: string
}> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare")
    const { env } = await getCloudflareContext({ async: true })
    if (env.GDRIVE_SERVICE_ACCOUNT_EMAIL) {
      return {
        GDRIVE_SERVICE_ACCOUNT_EMAIL: env.GDRIVE_SERVICE_ACCOUNT_EMAIL,
        GDRIVE_PRIVATE_KEY: env.GDRIVE_PRIVATE_KEY,
        GDRIVE_PRIVATE_KEY_ID: env.GDRIVE_PRIVATE_KEY_ID,
        GDRIVE_RECORDINGS_FOLDER_ID: env.GDRIVE_RECORDINGS_FOLDER_ID,
      }
    }
  } catch {
    // Not in Cloudflare environment
  }

  return {
    GDRIVE_SERVICE_ACCOUNT_EMAIL: process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL || "",
    GDRIVE_PRIVATE_KEY: process.env.GDRIVE_PRIVATE_KEY || "",
    GDRIVE_PRIVATE_KEY_ID: process.env.GDRIVE_PRIVATE_KEY_ID || "",
    GDRIVE_RECORDINGS_FOLDER_ID: process.env.GDRIVE_RECORDINGS_FOLDER_ID || "",
  }
}

export { getGDriveCredentials }
