// Caching utilities for Google Drive data
// Uses Cloudflare Cache API for edge caching

const CACHE_PREFIX = "gdrive:"
const DEFAULT_TTL = 5 * 60 // 5 minutes in seconds

export interface CacheOptions {
  ttl?: number // Time to live in seconds
}

/**
 * Generate a cache key for a given resource
 */
function getCacheKey(key: string): string {
  // Cache API requires a valid URL
  return `https://cache.internal/${CACHE_PREFIX}${key}`
}

/**
 * Get data from cache
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const cache = await caches.open("gdrive")
    const cacheKey = getCacheKey(key)
    const response = await cache.match(cacheKey)

    if (!response) {
      return null
    }

    return response.json() as Promise<T>
  } catch {
    // Cache API not available (e.g., local dev), return null
    return null
  }
}

/**
 * Store data in cache
 */
export async function setInCache<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
  try {
    const cache = await caches.open("gdrive")
    const cacheKey = getCacheKey(key)
    const ttl = options.ttl ?? DEFAULT_TTL

    const response = new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${ttl}`,
      },
    })

    await cache.put(cacheKey, response)
  } catch {
    // Cache API not available, silently fail
  }
}

/**
 * Delete data from cache
 */
export async function deleteFromCache(key: string): Promise<boolean> {
  try {
    const cache = await caches.open("gdrive")
    const cacheKey = getCacheKey(key)
    return cache.delete(cacheKey)
  } catch {
    return false
  }
}

/**
 * Cache wrapper - get from cache or fetch and cache
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try to get from cache first
  const cached = await getFromCache<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch fresh data
  const data = await fetcher()

  // Store in cache (don't await to avoid blocking)
  setInCache(key, data, options).catch(() => {
    // Ignore cache errors
  })

  return data
}

// Pre-defined cache keys
export const CACHE_KEYS = {
  newsletters: "newsletters",
  resources: "resources",
  recordings: "recordings",
  newslettersByYear: (year: number) => `newsletters:${year}`,
  resourcesByCategory: (category: string) => `resources:${category}`,
  recordingsByCategory: (category: string) => `recordings:${category}`,
} as const
