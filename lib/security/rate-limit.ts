import { headers } from "next/headers"

type RateLimitOptions = {
  limit: number
  windowMs: number
}

type RateLimitState = {
  count: number
  resetAt: number
}

const RATE_LIMIT_STORE_KEY = "__rate_limit_store__"

function getStore(): Map<string, RateLimitState> {
  const globalStore = globalThis as unknown as {
    [RATE_LIMIT_STORE_KEY]?: Map<string, RateLimitState>
  }
  if (!globalStore[RATE_LIMIT_STORE_KEY]) {
    globalStore[RATE_LIMIT_STORE_KEY] = new Map()
  }
  return globalStore[RATE_LIMIT_STORE_KEY]!
}

export async function getClientIp(): Promise<string> {
  const hdrs = await headers()
  const cfConnectingIp = hdrs.get("cf-connecting-ip")
  if (cfConnectingIp) return cfConnectingIp

  const xForwardedFor = hdrs.get("x-forwarded-for")
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() || "unknown"
  }

  return hdrs.get("x-real-ip") || "unknown"
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): { ok: boolean; remaining: number; resetAt: number } {
  const store = getStore()
  const now = Date.now()
  const current = store.get(key)

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { ok: true, remaining: limit - 1, resetAt }
  }

  const nextCount = current.count + 1
  current.count = nextCount
  store.set(key, current)

  const remaining = Math.max(0, limit - nextCount)
  return { ok: nextCount <= limit, remaining, resetAt: current.resetAt }
}
