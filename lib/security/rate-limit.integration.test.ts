// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createSqliteD1 } from "../../tests/helpers/sqlite-d1"
const { getCloudflareContext } = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }))
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }))
import { checkRateLimit } from "./rate-limit"

let database: ReturnType<typeof createSqliteD1>
beforeEach(() => {
  database = createSqliteD1()
  database.migrate()
  vi.stubEnv("NODE_ENV", "production")
  vi.spyOn(console, "warn").mockImplementation(() => undefined)
  getCloudflareContext.mockResolvedValue({ env: { DB: database.client } })
})
afterEach(() => { database.sqlite.close(); vi.restoreAllMocks(); vi.unstubAllEnvs() })
const count = () => database.sqlite.prepare("SELECT count FROM rate_limits").get()?.count
const attempts = () => database.sqlite.prepare("SELECT count(*) AS n FROM rate_limit_attempts").get()?.n

describe("rate-limit SQL transaction integration", () => {
  it("counts each concurrent request once even when a committed response is lost and retried", async () => {
    const batch = database.client.batch.bind(database.client)
    let loseResponse = true
    vi.spyOn(database.client, "batch").mockImplementation(async (statements) => {
      const loseThisResponse = loseResponse
      loseResponse = false
      const result = await batch(statements)
      if (loseThisResponse) throw new Error("Network connection lost after commit")
      return result
    })
    const results = await Promise.all(Array.from({ length: 16 }, () => checkRateLimit("review:concurrent", { limit: 50, windowMs: 60_000 })))
    expect(results.every((result) => result.ok && result.source === "d1")).toBe(true)
    expect(database.client.batch).toHaveBeenCalledTimes(17)
    expect(count()).toBe(16)
    expect(attempts()).toBe(16)
  })

  it("enforces a single shared budget across concurrent requests", async () => {
    const results = await Promise.all(Array.from({ length: 16 }, () => checkRateLimit("review:budget", { limit: 3, windowMs: 60_000 })))
    expect(results.filter((result) => result.ok)).toHaveLength(3)
    expect(count()).toBe(16)
    expect(attempts()).toBe(16)
  })

  it("rolls back both the attempt and triggered counter if a batch statement fails", async () => {
    await expect(database.client.batch([
      database.client.prepare("INSERT INTO rate_limit_attempts VALUES (?, ?, ?, ?)").bind("attempt", "key", 2000, 1000),
      database.client.prepare("SELECT * FROM missing_table"),
    ])).rejects.toThrow()
    expect(attempts()).toBe(0)
    expect(count()).toBeUndefined()
  })

  it("starts a fresh budget after the window expires", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(10_000)
    expect((await checkRateLimit("review:window", { limit: 1, windowMs: 1000 })).ok).toBe(true)
    expect((await checkRateLimit("review:window", { limit: 1, windowMs: 1000 })).ok).toBe(false)
    now.mockReturnValue(11_000)
    const result = await checkRateLimit("review:window", { limit: 1, windowMs: 1000 })
    expect(result).toMatchObject({ ok: true, resetAt: 12_000, source: "d1" })
    expect(count()).toBe(1)
  })
})
