// Shared utilities for validating access to protected files
// Uses dynamic imports to avoid bundling GDrive modules at build time

import { isFileUnlocked } from "@/lib/files/session"
import { getDb } from "@/lib/db"
import { fileMetadata } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { DriveFile, GDriveCredentials } from "@/lib/gdrive/types"

// Re-export types only (these don't add to bundle size)
export type { GDriveCredentials } from "@/lib/gdrive/types"

export interface FileAccessResult {
  valid: boolean
  filename?: string
  requiresPassword: boolean
  isUnlocked?: boolean
}

export interface GDriveAccessEnv {
  GDRIVE_SERVICE_ACCOUNT_EMAIL: string
  GDRIVE_PRIVATE_KEY: string
  GDRIVE_PRIVATE_KEY_ID: string
  GDRIVE_ROOT_FOLDER_ID: string
  GDRIVE_RECORDINGS_FOLDER_ID: string
  GDRIVE_NEWSLETTERS_FOLDER_ID: string
  GDRIVE_RESOURCES_FOLDER_ID: string
  GDRIVE_COMMITTEES_FOLDER_ID: string
  GDRIVE_SERVICE_RESOURCES_FOLDER_ID: string
}

const MAX_ANCESTRY_DEPTH = 12
const MAX_ANCESTRY_NODES = 64

export function getAllowedGDriveRootIds(env: GDriveAccessEnv): string[] {
  return [
    env.GDRIVE_ROOT_FOLDER_ID,
    env.GDRIVE_RECORDINGS_FOLDER_ID,
    env.GDRIVE_NEWSLETTERS_FOLDER_ID,
    env.GDRIVE_RESOURCES_FOLDER_ID,
    env.GDRIVE_COMMITTEES_FOLDER_ID,
    env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID,
  ].filter((id, index, ids): id is string => Boolean(id) && ids.indexOf(id) === index)
}

async function isWithinAllowedDriveRoots(
  file: DriveFile,
  credentials: GDriveCredentials,
  allowedRootIds: string[],
  getDriveFileMetadata: (
    credentials: GDriveCredentials,
    fileId: string
  ) => Promise<DriveFile>
): Promise<boolean> {
  if (allowedRootIds.length === 0) return false

  const allowedRoots = new Set(allowedRootIds)
  const visited = new Set<string>([file.id])
  const frontier = (file.parents ?? []).map((id) => ({ id, depth: 1 }))

  while (frontier.length > 0 && visited.size <= MAX_ANCESTRY_NODES) {
    const current = frontier.shift()!
    if (allowedRoots.has(current.id)) return true
    if (current.depth > MAX_ANCESTRY_DEPTH || visited.has(current.id)) continue

    visited.add(current.id)
    const parent = await getDriveFileMetadata(credentials, current.id)
    for (const parentId of parent.parents ?? []) {
      frontier.push({ id: parentId, depth: current.depth + 1 })
    }
  }

  return false
}

/**
 * Get file metadata from database by drive ID
 */
export async function getFileMetadataByDriveId(driveId: string) {
  const db = await getDb()
  const results = await db
    .select()
    .from(fileMetadata)
    .where(eq(fileMetadata.driveId, driveId))
    .limit(1)
  return results[0] || null
}

/**
 * Get file metadata for multiple drive IDs
 */
export async function getFileMetadataByDriveIds(driveIds: string[]) {
  if (driveIds.length === 0) return []
  const db = await getDb()
  const results = await db.select().from(fileMetadata)
  // Filter in JS since D1 doesn't support IN queries well
  return results.filter((r) => driveIds.includes(r.driveId))
}

/**
 * Validate access to a file.
 *
 * Access is granted when ANY of the following are true:
 * 1. The file has no password set in our database.
 * 2. The file has a password but the user's session cookie marks it as unlocked.
 * 3. A valid short-lived unlock token is provided (issued after password
 *    verification, avoids cookie-propagation race).
 */
