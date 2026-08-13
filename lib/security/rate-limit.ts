import { getCloudflareContext } from "@opennextjs/cloudflare"
import { headers } from "next/headers"

type RateLimitOptions = {
  limit: number
  windowMs: number
}

type RateLimitState = {
  count: number
  resetAt: number
}

export type RateLimitResult = {
  ok: boolean
  remaining: number
  resetAt: number
  source: "d1" | "local" | "unavailable"
}

const RATE_LIMIT_STORE_KEY = "__rate_limit_store__"
const RATE_LIMIT_CLEANUP_KEY = "__rate_limit_cleanup_at__"
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 15 * 60 * 1000
const RATE_LIMIT_CLEANUP_BATCH_SIZE = 250

function getStore(): Map<string, RateLimitState> {
  const globalStore = globalThis as unknown as {
    [RATE_LIMIT_STORE_KEY]?: Map<string, RateLimitState>
  }
  if (!globalStore[RATE_LIMIT_STORE_KEY]) {
    globalStore[RATE_LIMIT_STORE_KEY] = new Map()
  }
  return globalStore[RATE_LIMIT_STORE_KEY]!
}

function scheduleExpiredRowCleanup(
  db: D1Database,
  waitUntil: ((promise: Promise<unknown>) => void) | undefined,
  now: number
): void {
  if (!waitUntil) return
  const scope = globalThis as unknown as { [RATE_LIMIT_CLEANUP_KEY]?: number }
  if ((scope[RATE_LIMIT_CLEANUP_KEY] ?? 0) + RATE_LIMIT_CLEANUP_INTERVAL_MS > now) return
  scope[RATE_LIMIT_CLEANUP_KEY] = now

  const cleanup = db
    .prepare(
      `DELETE FROM rate_limits
       WHERE key_hash IN (
         SELECT key_hash FROM rate_limits
         WHERE reset_at < ?
         ORDER BY reset_at
         LIMIT ?
       )`
    )
    .bind(now, RATE_LIMIT_CLEANUP_BATCH_SIZE)
    .run()
    .catch((error) => console.error("Expired rate-limit cleanup failed", error))
  waitUntil(cleanup)
}

async function hashRateLimitKey(key: string): Promise<string> {
  const bytes = new TextEncoder().encode(key)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return `v1:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`
}

function checkLocalRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
  now = Date.now()
): RateLimitResult {
  const store = getStore()
  const current = store.get(key)

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { ok: true, remaining: limit - 1, resetAt, source: "local" }
  }

  const nextCount = current.count + 1
  current.count = nextCount
  store.set(key, current)

  return {
    ok: nextCount <= limit,
    remaining: Math.max(0, limit - nextCount),
    resetAt: current.resetAt,
    source: "local",
  }
}

export async function getClientIp(): Promise<string> {
  const hdrs = await headers()
  const cfConnectingIp = hdrs.get("cf-connecting-ip")
  if (cfConnectingIp) return cfConnectingIp

  // Proxy fallbacks support local/non-Cloudflare development only. Production
  // throttling hashes the result before persisting it.
  const xForwardedFor = hdrs.get("x-forwarded-for")
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() || "unknown"
  }

  return hdrs.get("x-real-ip") || "unknown"
}

/**
 * Atomically increments a shared D1 counter. This is authoritative in the
 * deployed Workers runtime; the in-memory path exists only for local dev.
 */
export async function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): Promise<RateLimitResult> {
  const now = Date.now()
  const nextResetAt = now + windowMs

  try {
    const { env, ctx } = await getCloudflareContext({ async: true })
    if (!env.DB) throw new Error("D1 binding unavailable")

    const keyHash = await hashRateLimitKey(key)
    const row = await env.DB.prepare(
      `INSERT INTO rate_limits (key_hash, count, reset_at, updated_at)
       VALUES (?, 1, ?, ?)
       ON CONFLICT(key_hash) DO UPDATE SET
         count = CASE
           WHEN rate_limits.reset_at <= excluded.updated_at THEN 1
           ELSE rate_limits.count + 1
         END,
         reset_at = CASE
           WHEN rate_limits.reset_at <= excluded.updated_at THEN excluded.reset_at
           ELSE rate_limits.reset_at
         END,
         updated_at = excluded.updated_at
       RETURNING count, reset_at AS resetAt`
    )
      .bind(keyHash, nextResetAt, now)
      .first<{ count: number; resetAt: number }>()

    if (!row) throw new Error("D1 rate-limit update returned no row")
    scheduleExpiredRowCleanup(env.DB, ctx?.waitUntil?.bind(ctx), now)
    return {
      ok: row.count <= limit,
      remaining: Math.max(0, limit - row.count),
      resetAt: row.resetAt,
      source: "d1",
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      return checkLocalRateLimit(key, { limit, windowMs }, now)
    }

    console.error("Shared rate limiter unavailable", error)
    return { ok: false, remaining: 0, resetAt: nextResetAt, source: "unavailable" }
  }
}
