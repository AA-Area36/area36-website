import { beforeEach, describe, expect, it, vi } from "vitest"

const requireHostedDistrictAccessSession = vi.fn()
const getDb = vi.fn()
const invalidateEventCaches = vi.fn()
const enqueueEventFlyerCleanup = vi.fn()
const completeEventFlyerCleanup = vi.fn()

vi.mock("@/lib/auth/guards", () => ({ requireHostedDistrictAccessSession }))
vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  getDb,
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/utils/event-cache", () => ({ invalidateEventCaches }))
vi.mock("@/lib/events/flyer-cleanup", () => ({
  enqueueEventFlyerCleanup,
  completeEventFlyerCleanup,
}))

describe("district event deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireHostedDistrictAccessSession.mockResolvedValue({
      user: { email: "district@example.com" },
    })
    enqueueEventFlyerCleanup.mockReturnValue({ kind: "queue-cleanup" })
    completeEventFlyerCleanup.mockResolvedValue(1)
    invalidateEventCaches.mockResolvedValue(undefined)
  })

  it("scopes the event, queues deletion atomically, and cleans its R2 flyers", async () => {
    const deleteQuery = { kind: "delete-event" }
    const batch = vi.fn().mockResolvedValue(undefined)
    const database = {
      select: () => ({
        from: () => ({
          where: () => ({
            get: vi.fn().mockResolvedValue({ id: "event-1" }),
          }),
        }),
      }),
      delete: () => ({
        where: vi.fn(() => deleteQuery),
      }),
      batch,
    }
    getDb.mockResolvedValue(database)
    const formData = new FormData()
    formData.set("districtNumber", "24")
    formData.set("eventId", "event-1")
    const { deleteDistrictEvent } = await import("./actions")

    await deleteDistrictEvent(formData)

    expect(requireHostedDistrictAccessSession).toHaveBeenCalledWith(24)
    expect(batch).toHaveBeenCalledWith([
      { kind: "queue-cleanup" },
      deleteQuery,
    ])
    expect(completeEventFlyerCleanup).toHaveBeenCalledWith(database, "event-1")
    expect(invalidateEventCaches).toHaveBeenCalledWith(24)
  })
})
