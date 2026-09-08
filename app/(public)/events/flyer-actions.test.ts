import { beforeEach, describe, expect, it, vi } from "vitest"

const requireAreaAdminSession = vi.fn()
const getDb = vi.fn()
const auth = vi.fn()
const uploadFlyer = vi.fn()
const deleteFlyer = vi.fn()
const verifyEventUploadToken = vi.fn()
const checkRateLimit = vi.fn()
const reservePublicEventFlyerUpload = vi.fn()
const releasePublicEventFlyerReservation = vi.fn()
vi.mock("@/lib/auth/guards", () => ({ requireAreaAdminSession }))
vi.mock("@/lib/db", () => ({ getDb }))
vi.mock("@/lib/auth", () => ({ auth }))
vi.mock("@/lib/r2", () => ({ uploadFlyer, deleteFlyer }))
vi.mock("@/lib/security/upload-token", () => ({ verifyEventUploadToken }))
vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit,
  getClientIp: vi.fn().mockResolvedValue("127.0.0.1"),
}))
vi.mock("@/lib/events/flyer-upload-budget", () => ({
  reservePublicEventFlyerUpload,
  releasePublicEventFlyerReservation,
}))
vi.mock("@/lib/utils/event-cache", () => ({ invalidateEventCaches: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

function mockPendingEventDb() {
  const dbClient = {}
  getDb.mockResolvedValue({
    $client: dbClient,
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ id: "event-1", status: "pending" }]),
        })),
      })),
    })),
  })
  verifyEventUploadToken.mockResolvedValue({
    eventId: "event-1",
    tokenId: "token-1",
    expiresAt: Date.now() + 60_000,
  })
  return dbClient
}

function createFlyerFormData() {
  const formData = new FormData()
  formData.set("uploadToken", "signed-token")
  formData.set("file", new File(["flyer"], "flyer.pdf", { type: "application/pdf" }))
  return formData
}

