// Shared utilities for validating access to recordings
// Uses dynamic imports to avoid bundling GDrive modules at build time

import { isFolderUnlocked } from "@/lib/recordings/session"
import { getDb } from "@/lib/db"
import { recordingFolders } from "@/lib/db/schema"

// Re-export types only (these don't add to bundle size)
export type { GDriveCredentials } from "@/lib/gdrive/types"

export interface FileAccessResult {
  valid: boolean
  folderId?: string
  filename?: string
}

const MAX_ANCESTRY_DEPTH = 12
const MAX_ANCESTRY_NODES = 64

/**
 * Validate that a file belongs to an unlocked recording folder
 * Uses dynamic imports to avoid bundling GDrive modules
 */
export async function validateRecordingAccess(
  fileId: string,
  credentials: Awaited<ReturnType<typeof getGDriveCredentials>>
): Promise<FileAccessResult> {
  try {
    // Dynamic import to avoid bundling at build time
    const { getFileMetadata } = await import("@/lib/gdrive/client")
    
    // Get file metadata to begin a bounded parent traversal.
    const file = await getFileMetadata(credentials, fileId)

    if (!file.parents || file.parents.length === 0) {
      return { valid: false }
    }

    // Get registered folders from database
    const db = await getDb()
    const registeredFolders = await db.select().from(recordingFolders)
    const registeredIds = new Set(registeredFolders.map((f) => f.driveId))

    const visited = new Set<string>([fileId])
    let frontier = [...new Set(file.parents)]
    let examinedNodes = 0

    for (
      let depth = 0;
      depth < MAX_ANCESTRY_DEPTH && frontier.length > 0;
      depth++
    ) {
      const registeredAncestors = frontier.filter((id) =>
        registeredIds.has(id),
      )

      // A registered folder is the authoritative access boundary. Do not walk
      // above a locked registered folder and accidentally grant access through
      // a broader ancestor.
      if (registeredAncestors.length > 0) {
        for (const folderId of registeredAncestors) {
          if (await isFolderUnlocked(folderId)) {
            return {
              valid: true,
              folderId,
              filename: file.name,
            }
          }
        }

        return {
          valid: false,
          folderId: registeredAncestors[0],
          filename: file.name,
        }
      }

      const nextFrontier: string[] = []
      for (const ancestorId of frontier) {
        if (visited.has(ancestorId)) continue
        visited.add(ancestorId)
        examinedNodes++

        if (examinedNodes > MAX_ANCESTRY_NODES) {
          return { valid: false }
        }

        const ancestor = await getFileMetadata(credentials, ancestorId)
        for (const parentId of ancestor.parents ?? []) {
          if (!visited.has(parentId)) nextFrontier.push(parentId)
        }
      }

      frontier = [...new Set(nextFrontier)]
    }

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

/**
 * Get GDrive credentials - uses dynamic import
 */
export async function getGDriveCredentials(env: {
  GDRIVE_SERVICE_ACCOUNT_EMAIL: string
  GDRIVE_PRIVATE_KEY: string
  GDRIVE_PRIVATE_KEY_ID: string
}) {
  const { getGDriveCredentials: getCredentials } = await import("@/lib/gdrive/client")
  return getCredentials(env)
}