export async function validateFileAccess(
  fileId: string,
  credentials: Awaited<ReturnType<typeof getGDriveCredentials>>,
  unlockToken: string | null | undefined,
  allowedRootIds: string[]
): Promise<FileAccessResult> {
  try {
    // Dynamic import to avoid bundling at build time
    const { getFileMetadata: getDriveFileMetadata } = await import("@/lib/gdrive/client")
    
    // Get file metadata from Google Drive — also proves the file exists and
    // the service account can read it.
    const file = await getDriveFileMetadata(credentials, fileId)
    if (!file) {
      return { valid: false, requiresPassword: false }
    }

    // A service-account share is not an authorization boundary. Only files
    // descending from an explicitly configured Area 36 root may be proxied.
    if (
      !(await isWithinAllowedDriveRoots(
        file,
        credentials,
        allowedRootIds,
        getDriveFileMetadata
      ))
    ) {
      return { valid: false, requiresPassword: false }
    }

    // Check if file has metadata in our database
    const metadata = await getFileMetadataByDriveId(fileId)

    // If no password set, access is always granted.
    if (!metadata || !metadata.password) {
      return {
        valid: true,
        filename: file.name,
        requiresPassword: false,
      }
    }

    // File has password — check unlock token first (avoids cookie race)
    if (unlockToken) {
      const { verifyFileUnlockToken } = await import("@/lib/security/unlock-cookie")
      const tokenFileId = await verifyFileUnlockToken(unlockToken, metadata.password)
      if (tokenFileId === fileId) {
        return {
          valid: true,
          filename: file.name,
          requiresPassword: true,
          isUnlocked: true,
        }
      }
    }

    // Fall back to cookie-based check
    const unlocked = await isFileUnlocked(fileId)
    return {
      valid: unlocked,
      filename: file.name,
      requiresPassword: true,
      isUnlocked: unlocked,
    }
  } catch (error) {
    console.error("Error validating file access:", error)
    return { valid: false, requiresPassword: false }
  }
}

/**
 * Verify a password for a file
 */
export async function verifyFilePassword(
  driveId: string,
  password: string
): Promise<boolean> {
  const metadata = await getFileMetadataByDriveId(driveId)
  if (!metadata || !metadata.password) {
    return false
  }
  return metadata.password === password
}

/**
 * Get environment variables for Google Drive access
 * Works in both Cloudflare Workers and local development
 */
export async function getGDriveEnv(): Promise<GDriveAccessEnv> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare")
    const { env } = await getCloudflareContext({ async: true })
    if (env.GDRIVE_SERVICE_ACCOUNT_EMAIL) {
      return {
        GDRIVE_SERVICE_ACCOUNT_EMAIL: env.GDRIVE_SERVICE_ACCOUNT_EMAIL,
        GDRIVE_PRIVATE_KEY: env.GDRIVE_PRIVATE_KEY,
        GDRIVE_PRIVATE_KEY_ID: env.GDRIVE_PRIVATE_KEY_ID,
        GDRIVE_ROOT_FOLDER_ID: env.GDRIVE_ROOT_FOLDER_ID || "",
        GDRIVE_RECORDINGS_FOLDER_ID: env.GDRIVE_RECORDINGS_FOLDER_ID || "",
        GDRIVE_NEWSLETTERS_FOLDER_ID: env.GDRIVE_NEWSLETTERS_FOLDER_ID || "",
        GDRIVE_RESOURCES_FOLDER_ID: env.GDRIVE_RESOURCES_FOLDER_ID || "",
        GDRIVE_COMMITTEES_FOLDER_ID: env.GDRIVE_COMMITTEES_FOLDER_ID || "",
        GDRIVE_SERVICE_RESOURCES_FOLDER_ID:
          env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID || "",
      }
    }
  } catch {
    // Not in Cloudflare environment
  }

  return {
    GDRIVE_SERVICE_ACCOUNT_EMAIL: process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL || "",
    GDRIVE_PRIVATE_KEY: process.env.GDRIVE_PRIVATE_KEY || "",
    GDRIVE_PRIVATE_KEY_ID: process.env.GDRIVE_PRIVATE_KEY_ID || "",
    GDRIVE_ROOT_FOLDER_ID: process.env.GDRIVE_ROOT_FOLDER_ID || "",
    GDRIVE_RECORDINGS_FOLDER_ID: process.env.GDRIVE_RECORDINGS_FOLDER_ID || "",
    GDRIVE_NEWSLETTERS_FOLDER_ID: process.env.GDRIVE_NEWSLETTERS_FOLDER_ID || "",
    GDRIVE_RESOURCES_FOLDER_ID: process.env.GDRIVE_RESOURCES_FOLDER_ID || "",
    GDRIVE_COMMITTEES_FOLDER_ID: process.env.GDRIVE_COMMITTEES_FOLDER_ID || "",
    GDRIVE_SERVICE_RESOURCES_FOLDER_ID:
      process.env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID || "",
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
