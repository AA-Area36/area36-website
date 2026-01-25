import { cookies } from "next/headers"

const UNLOCKED_FOLDERS_COOKIE = "unlocked-recording-folders"

export async function getUnlockedFolders(): Promise<string[]> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(UNLOCKED_FOLDERS_COOKIE)
  if (!cookie?.value) return []
  
  try {
    return JSON.parse(cookie.value) as string[]
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
  
  cookieStore.set(UNLOCKED_FOLDERS_COOKIE, JSON.stringify(existing), {
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
