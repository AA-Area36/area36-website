"use server"

import { getDb } from "@/lib/db"
import { recordingFolders, fileMetadata } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { setUnlockedFolder } from "@/lib/recordings/session"
import { setUnlockedFile } from "@/lib/files/session"
import { verifyPassword } from "@/lib/security/passwords"
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit"

const MAX_UNLOCK_ID_LENGTH = 256
const MAX_UNLOCK_PASSWORD_LENGTH = 256
const UNLOCK_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const UNLOCK_ERROR = "Unable to unlock. Check the password and try again later."

function hasValidUnlockInput(driveId: unknown, password: unknown): driveId is string {
  return (
    typeof driveId === "string" &&
    driveId.length > 0 &&
    driveId.length <= MAX_UNLOCK_ID_LENGTH &&
    typeof password === "string" &&
    password.length > 0 &&
    password.length <= MAX_UNLOCK_PASSWORD_LENGTH
  )
}

async function canAttemptUnlock(kind: "folder" | "file", driveId: string): Promise<boolean> {
  const ip = await getClientIp()
  const [clientLimit, resourceLimit] = await Promise.all([
    checkRateLimit(`unlock:${kind}:client:${ip}`, {
      limit: 30,
      windowMs: UNLOCK_RATE_LIMIT_WINDOW_MS,
    }),
    checkRateLimit(`unlock:${kind}:resource:${ip}:${driveId}`, {
      limit: 5,
      windowMs: UNLOCK_RATE_LIMIT_WINDOW_MS,
    }),
  ])

  return clientLimit.ok && resourceLimit.ok
}

/**
 * Verify password for a recording folder and unlock it
 * This function is intentionally isolated from GDrive imports to keep bundle size small
 */
export async function verifyFolderPassword(
  driveId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!hasValidUnlockInput(driveId, password)) {
      return { success: false, error: UNLOCK_ERROR }
    }
    if (!(await canAttemptUnlock("folder", driveId))) {
      return { success: false, error: UNLOCK_ERROR }
    }

    const db = await getDb()
    const [folder] = await db
      .select()
      .from(recordingFolders)
      .where(eq(recordingFolders.driveId, driveId))

    if (!folder) {
      return { success: false, error: UNLOCK_ERROR }
    }

    const valid = await verifyPassword(password, folder.password)
    if (!valid) {
      return { success: false, error: UNLOCK_ERROR }
    }

    await setUnlockedFolder(driveId)
    return { success: true }
  } catch (error) {
    console.error("Error verifying folder password:", error)
    return { success: false, error: UNLOCK_ERROR }
  }
}

/**
 * Verify password for a file and unlock it.
 * On success, returns the proxy preview/download URLs (with a short-lived
 * unlock token appended) so the client can use them immediately without
 * waiting for the httpOnly cookie to propagate.
 */
export async function verifyFilePassword(
  driveId: string,
  password: string
): Promise<{
  success: boolean
  error?: string
  previewUrl?: string
  downloadUrl?: string
  unlockToken?: string
  unlockExpiresAt?: number
}> {
  try {
    if (!hasValidUnlockInput(driveId, password)) {
      return { success: false, error: UNLOCK_ERROR }
    }
    if (!(await canAttemptUnlock("file", driveId))) {
      return { success: false, error: UNLOCK_ERROR }
    }

    const db = await getDb()
    const results = await db
      .select()
      .from(fileMetadata)
      .where(eq(fileMetadata.driveId, driveId))
      .limit(1)

    const meta = results[0]
    if (!meta || !meta.password) {
      return { success: false, error: UNLOCK_ERROR }
    }

    const valid = await verifyPassword(password, meta.password)
    if (!valid) {
      return { success: false, error: UNLOCK_ERROR }
    }

    // Set cookie to unlock file (for subsequent page loads / refreshes)
    await setUnlockedFile(driveId)

    // Also generate a short-lived token for immediate use (avoids cookie
    // propagation race between server action and subsequent fetch).
    const { signFileUnlockToken, FILE_UNLOCK_TOKEN_MAX_AGE_MS } = await import("@/lib/security/unlock-cookie")
    const unlockToken = await signFileUnlockToken(driveId, meta.password)
    const qs = unlockToken ? `?unlock=${encodeURIComponent(unlockToken)}` : ""
    const previewUrl = `/api/files/preview/${driveId}${qs}`
    const downloadUrl = `/api/files/download/${driveId}${qs}`

    return {
      success: true,
      previewUrl,
      downloadUrl,
      unlockToken: unlockToken ?? undefined,
      unlockExpiresAt: unlockToken ? Date.now() + FILE_UNLOCK_TOKEN_MAX_AGE_MS : undefined,
    }
  } catch (error) {
    console.error("Error verifying file password:", error)
    return { success: false, error: UNLOCK_ERROR }
  }
}
