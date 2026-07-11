import { beforeEach, describe, expect, it, vi } from "vitest"

const getCloudflareContext = vi.fn()
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }))

import { runSharedSingleFlight, runSingleFlight } from "./single-flight"

describe("runSingleFlight", () => {
  beforeEach(() => {
    getCloudflareContext.mockReset().mockRejectedValue(new Error("local runtime"))
  })

  it("coalesces concurrent work for the same key", async () => {
    let resolve!: (value: string) => void
    const task = vi.fn(() => new Promise<string>((done) => { resolve = done }))

    const first = runSingleFlight("same-key", task)
    const second = runSingleFlight("same-key", task)
    expect(task).toHaveBeenCalledTimes(1)
    resolve("value")
    await expect(Promise.all([first, second])).resolves.toEqual(["value", "value"])
  })

  it("allows a new refresh after the prior work completes", async () => {
    const task = vi.fn().mockResolvedValue("value")
    await runSingleFlight("repeat-key", task)
    await runSingleFlight("repeat-key", task)
    expect(task).toHaveBeenCalledTimes(2)
  })

  it("uses a D1 lease and releases it after a shared cache fill", async () => {
    const prepare = vi.fn((sql: string) => ({
      bind: (...args: unknown[]) => sql.includes("INSERT INTO cache_refresh_leases")
        ? { first: vi.fn().mockResolvedValue({ owner: args[1] }) }
        : { run: vi.fn().mockResolvedValue({ success: true }) },
    }))
    getCloudflareContext.mockResolvedValue({ env: { DB: { prepare } } })
    const task = vi.fn().mockResolvedValue("fresh")

    await expect(runSharedSingleFlight("lease-key", async () => null, task)).resolves.toBe("fresh")

    expect(task).toHaveBeenCalledTimes(1)
    expect(prepare.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO cache_refresh_leases"))).toBe(true)
    expect(prepare.mock.calls.some(([sql]) => String(sql).includes("DELETE FROM cache_refresh_leases"))).toBe(true)
  })

  it("returns stale fallback instead of duplicating another isolate's refresh", async () => {
    const prepare = vi.fn(() => ({
      bind: () => ({ first: vi.fn().mockResolvedValue(null) }),
    }))
    getCloudflareContext.mockResolvedValue({ env: { DB: { prepare } } })
    const task = vi.fn().mockResolvedValue("fresh")

    await expect(runSharedSingleFlight(
      "contended-key",
      async () => null,
      task,
      { fallback: () => "stale" }
    )).resolves.toBe("stale")
    expect(task).not.toHaveBeenCalled()
  })

  it("falls back to isolate work when D1 lease coordination is unavailable", async () => {
    const prepare = vi.fn(() => ({
      bind: () => ({ first: vi.fn().mockRejectedValue(new Error("D1 unavailable")) }),
    }))
    getCloudflareContext.mockResolvedValue({ env: { DB: { prepare } } })
    const task = vi.fn().mockResolvedValue("fresh")

    await expect(runSharedSingleFlight("d1-outage", async () => null, task)).resolves.toBe("fresh")
    expect(task).toHaveBeenCalledTimes(1)
  })
})
