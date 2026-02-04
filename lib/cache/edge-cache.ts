// Generic edge cache utilities using Cloudflare Cache API

const CACHE_PREFIX = "edge:"
const DEFAULT_TTL = 60 * 5 // 5 minutes
const STALE_TTL = 60 * 60 // 1 hour

export interface CacheOptions {
  ttl?: number
  staleWhileRevalidate?: boolean
}

export type CacheStatus = "hit" | "stale" | "miss"

function getCacheKey(key: string): string {
  return `https://cache.internal/${CACHE_PREFIX}${key}`
}

async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const cache = await caches.open("edge")
    const cacheKey = getCacheKey(key)
    const response = await cache.match(cacheKey)
    if (!response) return null
    return response.json() as Promise<T>
  } catch {
    return null
  }
}

async function setInCache<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
  try {
    const cache = await caches.open("edge")
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
    // Cache API may be unavailable in local dev
  }
}

export async function withEdgeCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<{ data: T; status: CacheStatus }> {
  const { staleWhileRevalidate = true } = options

  const cached = await getFromCache<T>(key)
  if (cached !== null) {
    return { data: cached, status: "hit" }
  }

  if (staleWhileRevalidate) {
    const staleData = await getFromCache<T>(`${key}:stale`)
    if (staleData !== null) {
      const refreshPromise = (async () => {
        try {
          const freshData = await fetcher()
          await Promise.all([
            setInCache(key, freshData, options),
            setInCache(`${key}:stale`, freshData, { ttl: STALE_TTL }),
          ])
        } catch (error) {
          console.error(`Edge cache background refresh failed for ${key}:`, error)
        }
      })()

      try {
        const { getCloudflareContext } = await import("@opennextjs/cloudflare")
        const ctx = await getCloudflareContext({ async: true })
        if (ctx.ctx?.waitUntil) {
          ctx.ctx.waitUntil(refreshPromise)
        }
      } catch {
        // Not in Cloudflare context, ignore
      }

      return { data: staleData, status: "stale" }
    }
  }

  const data = await fetcher()
  Promise.all([
    setInCache(key, data, options),
    setInCache(`${key}:stale`, data, { ttl: STALE_TTL }),
  ]).catch(() => {
    // Ignore cache errors
  })

  return { data, status: "miss" }
}
