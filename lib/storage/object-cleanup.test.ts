import { describe, expect, it, vi } from "vitest"
import { processPendingObjectCleanup } from "./object-cleanup"
describe("durable object cleanup", () => {
  it("keeps failed work queued and retries an idempotent delete", async () => {
    const queued = new Set(["flyers/fixture/object"])
    const prepare = vi.fn((sql: string) => ({
      all: async () => ({ results: [...queued].map(object_key => ({ object_key })) }),
      bind: (key: string) => ({ run: async () => { if (sql.startsWith("DELETE")) queued.delete(key); return { success: true } } }),
    }))
    const remove = vi.fn().mockRejectedValueOnce(new Error("R2 fixture outage")).mockResolvedValue(undefined)
    const env = { DB: { prepare }, DRIVE_IMAGES: { delete: remove } } as unknown as Pick<CloudflareEnv, "DB" | "DRIVE_IMAGES">
    await processPendingObjectCleanup(env)
    expect(queued.size).toBe(1)
    await processPendingObjectCleanup(env)
    expect(queued.size).toBe(0)
    expect(remove).toHaveBeenCalledTimes(2)
  })
})
