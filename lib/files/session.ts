import { cookies } from "next/headers"
import { signUnlockCookie, verifyUnlockCookie } from "@/lib/security/unlock-cookie"

const UNLOCKED_FILES_COOKIE = "unlocked-files"

/**
 * Get list of unlocked file IDs from cookie
 */
export async function getUnlockedFiles(): Promise<string[]> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(UNLOCKED_FILES_COOKIE)
  if (!cookie?.value) return []

  try {
    const verified = await verifyUnlockCookie(cookie.value)
    return verified?.ids ?? []
  } catch {
    return []
  }
}

/**
 * Add a file ID to the unlocked files cookie
 */
export async function setUnlockedFile(fileId: string): Promise<void> {
  const cookieStore = await cookies()
  const existing = await getUnlockedFiles()

  if (!existing.includes(fileId)) {
    existing.push(fileId)
  }

  const signedValue = await signUnlockCookie(existing)
  if (!signedValue) {
    console.error("UNLOCK_COOKIE_SECRET is not configured; cannot set unlock cookie")
    return
  }

  cookieStore.set(UNLOCKED_FILES_COOKIE, signedValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  })
}

/**
 * Check if a file ID is in the unlocked files cookie
 */
export async function isFileUnlocked(fileId: string): Promise<boolean> {
  const unlocked = await getUnlockedFiles()
  return unlocked.includes(fileId)
}
