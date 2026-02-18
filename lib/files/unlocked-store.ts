/**
 * Client-side store for files unlocked during this browser session.
 * Stores the direct GDrive URLs so password-protected files can be
 * viewed/downloaded without re-entering the password.
 *
 * This is a module-level singleton — all components importing it share
 * the same Map for the lifetime of the page.
 */

interface UnlockedUrls {
  previewUrl: string
  downloadUrl: string
  unlockExpiresAt?: number
}

const store = new Map<string, UnlockedUrls>()

/** Mark a file as unlocked and store its direct URLs */
export function markFileUnlocked(fileId: string, urls: UnlockedUrls): void {
  store.set(fileId, urls)
}

function isExpired(entry: UnlockedUrls): boolean {
  return typeof entry.unlockExpiresAt === "number" && Date.now() > entry.unlockExpiresAt
}

/** Check whether a file has already been unlocked this session */
export function isFileUnlockedClient(fileId: string): boolean {
  const entry = store.get(fileId)
  if (!entry) return false
  if (isExpired(entry)) {
    store.delete(fileId)
    return false
  }
  return true
}

/** Get the direct URLs for a previously-unlocked file */
export function getUnlockedUrls(fileId: string): UnlockedUrls | undefined {
  const entry = store.get(fileId)
  if (!entry) return undefined
  if (isExpired(entry)) {
    store.delete(fileId)
    return undefined
  }
  return entry
}

/** Remove a file from the unlocked store */
export function clearFileUnlocked(fileId: string): void {
  store.delete(fileId)
}
