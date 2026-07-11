import { beforeEach, describe, expect, it, vi } from "vitest"

const getCloudflareContext = vi.fn()
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }))

describe("shared rate limiting", () => {
  beforeEach(() => {
    vi.resetModules()
    getCloudflareContext.mockReset()
  })

  it("uses an atomic D1 upsert and stores only a hash of the client key", async () => {
    const first = vi.fn().mockResolvedValue({ count: 2, resetAt: 12345 })
    const bind = vi.fn().mockReturnValue({ first })
    const prepare = vi.fn().mockReturnValue({ bind })
    getCloudflareContext.mockResolvedValue({ env: { DB: { prepare } } })
    const { checkRateLimit } = await import("./rate-limit")

    const result = await checkRateLimit("contact:203.0.113.7", { limit: 3, windowMs: 60_000 })

    expect(result).toMatchObject({ ok: true, remaining: 1, source: "d1" })
    expect(prepare.mock.calls[0][0]).toContain("ON CONFLICT(key_hash) DO UPDATE")
    expect(bind.mock.calls[0][0]).toMatch(/^v1:[a-f0-9]{64}$/)
    expect(bind.mock.calls[0][0]).not.toContain("203.0.113.7")
  })

  it("fails closed when shared storage is unavailable in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    getCloudflareContext.mockRejectedValue(new Error("unavailable"))
    const { checkRateLimit } = await import("./rate-limit")

    await expect(checkRateLimit("event:test", { limit: 1, windowMs: 1_000 })).resolves.toMatchObject({
      ok: false,
      source: "unavailable",
    })
    vi.unstubAllEnvs()
  })

  it("schedules bounded cleanup of expired shared counters", async () => {
    const waitUntil = vi.fn()
    const cleanupRun = vi.fn().mockResolvedValue({ success: true })
    const prepare = vi.fn((sql: string) => ({
      bind: (...args: unknown[]) => sql.includes("INSERT INTO rate_limits")
        ? { first: vi.fn().mockResolvedValue({ count: 1, resetAt: 12345 }) }
        : { run: cleanupRun, args },
    }))
    getCloudflareContext.mockResolvedValue({ env: { DB: { prepare } }, ctx: { waitUntil } })
    const { checkRateLimit } = await import("./rate-limit")

    await checkRateLimit("contact:cleanup", { limit: 3, windowMs: 60_000 })

    expect(prepare.mock.calls.some(([sql]) => String(sql).includes("DELETE FROM rate_limits"))).toBe(true)
    expect(waitUntil).toHaveBeenCalledTimes(1)
  })
})
