type MiddlewareDistrictSite = {
  enabled: boolean
  mode: "hosted" | "external_redirect"
  redirectUrl: string | null
  displayName: string | null
}

type CacheEntry = { value: MiddlewareDistrictSite | null; expiresAt: number }

const CACHE_TTL_MS = 60_000
const cache = new Map<number, CacheEntry>()

function nowMs(): number {
  return Date.now()
}

function coerceBool(v: unknown): boolean {
  // D1 booleans come back as 0/1 numbers.
  if (typeof v === "boolean") return v
  if (typeof v === "number") return v === 1
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true"
  return false
}

export async function getDistrictSiteForMiddleware(env: { DB?: D1Database }, districtNumber: number): Promise<MiddlewareDistrictSite | null> {
  const cached = cache.get(districtNumber)
  if (cached && cached.expiresAt > nowMs()) return cached.value

  if (!env?.DB) {
    cache.set(districtNumber, { value: null, expiresAt: nowMs() + CACHE_TTL_MS })
    return null
  }

  try {
    const row = await env.DB
      .prepare(
        "SELECT enabled, mode, redirect_url as redirectUrl, display_name as displayName FROM district_sites WHERE district_number = ? LIMIT 1"
      )
      .bind(districtNumber)
      .first<{
        enabled: unknown
        mode: "hosted" | "external_redirect"
        redirectUrl: string | null
        displayName: string | null
      }>()

    const value: MiddlewareDistrictSite | null = row
      ? {
          enabled: coerceBool(row.enabled),
          mode: row.mode,
          redirectUrl: row.redirectUrl ?? null,
          displayName: row.displayName ?? null,
        }
      : null

    cache.set(districtNumber, { value, expiresAt: nowMs() + CACHE_TTL_MS })
    return value
  } catch {
    // Local dev / unmigrated DB: treat as not configured.
    cache.set(districtNumber, { value: null, expiresAt: nowMs() + CACHE_TTL_MS })
    return null
  }
}

