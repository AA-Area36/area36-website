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
}

const store = new Map<string, UnlockedUrls>()

/** Mark a file as unlocked and store its direct URLs */
export function markFileUnlocked(fileId: string, urls: UnlockedUrls): void {
  store.set(fileId, urls)
}

/** Check whether a file has already been unlocked this session */
export function isFileUnlockedClient(fileId: string): boolean {
  return store.has(fileId)
}

/** Get the direct URLs for a previously-unlocked file */
export function getUnlockedUrls(fileId: string): UnlockedUrls | undefined {
  return store.get(fileId)
}