describe("flyer action authorization", () => {
  beforeEach(() => {
    requireAreaAdminSession.mockReset().mockResolvedValue(null)
    getDb.mockReset()
    auth.mockReset().mockResolvedValue(null)
    uploadFlyer.mockReset()
    deleteFlyer.mockReset().mockResolvedValue(undefined)
    verifyEventUploadToken.mockReset()
    checkRateLimit.mockReset().mockResolvedValue({ ok: true })
    reservePublicEventFlyerUpload.mockReset().mockResolvedValue(true)
    releasePublicEventFlyerReservation.mockReset()
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

  it("rejects an authorized reorder containing a flyer from another event", async () => {
    requireAreaAdminSession.mockResolvedValue({ user: { isAreaAdmin: true } })
    const update = vi.fn()
    getDb.mockResolvedValue({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ id: "flyer-1", eventId: "event-1" }]),
        })),
      })),
      update,
    })
    const { reorderEventFlyers } = await import("./flyer-actions")

    await expect(reorderEventFlyers("event-1", ["flyer-1", "flyer-other"])).resolves.toEqual({
      success: false,
      error: "One or more flyers do not belong to this event",
    })
    expect(update).not.toHaveBeenCalled()
  })

  it("allows an Area admin to reorder flyers belonging to the event", async () => {
    requireAreaAdminSession.mockResolvedValue({ user: { isAreaAdmin: true } })
    const where = vi.fn().mockResolvedValue(undefined)
    const set = vi.fn(() => ({ where }))
    const update = vi.fn(() => ({ set }))
    getDb.mockResolvedValue({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            { id: "flyer-1", eventId: "event-1" },
            { id: "flyer-2", eventId: "event-1" },
          ]),
        })),
      })),
      update,
    })
    const { reorderEventFlyers } = await import("./flyer-actions")

    await expect(reorderEventFlyers("event-1", ["flyer-2", "flyer-1"])).resolves.toEqual({ success: true })
    expect(update).toHaveBeenCalledTimes(2)
  })

  it("rejects an exhausted public upload before writing to R2", async () => {
    const dbClient = mockPendingEventDb()
    reservePublicEventFlyerUpload.mockResolvedValue(false)
    const { uploadEventFlyer } = await import("./flyer-actions")

    await expect(uploadEventFlyer("event-1", createFlyerFormData())).resolves.toEqual({
      success: false,
      error: "This event has reached its flyer upload limit.",
    })
    expect(reservePublicEventFlyerUpload).toHaveBeenCalledWith(
      dbClient,
      expect.objectContaining({ eventId: "event-1", tokenId: "token-1" })
    )
    expect(uploadFlyer).not.toHaveBeenCalled()
  })

  it("rejects rate-limited uploads before reserving capacity or writing to R2", async () => {
    mockPendingEventDb()
    checkRateLimit.mockResolvedValue({ ok: false })
    const { uploadEventFlyer } = await import("./flyer-actions")

    await expect(uploadEventFlyer("event-1", createFlyerFormData())).resolves.toEqual({
      success: false,
      error: "Too many uploads. Please try again later.",
    })
    expect(reservePublicEventFlyerUpload).not.toHaveBeenCalled()
    expect(uploadFlyer).not.toHaveBeenCalled()
  })

  it("releases reserved capacity when R2 rejects the file", async () => {
    const dbClient = mockPendingEventDb()
    uploadFlyer.mockResolvedValue({ success: false, error: "Invalid file type" })
    const { uploadEventFlyer } = await import("./flyer-actions")

    await expect(uploadEventFlyer("event-1", createFlyerFormData())).resolves.toEqual({
      success: false,
      error: "Invalid file type",
    })
    expect(releasePublicEventFlyerReservation).toHaveBeenCalledWith(
      dbClient,
      expect.any(String)
    )
  })

  it("assigns flyer order atomically in D1", async () => {
    auth.mockResolvedValue({ user: { email: "admin@example.test" } })
    uploadFlyer.mockResolvedValue({
      success: true,
      key: "flyers/event-1/flyer.pdf",
      fileName: "flyer.pdf",
      fileType: "application/pdf",
      fileSize: 42,
    })
    const run = vi.fn().mockResolvedValue({ success: true })
    const bind = vi.fn(() => ({ run }))
    const prepare = vi.fn((query: string) => {
      void query
      return { bind }
    })
    getDb.mockResolvedValue({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ id: "event-1", districtNumber: 12 }]),
          })),
        })),
      })),
      $client: { prepare },
    })
    const formData = new FormData()
    formData.set("file", new File(["flyer"], "flyer.pdf", { type: "application/pdf" }))
    const { uploadEventFlyer } = await import("./flyer-actions")

    await expect(uploadEventFlyer("event-1", formData)).resolves.toMatchObject({ success: true })
    expect(prepare.mock.calls[0][0]).toContain('COALESCE(MAX("order"), -1) + 1')
    expect(bind).toHaveBeenCalledWith(
      expect.any(String),
      "event-1",
      "flyers/event-1/flyer.pdf",
      "flyer.pdf",
      "application/pdf",
      42,
      "event-1"
    )
    expect(deleteFlyer).not.toHaveBeenCalled()
  })

  it("removes an uploaded flyer when its metadata cannot be saved", async () => {
    auth.mockResolvedValue({ user: { email: "admin@example.test" } })
    uploadFlyer.mockResolvedValue({
      success: true,
      key: "flyers/event-1/orphan.pdf",
      fileName: "orphan.pdf",
      fileType: "application/pdf",
      fileSize: 42,
    })
    const prepare = vi.fn((query: string) => {
      void query
      return {
        bind: vi.fn(() => ({ run: vi.fn().mockRejectedValue(new Error("D1 unavailable")) })),
      }
    })
    getDb.mockResolvedValue({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ id: "event-1", districtNumber: 12 }]),
          })),
        })),
      })),
      $client: { prepare },
    })
    const formData = new FormData()
    formData.set("file", new File(["flyer"], "orphan.pdf", { type: "application/pdf" }))
    const { uploadEventFlyer } = await import("./flyer-actions")

    await expect(uploadEventFlyer("event-1", formData)).resolves.toEqual({
      success: false,
      error: "Failed to save flyer. Please try again.",
    })
    expect(deleteFlyer).toHaveBeenCalledWith("flyers/event-1/orphan.pdf")
  })
})
