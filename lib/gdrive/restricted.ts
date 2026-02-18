// Utilities for detecting and handling restricted Google Drive folders.
//
// A folder is "restricted" when it is NOT publicly shared (i.e., it has no
// permission with `type: "anyone"`).  Files inside restricted folders cannot
// be loaded via direct `drive.google.com` URLs in the browser — they must be
// proxied through the server API routes that authenticate with the service
// account.
//
// Detection is performed by querying the Drive API v3 permissions endpoint and
// the result is cached to avoid repeated API calls.

import type { GDriveCredentials } from "./types"

// In-memory cache: folderId -> isRestricted (true = no public access)
const restrictedCache = new Map<string, { value: boolean; expiresAt: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Check whether a Google Drive folder is restricted (not publicly shared).
 *
 * Uses an in-memory cache so repeated checks within the same Worker isolate
 * are free.  Also backed by the Cloudflare Cache API for cross-isolate reuse.
 */
export async function isFolderRestricted(
  credentials: GDriveCredentials,
  folderId: string
): Promise<boolean> {
  // 1. In-memory cache
  const memEntry = restrictedCache.get(folderId)
  if (memEntry && memEntry.expiresAt > Date.now()) {
    return memEntry.value
  }

  // 2. Cloudflare Cache API
  const cacheKey = `folder-restricted:${folderId}`
  try {
    const { getFromCache, setInCache } = await import("./cache")
    const cached = await getFromCache<{ restricted: boolean }>(cacheKey)
    if (cached !== null) {
      restrictedCache.set(folderId, {
        value: cached.restricted,
        expiresAt: Date.now() + CACHE_TTL_MS,
      })
      return cached.restricted
    }
  } catch {
    // Cache unavailable, continue to API check
  }

  // 3. Live check via Drive API
  const { isFolderPublic } = await import("./client")
  const isPublic = await isFolderPublic(credentials, folderId)
  const restricted = !isPublic

  // Persist to caches
  restrictedCache.set(folderId, {
    value: restricted,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
  try {
    const { setInCache } = await import("./cache")
    await setInCache(cacheKey, { restricted }, { ttl: 600 }) // 10 min
  } catch {
    // Ignore cache write failures
  }

  return restricted
}

/**
 * Return proxied API-route URLs for a file if it lives in a restricted
 * folder.  Otherwise returns `null`, meaning direct GDrive URLs are safe.
 */
export function getProxiedUrls(fileId: string): {
  previewUrl: string
  downloadUrl: string
} {
  return {
    previewUrl: `/api/files/preview/${fileId}`,
    downloadUrl: `/api/files/download/${fileId}`,
  }
}

/**
 * Check whether a given file lives inside a restricted folder by looking up
 * the file's parent(s) via the Drive API.
 *
 * This is used by the proxy routes (`/api/files/preview` and
 * `/api/files/download`) to decide whether to serve a file even when it is
 * NOT individually password-protected.
 */
export async function isFileInRestrictedFolder(
  fileId: string,
  credentials: GDriveCredentials
): Promise<boolean> {
  try {
    const { getFileMetadata } = await import("./client")

    const file = await getFileMetadata(credentials, fileId)
    if (!file?.parents?.length) return false

    // Check each parent (and grandparent) for restricted access
    for (const parentId of file.parents) {
      if (await isFolderRestricted(credentials, parentId)) {
        return true
      }

      // Also check one level up for nested folders
      // (e.g. "Old Reports" inside "Conference Materials")
      try {
        const parent = await getFileMetadata(credentials, parentId)
        if (parent?.parents?.length) {
          for (const grandparentId of parent.parents) {
            if (await isFolderRestricted(credentials, grandparentId)) {
              return true
            }
          }
        }
      } catch {
        // Grandparent may not be accessible
      }
    }

    return false
  } catch (error) {
    console.error("Error checking restricted folder membership:", error)
    return false
  }
}
