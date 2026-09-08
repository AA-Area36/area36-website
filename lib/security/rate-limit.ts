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
const RATE_LIMIT_MAX_D1_ATTEMPTS = 3
const RATE_LIMIT_RETRY_BASE_DELAY_MS = 25
const NON_RETRYABLE_D1_ERROR_PATTERNS = [
  "no such table",
  "no such column",
  "syntax error",
  "constraint failed",
  "d1_type_error",
  "maximum account storage limit",
  "exceeded maximum db size",
]

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
    .batch([
      db.prepare(
        `DELETE FROM rate_limit_attempts
         WHERE attempt_id IN (
           SELECT attempt_id FROM rate_limit_attempts
           WHERE reset_at < ?
           ORDER BY reset_at
           LIMIT ?
         )`
      ).bind(now, RATE_LIMIT_CLEANUP_BATCH_SIZE),
      db.prepare(
        `DELETE FROM rate_limits
         WHERE key_hash IN (
           SELECT key_hash FROM rate_limits
           WHERE reset_at < ?
           ORDER BY reset_at
           LIMIT ?
         )`
      ).bind(now, RATE_LIMIT_CLEANUP_BATCH_SIZE),
    ])
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

function getRateLimitScope(key: string): string {
  return key.split(":", 1)[0] || "unknown"
}

function describeError(error: unknown, depth = 0): Record<string, unknown> {
  if (!error || typeof error !== "object") {
    return { message: String(error) }
  }

  const value = error as Record<string, unknown>
  const details: Record<string, unknown> = {
    name: typeof value.name === "string" ? value.name : "Error",
    message: typeof value.message === "string" ? value.message : String(error),
  }

  if (typeof value.code === "string" || typeof value.code === "number") {
    details.code = value.code
  }
  if (typeof value.stack === "string") {
    details.stack = value.stack
  }
  if (value.cause !== undefined && depth < 2) {
    details.cause = describeError(value.cause, depth + 1)
  }

  return details
}

function shouldRetryD1Error(error: unknown): boolean {
  const details = describeError(error)
  const errorText = JSON.stringify(details).toLowerCase()
  return !NON_RETRYABLE_D1_ERROR_PATTERNS.some((pattern) => errorText.includes(pattern))
}

function retryDelayMs(attempt: number): number {
  const backoff = RATE_LIMIT_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
  const jitter = Math.floor(Math.random() * RATE_LIMIT_RETRY_BASE_DELAY_MS)
  return backoff + jitter
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

function logRateLimitExceeded(
  key: string,
  limit: number,
  result: RateLimitResult
): void {
  if (result.ok) return
  console.warn("Rate limit exceeded", {
    scope: getRateLimitScope(key),
    source: result.source,
    limit,
    resetAt: result.resetAt,
  })
}

async function incrementSharedRateLimit(
  db: D1Database,
  keyHash: string,
  attemptId: string,
  nextResetAt: number,
  now: number
): Promise<{ count: number; resetAt: number }> {
  // The attempt marker makes this write idempotent, so retrying a transient D1
  // failure cannot increment the same request more than once.
  const results = await db.batch<{ count: number; resetAt: number }>([
    db.prepare(
      `INSERT INTO rate_limit_attempts (attempt_id, key_hash, reset_at, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(attempt_id) DO NOTHING`
    ).bind(attemptId, keyHash, nextResetAt, now),
    db.prepare(
      `SELECT count, reset_at AS resetAt
       FROM rate_limits
       WHERE key_hash = ?`
    ).bind(keyHash),
  ])

  const row = results[1]?.results[0]
  if (!row) throw new Error("D1 rate-limit update returned no row")
  return row
}

function applyLocalFallback(
  key: string,
  options: RateLimitOptions,
  now: number,
  nextResetAt: number,
  error: unknown,
  attempts: number,
  phase: "binding" | "query"
): RateLimitResult {
  if (process.env.NODE_ENV === "production") {
    console.error("Shared rate limiter unavailable", { phase, attempts, error: describeError(error) })
    return { ok: false, remaining: 0, resetAt: nextResetAt, source: "unavailable" }
  }
  try {
    const result = checkLocalRateLimit(key, options, now)
    console.error("Shared rate limiter unavailable; using isolate fallback", {
      phase,
      attempts,
      maxAttempts: RATE_LIMIT_MAX_D1_ATTEMPTS,
      error: describeError(error),
    })
    logRateLimitExceeded(key, options.limit, result)
    return result
  } catch (fallbackError) {
    console.error("Shared and isolate rate limiters unavailable", {
      phase,
      attempts,
      sharedError: describeError(error),
      fallbackError: describeError(fallbackError),
    })
    return { ok: false, remaining: 0, resetAt: nextResetAt, source: "unavailable" }
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
 * deployed Workers runtime; production mutations fail closed when the binding/schema is unavailable.
 * Nonproduction may use isolate-local counters.
 */
export async function checkRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { limit, windowMs } = options
  const now = Date.now()
  const nextResetAt = now + windowMs

  let env: CloudflareEnv
  let ctx: ExecutionContext | undefined
  try {
    const context = await getCloudflareContext({ async: true })
    env = context.env
    ctx = context.ctx
    if (!env.DB) throw new Error("D1 binding unavailable")
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const result = checkLocalRateLimit(key, options, now)
      logRateLimitExceeded(key, limit, result)
      return result
    }
    return applyLocalFallback(key, options, now, nextResetAt, error, 0, "binding")
  }

  try {
    const keyHash = await hashRateLimitKey(key)
    const attemptId = crypto.randomUUID()
    let lastError: unknown
    let attemptsMade = 0

    for (let attempt = 1; attempt <= RATE_LIMIT_MAX_D1_ATTEMPTS; attempt++) {
      attemptsMade = attempt
      try {
        const row = await incrementSharedRateLimit(
          env.DB,
          keyHash,
          attemptId,
          nextResetAt,
          now
        )
        scheduleExpiredRowCleanup(env.DB, ctx?.waitUntil?.bind(ctx), now)
        const result: RateLimitResult = {
          ok: row.count <= limit,
          remaining: Math.max(0, limit - row.count),
          resetAt: row.resetAt,
          source: "d1",
        }
        logRateLimitExceeded(key, limit, result)
        return result
      } catch (error) {
        lastError = error
        const shouldRetry = attempt < RATE_LIMIT_MAX_D1_ATTEMPTS && shouldRetryD1Error(error)
        if (!shouldRetry) break

        const delayMs = retryDelayMs(attempt)
        console.warn("Shared rate limiter D1 attempt failed; retrying", {
          attempt,
          maxAttempts: RATE_LIMIT_MAX_D1_ATTEMPTS,
          delayMs,
          error: describeError(error),
        })
        await wait(delayMs)
      }
    }

    return applyLocalFallback(
      key,
      options,
      now,
      nextResetAt,
      lastError,
      attemptsMade,
      "query"
    )
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const result = checkLocalRateLimit(key, options, now)
      logRateLimitExceeded(key, limit, result)
      return result
    }
    return applyLocalFallback(key, options, now, nextResetAt, error, 0, "query")
  }
}
