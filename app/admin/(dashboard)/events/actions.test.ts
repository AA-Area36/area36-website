import { beforeEach, describe, expect, it, vi } from "vitest"

const auth = vi.fn()
const getDb = vi.fn()
const revalidatePath = vi.fn()
const invalidateEventCaches = vi.fn()
const enqueueEventFlyerCleanup = vi.fn()
const completeEventFlyerCleanup = vi.fn()

vi.mock("@/lib/auth", () => ({ auth }))
vi.mock("@/lib/db", () => ({ getDb }))
vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("@/lib/utils/event-cache", () => ({ invalidateEventCaches }))
vi.mock("@/lib/events/flyer-cleanup", () => ({
  enqueueEventFlyerCleanup,
  completeEventFlyerCleanup,
}))
vi.mock("@/lib/email", () => ({
  sendDenialEmailToSubmitter: vi.fn(),
  sendDenialEmailToChair: vi.fn(),
}))

function eventDatabase() {
  const deleteQuery = { kind: "delete-event" }
  const batch = vi.fn().mockResolvedValue(undefined)
  const database = {
    select: () => ({
      from: () => ({
        where: vi.fn().mockResolvedValue([{ id: "event-1" }]),
      }),
    }),
    delete: () => ({
      where: vi.fn(() => deleteQuery),
    }),
    batch,
  }
  return { database, batch, deleteQuery }
}

describe("area event deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.mockResolvedValue({ user: { email: "admin@example.com" } })
    enqueueEventFlyerCleanup.mockReturnValue({ kind: "queue-cleanup" })
    completeEventFlyerCleanup.mockResolvedValue(2)
    invalidateEventCaches.mockResolvedValue(undefined)
  })

  it("atomically queues cleanup with deletion, then removes the R2 prefix", async () => {
    const { database, batch, deleteQuery } = eventDatabase()
    getDb.mockResolvedValue(database)
    const { deleteEvent } = await import("./actions")

    await deleteEvent("event-1")

    expect(batch).toHaveBeenCalledWith([
      { kind: "queue-cleanup" },
      deleteQuery,
    ])
    expect(completeEventFlyerCleanup).toHaveBeenCalledWith(database, "event-1")
    expect(invalidateEventCaches).toHaveBeenCalled()
  })

  it("invalidates deleted event caches while leaving a failed cleanup queued", async () => {
    const { database } = eventDatabase()
    getDb.mockResolvedValue(database)
    completeEventFlyerCleanup.mockRejectedValue(new Error("R2 unavailable"))
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    const { deleteEvent } = await import("./actions")

    await expect(deleteEvent("event-1")).rejects.toThrow(
      "Event deleted, but flyer cleanup is pending"
    )
    expect(invalidateEventCaches).toHaveBeenCalled()
  })
})

describe("event mutation validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.mockResolvedValue({ user: { email: "admin@example.com" } })
  })

  it.each([
    { date: "2026-02-31" },
    { endDate: "2026-08-31" },
    { startTime: '<img src=x onerror="alert(1)">' },
    { types: ["<b>injected</b>"] },
  ])("rejects malformed admin edits before database access: %j", async (changes) => {
    const { updateEvent, updateRecurringEvent } = await import("./actions")
    const data = { title: "Synthetic event", date: "2026-09-01", timezone: "America/Chicago", locationType: "in-person", types: ["Meeting"], description: "Test", ...changes }
    expect(await updateEvent("event-1", data as Parameters<typeof updateEvent>[1])).toMatchObject({ success: false })
    expect(await updateRecurringEvent("event-1", { ...data, scope: "series" } as Parameters<typeof updateRecurringEvent>[1])).toMatchObject({ success: false })
    expect(getDb).not.toHaveBeenCalled()
  })
})
