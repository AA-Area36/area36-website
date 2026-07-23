import { afterEach, describe, expect, it, vi } from "vitest"
import { processPendingEventFlyerCleanup } from "./flyer-cleanup"

function cleanupDatabase(eventId: string) {
  const statements: string[] = []
  const prepare = vi.fn((statement: string) => {
    statements.push(statement)
    return {
      bind: vi.fn(() => ({
        all: vi.fn().mockResolvedValue({ results: [{ eventId }] }),
        run: vi.fn().mockResolvedValue({ success: true }),
      })),
    }
  })

  return { database: { prepare } as unknown as D1Database, statements }
}

describe("pending event flyer cleanup", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("removes all paginated R2 objects and clears the durable job", async () => {
    const { database, statements } = cleanupDatabase("event-1")
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        objects: [{ key: "flyers/event-1/one.pdf" }],
        truncated: true,
        cursor: "page-2",
      })
      .mockResolvedValueOnce({
        objects: [{ key: "flyers/event-1/two.pdf" }],
        truncated: false,
      })
    const deleteObject = vi.fn().mockResolvedValue(undefined)

    const result = await processPendingEventFlyerCleanup({
      DB: database,
      DRIVE_IMAGES: { list, delete: deleteObject } as unknown as R2Bucket,
    })

    expect(result).toEqual({ cleaned: 1, failed: 0 })
    expect(list).toHaveBeenNthCalledWith(1, { prefix: "flyers/event-1/" })
    expect(list).toHaveBeenNthCalledWith(2, {
      prefix: "flyers/event-1/",
      cursor: "page-2",
    })
    expect(deleteObject.mock.calls.map(([key]) => key)).toEqual([
      "flyers/event-1/one.pdf",
      "flyers/event-1/two.pdf",
    ])
    expect(statements.some((statement) =>
      statement.includes("DELETE FROM event_flyer_cleanup_pending")
    )).toBe(true)
  })

  it("retains and increments a job after partial failure so a later run can retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    const { database, statements } = cleanupDatabase("event-2")
    const list = vi.fn().mockResolvedValue({
      objects: [{ key: "flyers/event-2/one.pdf" }],
      truncated: false,
    })
    const deleteObject = vi
      .fn()
      .mockRejectedValueOnce(new Error("R2 unavailable"))
      .mockResolvedValueOnce(undefined)
    const env = {
      DB: database,
      DRIVE_IMAGES: { list, delete: deleteObject } as unknown as R2Bucket,
    }

    await expect(processPendingEventFlyerCleanup(env)).resolves.toEqual({
      cleaned: 0,
      failed: 1,
    })
    expect(statements.some((statement) =>
      statement.includes("SET attempts = attempts + 1")
    )).toBe(true)

    await expect(processPendingEventFlyerCleanup(env)).resolves.toEqual({
      cleaned: 1,
      failed: 0,
    })
    expect(statements.some((statement) =>
      statement.includes("DELETE FROM event_flyer_cleanup_pending")
    )).toBe(true)
  })
})
