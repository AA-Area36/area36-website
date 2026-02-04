// Shared utilities for validating access to protected files
// Uses dynamic imports to avoid bundling GDrive modules at build time

import { isFileUnlocked } from "@/lib/files/session"
import { getDb } from "@/lib/db"
import { fileMetadata } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

// Re-export types only (these don't add to bundle size)
export type { GDriveCredentials } from "@/lib/gdrive/types"

export interface FileAccessResult {
  valid: boolean
  filename?: string
  requiresPassword: boolean
  isUnlocked?: boolean
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
 * Validate access to a file
 * Returns whether the file can be accessed and whether it requires a password
 * Uses dynamic imports to avoid bundling GDrive modules
 */
export async function validateFileAccess(
  fileId: string,
  credentials: Awaited<ReturnType<typeof getGDriveCredentials>>
): Promise<FileAccessResult> {
  try {
    // Dynamic import to avoid bundling at build time
    const { getFileMetadata: getDriveFileMetadata } = await import("@/lib/gdrive/client")
    
    // Get file metadata from Google Drive
    const file = await getDriveFileMetadata(credentials, fileId)
    if (!file) {
      return { valid: false, requiresPassword: false }
    }

    // Check if file has metadata in our database
    const metadata = await getFileMetadataByDriveId(fileId)

    // If no metadata or no password, file is accessible
    if (!metadata || !metadata.password) {
      return {
        valid: true,
        filename: file.name,
        requiresPassword: false,
      }
    }

    // File has password - check if unlocked
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
export async function getGDriveEnv(): Promise<{
  GDRIVE_SERVICE_ACCOUNT_EMAIL: string
  GDRIVE_PRIVATE_KEY: string
  GDRIVE_PRIVATE_KEY_ID: string
}> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare")
    const { env } = await getCloudflareContext({ async: true })
    if (env.GDRIVE_SERVICE_ACCOUNT_EMAIL) {
      return {
        GDRIVE_SERVICE_ACCOUNT_EMAIL: env.GDRIVE_SERVICE_ACCOUNT_EMAIL,
        GDRIVE_PRIVATE_KEY: env.GDRIVE_PRIVATE_KEY,
        GDRIVE_PRIVATE_KEY_ID: env.GDRIVE_PRIVATE_KEY_ID,
      }
    }
  } catch {
    // Not in Cloudflare environment
  }

  return {
    GDRIVE_SERVICE_ACCOUNT_EMAIL: process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL || "",
    GDRIVE_PRIVATE_KEY: process.env.GDRIVE_PRIVATE_KEY || "",
    GDRIVE_PRIVATE_KEY_ID: process.env.GDRIVE_PRIVATE_KEY_ID || "",
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
