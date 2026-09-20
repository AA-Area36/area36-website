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
      .where(eq(recordingFolders.id, driveId))

    if (!folder) {
      return { success: false, error: UNLOCK_ERROR }
    }

    const valid = await verifyPassword(password, folder.password)
    if (!valid) {
      return { success: false, error: UNLOCK_ERROR }
    }

    await setUnlockedFolder(folder.driveId)
    return { success: true }
  } catch (error) {
    console.error("Error verifying folder password:", error)
    return { success: false, error: UNLOCK_ERROR }
  }
}

/**
 * Verify password for a file and unlock it.
 * On success, returns credential-free proxy URLs. The completed server action
 * response has established the HttpOnly session cookie before these are fetched.
 */
export async function verifyFilePassword(
  driveId: string,
  password: string
): Promise<{
  success: boolean
  error?: string
  previewUrl?: string
  downloadUrl?: string
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

    // URLs never carry bearer credentials.
    const previewUrl = `/api/files/preview/${encodeURIComponent(driveId)}`
    const downloadUrl = `/api/files/download/${encodeURIComponent(driveId)}`

    return {
      success: true,
      previewUrl,
      downloadUrl,
    }
  } catch (error) {
    console.error("Error verifying file password:", error)
    return { success: false, error: UNLOCK_ERROR }
  }
}
