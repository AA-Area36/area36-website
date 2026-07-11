const SINGLE_FLIGHT_KEY = "__area36_single_flight__"
const DEFAULT_LEASE_MS = 60_000
const DEFAULT_WAIT_MS = 65_000
const DEFAULT_POLL_MS = 250

function getFlights(): Map<string, Promise<unknown>> {
  const scope = globalThis as unknown as {
    [SINGLE_FLIGHT_KEY]?: Map<string, Promise<unknown>>
  }
  if (!scope[SINGLE_FLIGHT_KEY]) scope[SINGLE_FLIGHT_KEY] = new Map()
  return scope[SINGLE_FLIGHT_KEY]!
}

/** Coalesces concurrent work for the same key within a Worker isolate. */
export function runSingleFlight<T>(key: string, task: () => Promise<T>): Promise<T> {
  const flights = getFlights()
  const existing = flights.get(key) as Promise<T> | undefined
  if (existing) return existing

  const promise = task().finally(() => {
    if (flights.get(key) === promise) flights.delete(key)
  })
  flights.set(key, promise)
  return promise
}

type SharedFlightOptions<T> = {
  leaseMs?: number
  waitMs?: number
  pollMs?: number
  fallback?: () => T | Promise<T>
}

async function hashFlightKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key))
  return `v1:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`
}

async function getSharedDb(): Promise<D1Database | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare")
    const { env } = await getCloudflareContext({ async: true })
    return env.DB ?? null
  } catch {
    return null
  }
}

async function acquireLease(
  db: D1Database,
  keyHash: string,
  owner: string,
  now: number,
  leaseMs: number
): Promise<boolean> {
  const row = await db
    .prepare(
      `INSERT INTO cache_refresh_leases (key_hash, owner, expires_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key_hash) DO UPDATE SET
         owner = excluded.owner,
         expires_at = excluded.expires_at,
         updated_at = excluded.updated_at
       WHERE cache_refresh_leases.expires_at <= excluded.updated_at
       RETURNING owner`
    )
    .bind(keyHash, owner, now + leaseMs, now)
    .first<{ owner: string }>()
  return row?.owner === owner
}

async function releaseLease(db: D1Database, keyHash: string, owner: string): Promise<void> {
  try {
    await db
      .prepare("DELETE FROM cache_refresh_leases WHERE key_hash = ? AND owner = ?")
      .bind(keyHash, owner)
      .run()
  } catch (error) {
    console.error("Failed to release shared cache lease", error)
  }
}

async function runWithLeaseHeartbeat<T>(
  db: D1Database,
  keyHash: string,
  owner: string,
  leaseMs: number,
  task: () => Promise<T>
): Promise<T> {
  const heartbeatMs = Math.max(1_000, Math.floor(leaseMs / 3))
  const heartbeat = setInterval(() => {
    const now = Date.now()
    void db
      .prepare(
        `UPDATE cache_refresh_leases
         SET expires_at = ?, updated_at = ?
         WHERE key_hash = ? AND owner = ?`
      )
      .bind(now + leaseMs, now, keyHash, owner)
      .run()
      .catch((error) => console.error("Failed to renew shared cache lease", error))
  }, heartbeatMs)

  try {
    return await task()
  } finally {
    clearInterval(heartbeat)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Coalesces cache fills across Worker isolates with a short D1 lease. The
 * cache remains the result channel, so lease holders never persist payloads
 * in D1 and waiters have a bounded failure path.
 */
export function runSharedSingleFlight<T>(
  key: string,
  readCached: () => Promise<T | null>,
  task: () => Promise<T>,
  options: SharedFlightOptions<T> = {}
): Promise<T> {
  return runSingleFlight(`shared:${key}`, async () => {
    const cached = await readCached()
    if (cached !== null) return cached

    const db = await getSharedDb()
    if (!db) return task()

    const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS
    const waitMs = options.waitMs ?? DEFAULT_WAIT_MS
    const pollMs = options.pollMs ?? DEFAULT_POLL_MS
    const keyHash = await hashFlightKey(key)
    const owner = crypto.randomUUID()

    let acquired: boolean
    try {
      acquired = await acquireLease(db, keyHash, owner, Date.now(), leaseMs)
    } catch (error) {
      console.error("Shared cache lease unavailable; using isolate fallback", error)
      return options.fallback ? options.fallback() : task()
    }

    if (acquired) {
      try {
        const cachedAfterLease = await readCached()
        return cachedAfterLease !== null
          ? cachedAfterLease
          : await runWithLeaseHeartbeat(db, keyHash, owner, leaseMs, task)
      } finally {
        await releaseLease(db, keyHash, owner)
      }
    }

    if (options.fallback) return options.fallback()

    const deadline = Date.now() + waitMs
    while (Date.now() < deadline) {
      await delay(pollMs)
      const sharedResult = await readCached()
      if (sharedResult !== null) return sharedResult
    }

    try {
      acquired = await acquireLease(db, keyHash, owner, Date.now(), leaseMs)
    } catch (error) {
      console.error("Shared cache lease retry unavailable; using isolate fallback", error)
      return task()
    }

    if (acquired) {
      try {
        const cachedAfterLease = await readCached()
        return cachedAfterLease !== null
          ? cachedAfterLease
          : await runWithLeaseHeartbeat(db, keyHash, owner, leaseMs, task)
      } finally {
        await releaseLease(db, keyHash, owner)
      }
    }

    const finalResult = await readCached()
    if (finalResult !== null) return finalResult
    throw new Error(`Timed out waiting for shared cache fill: ${key}`)
  })
}

export async function registerBackgroundWork(promise: Promise<unknown>): Promise<boolean> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare")
    const { ctx } = await getCloudflareContext({ async: true })
    if (ctx?.waitUntil) {
      ctx.waitUntil(promise)
      return true
    }
  } catch {
    // Local/non-Workers runtimes have no execution context.
  }
  return false
}
