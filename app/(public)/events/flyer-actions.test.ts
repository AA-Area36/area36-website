import { beforeEach, describe, expect, it, vi } from "vitest"

const requireAreaAdminSession = vi.fn()
const getDb = vi.fn()
vi.mock("@/lib/auth/guards", () => ({ requireAreaAdminSession }))
vi.mock("@/lib/db", () => ({ getDb }))
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/r2", () => ({ uploadFlyer: vi.fn(), deleteFlyer: vi.fn() }))
vi.mock("@/lib/security/upload-token", () => ({ verifyEventUploadToken: vi.fn() }))
vi.mock("@/lib/utils/event-cache", () => ({ invalidateEventCaches: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

describe("flyer action authorization", () => {
  beforeEach(() => {
    requireAreaAdminSession.mockReset().mockResolvedValue(null)
    getDb.mockReset()
  })

  it("rejects deletion before accessing storage", async () => {
    const { deleteEventFlyer } = await import("./flyer-actions")
    await expect(deleteEventFlyer("flyer-1")).resolves.toEqual({ success: false, error: "Unauthorized" })
    expect(getDb).not.toHaveBeenCalled()
  })

  it("rejects reordering before accessing storage", async () => {
    const { reorderEventFlyers } = await import("./flyer-actions")
    await expect(reorderEventFlyers("event-1", ["flyer-1"])).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    })
    expect(getDb).not.toHaveBeenCalled()
  })
})
