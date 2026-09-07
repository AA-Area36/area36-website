import { beforeEach, describe, expect, it, vi } from "vitest"

const getCloudflareContext = vi.fn()
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }))

type BoundStatement = {
  sql: string
  args: unknown[]
}

function successfulBatchResult(count = 1, resetAt = 12345) {
  return [
    { results: [], success: true, meta: {} },
    { results: [{ count, resetAt }], success: true, meta: {} },
  ]
}

function createD1Mock() {
  const boundStatements: BoundStatement[] = []
  const prepare = vi.fn((sql: string) => ({
    bind: (...args: unknown[]) => {
      const statement = { sql, args }
      boundStatements.push(statement)
      return statement
    },
  }))
  const batch = vi.fn().mockResolvedValue(successfulBatchResult())
  return {
    db: { prepare, batch },
    prepare,
    batch,
    boundStatements,
  }
}

describe("shared rate limiting", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.useRealTimers()
    getCloudflareContext.mockReset()
    delete (globalThis as Record<string, unknown>).__rate_limit_store__
    delete (globalThis as Record<string, unknown>).__rate_limit_cleanup_at__
  })

  it("uses an idempotent D1 attempt and stores only a hash of the client key", async () => {
    const d1 = createD1Mock()
    d1.batch.mockResolvedValue(successfulBatchResult(2))
    getCloudflareContext.mockResolvedValue({ env: { DB: d1.db } })
    const { checkRateLimit } = await import("./rate-limit")

    const result = await checkRateLimit("contact:203.0.113.7", {
      limit: 3,
      windowMs: 60_000,
    })

    expect(result).toMatchObject({ ok: true, remaining: 1, source: "d1" })
    const insert = d1.boundStatements.find(({ sql }) => sql.includes("rate_limit_attempts"))
    expect(insert?.args[1]).toMatch(/^v1:[a-f0-9]{64}$/)
    expect(insert?.args.join(" ")).not.toContain("203.0.113.7")
    expect(d1.prepare.mock.calls.some(([sql]) => String(sql).includes("SELECT count"))).toBe(true)
  })

  it("retries a transient D1 write with the same attempt marker", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const d1 = createD1Mock()
    d1.batch
      .mockRejectedValueOnce(new Error("Network connection lost"))
      .mockResolvedValueOnce(successfulBatchResult())
    getCloudflareContext.mockResolvedValue({ env: { DB: d1.db } })
    const { checkRateLimit } = await import("./rate-limit")

    const result = await checkRateLimit("event:retry", { limit: 3, windowMs: 60_000 })

    expect(result).toMatchObject({ ok: true, source: "d1" })
    expect(d1.batch).toHaveBeenCalledTimes(2)
    const attemptIds = d1.boundStatements
      .filter(({ sql }) => sql.includes("INSERT INTO rate_limit_attempts"))
      .map(({ args }) => args[0])
    expect(attemptIds).toHaveLength(2)
    expect(new Set(attemptIds).size).toBe(1)
  })

  it("fails closed after bounded production D1 retries", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const d1 = createD1Mock()
    d1.batch.mockRejectedValue(new Error("Cannot resolve D1 DB due to transient issue on remote node"))
    getCloudflareContext.mockResolvedValue({ env: { DB: d1.db } })
    vi.stubEnv("NODE_ENV", "production")
    const { checkRateLimit } = await import("./rate-limit")

    const result = await checkRateLimit("event:fallback", { limit: 3, windowMs: 60_000 })

    expect(result).toMatchObject({ ok: false, remaining: 0, source: "unavailable" })
    expect(d1.batch).toHaveBeenCalledTimes(3)
    expect(errorLog).toHaveBeenCalledWith(
      "Shared rate limiter unavailable",
      expect.objectContaining({
        phase: "query",
        attempts: 3,
        error: expect.objectContaining({
          message: "Cannot resolve D1 DB due to transient issue on remote node",
        }),
      })
    )
  })

  it("does not retry a permanent schema error and preserves its cause in logs", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const d1 = createD1Mock()
    d1.batch.mockRejectedValue(new Error("no such table: rate_limit_attempts: SQLITE_ERROR"))
    getCloudflareContext.mockResolvedValue({ env: { DB: d1.db } })
    vi.stubEnv("NODE_ENV", "production")
    const { checkRateLimit } = await import("./rate-limit")

    const result = await checkRateLimit("event:schema", { limit: 3, windowMs: 60_000 })

    expect(result).toMatchObject({ ok: false, source: "unavailable" })
    expect(d1.batch).toHaveBeenCalledOnce()
    expect(errorLog).toHaveBeenCalledWith(
      "Shared rate limiter unavailable",
      expect.objectContaining({
        error: expect.objectContaining({ message: expect.stringContaining("no such table") }),
      })
    )
  })

  it("denies every production attempt when shared limiting is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const d1 = createD1Mock()
    d1.batch.mockRejectedValue(new Error("no such table: rate_limit_attempts"))
    getCloudflareContext.mockResolvedValue({ env: { DB: d1.db } })
    vi.stubEnv("NODE_ENV", "production")
    const { checkRateLimit } = await import("./rate-limit")

    const results = await Promise.all([
      checkRateLimit("event:local-limit", { limit: 3, windowMs: 60_000 }),
      checkRateLimit("event:local-limit", { limit: 3, windowMs: 60_000 }),
      checkRateLimit("event:local-limit", { limit: 3, windowMs: 60_000 }),
      checkRateLimit("event:local-limit", { limit: 3, windowMs: 60_000 }),
    ])

    expect(results.filter(({ ok }) => ok)).toHaveLength(0)
    expect(results.filter(({ ok }) => !ok)).toHaveLength(4)
    expect(results.every(({ source }) => source === "unavailable")).toBe(true)
  })

  it("logs a genuine shared rate-limit breach separately from storage failures", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const d1 = createD1Mock()
    d1.batch.mockResolvedValue(successfulBatchResult(4, 99999))
    getCloudflareContext.mockResolvedValue({ env: { DB: d1.db } })
    const { checkRateLimit } = await import("./rate-limit")

    const result = await checkRateLimit("event:limited", { limit: 3, windowMs: 60_000 })

    expect(result).toMatchObject({ ok: false, source: "d1", resetAt: 99999 })
    expect(warning).toHaveBeenCalledWith("Rate limit exceeded", {
      scope: "event",
      source: "d1",
      limit: 3,
      resetAt: 99999,
    })
  })

  it("uses the local limiter during development when Cloudflare context is absent", async () => {
    getCloudflareContext.mockRejectedValue(new Error("not in a Worker"))
    const { checkRateLimit } = await import("./rate-limit")

    await expect(
      checkRateLimit("event:development", { limit: 1, windowMs: 1_000 })
    ).resolves.toMatchObject({ ok: true, source: "local" })
  })

  it("schedules bounded cleanup of expired shared counters and attempt markers", async () => {
    const waitUntil = vi.fn()
    const d1 = createD1Mock()
    getCloudflareContext.mockResolvedValue({
      env: { DB: d1.db },
      ctx: { waitUntil },
    })
    const { checkRateLimit } = await import("./rate-limit")

    await checkRateLimit("contact:cleanup", { limit: 3, windowMs: 60_000 })

    expect(d1.prepare.mock.calls.some(([sql]) => String(sql).includes("DELETE FROM rate_limit_attempts"))).toBe(true)
    expect(d1.prepare.mock.calls.some(([sql]) => String(sql).includes("DELETE FROM rate_limits"))).toBe(true)
    expect(waitUntil).toHaveBeenCalledTimes(1)
  })
})
