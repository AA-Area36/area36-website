import { cookies } from "next/headers"

const UNLOCKED_FILES_COOKIE = "unlocked-files"

/**
 * Get list of unlocked file IDs from cookie
 */
export async function getUnlockedFiles(): Promise<string[]> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(UNLOCKED_FILES_COOKIE)
  if (!cookie?.value) return []

  try {
    return JSON.parse(cookie.value) as string[]
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

  cookieStore.set(UNLOCKED_FILES_COOKIE, JSON.stringify(existing), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
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
