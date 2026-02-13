// Caching utilities for Google Drive data
// Uses Cloudflare Cache API for edge caching

const CACHE_PREFIX = "gdrive:"
const DEFAULT_TTL = 60 * 60 // 1 hour in seconds (increased from 5 min)
const STALE_TTL = 24 * 60 * 60 // 24 hours - how long stale data can be served

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  staleWhileRevalidate?: boolean // Return stale data while fetching fresh
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
 * Invalidate one or more cache keys, including their stale variants
 */
export async function invalidateCacheEntries(keys: string[]): Promise<void> {
  try {
    const cache = await caches.open("gdrive")
    const expandedKeys = [...new Set(keys.flatMap((key) => [key, `${key}:stale`]))]
    await Promise.all(expandedKeys.map((key) => cache.delete(getCacheKey(key))))
  } catch {
    // Cache API not available, silently fail
  }
}

/**
 * Cache wrapper - get from cache or fetch and cache
 * Supports stale-while-revalidate pattern for better performance
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { staleWhileRevalidate = true } = options
  
  // Try to get from cache first
  const cached = await getFromCache<T>(key)
  if (cached !== null) {
    return cached
  }

  // Check for stale cache (with longer TTL)
  if (staleWhileRevalidate) {
    const staleData = await getFromCache<T>(`${key}:stale`)
    if (staleData !== null) {
      // Return stale data immediately, refresh in background
      // Use waitUntil if available (Cloudflare Workers)
      const refreshPromise = (async () => {
        try {
          const freshData = await fetcher()
          await Promise.all([
            setInCache(key, freshData, options),
            setInCache(`${key}:stale`, freshData, { ttl: STALE_TTL }),
          ])
        } catch (error) {
          console.error(`Background refresh failed for ${key}:`, error)
        }
      })()
      
      // Try to use waitUntil for background execution
      try {
        const { getCloudflareContext } = await import("@opennextjs/cloudflare")
        const ctx = await getCloudflareContext({ async: true })
        if (ctx.ctx?.waitUntil) {
          ctx.ctx.waitUntil(refreshPromise)
        }
      } catch {
        // Not in Cloudflare context, fire and forget
      }
      
      return staleData
    }
  }

  // No cache at all - must fetch
  const data = await fetcher()

  // Store in both regular and stale cache
  Promise.all([
    setInCache(key, data, options),
    setInCache(`${key}:stale`, data, { ttl: STALE_TTL }),
  ]).catch(() => {
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
