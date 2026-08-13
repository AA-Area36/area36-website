import { beforeEach, describe, expect, it, vi } from "vitest"

const requireAreaAdminSession = vi.fn()
const getDb = vi.fn()
vi.mock("@/lib/auth/guards", () => ({ requireAreaAdminSession }))
vi.mock("@/lib/db", () => ({ getDb }))
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/r2", () => ({ deleteImage: vi.fn(), deleteImagesByPrefix: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

describe("subscription drive reads", () => {
  beforeEach(() => {
    requireAreaAdminSession.mockReset().mockResolvedValue(null)
    getDb.mockReset()
  })

  it("rejects private submission reads before querying D1", async () => {
    const { getDriveSubmissions } = await import("./actions")
    await expect(getDriveSubmissions("drive-1")).rejects.toThrow("Unauthorized")
    expect(getDb).not.toHaveBeenCalled()
  })
})
