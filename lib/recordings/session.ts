import { cookies } from "next/headers"
import { signUnlockCookie, verifyUnlockCookie } from "@/lib/security/unlock-cookie"

const UNLOCKED_FOLDERS_COOKIE = "unlocked-recording-folders"

export async function getUnlockedFolders(): Promise<string[]> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(UNLOCKED_FOLDERS_COOKIE)
  if (!cookie?.value) return []
  
  try {
    const verified = await verifyUnlockCookie(cookie.value)
    return verified?.ids ?? []
  } catch {
    return []
  }
}

export async function setUnlockedFolder(folderId: string): Promise<void> {
  const cookieStore = await cookies()
  const existing = await getUnlockedFolders()
  
  if (!existing.includes(folderId)) {
    existing.push(folderId)
  }
  
  const signedValue = await signUnlockCookie(existing)
  if (!signedValue) {
    console.error("UNLOCK_COOKIE_SECRET is not configured; cannot set unlock cookie")
    return
  }

  cookieStore.set(UNLOCKED_FOLDERS_COOKIE, signedValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
  })
}

export async function isFolderUnlocked(folderId: string): Promise<boolean> {
  const unlocked = await getUnlockedFolders()
  return unlocked.includes(folderId)
}
