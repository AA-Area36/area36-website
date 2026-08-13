import { afterEach, describe, expect, it, vi } from "vitest"
import type { Event } from "@/lib/db/schema"

const { getDb, recordError } = vi.hoisted(() => ({
  getDb: vi.fn(),
  recordError: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  getDb,
}))
vi.mock("@/lib/monitoring/errors", () => ({ recordError }))

import {
  DistrictDataUnavailableError,
  getDistrictAllUpdates,
  getDistrictContacts,
  getDistrictPositions,
  getDistrictPublicEvents,
  getDistrictPublishedUpdates,
  getDistrictSiteConfig,
} from "./queries"

function weeklyEvent(): Event {
  return {
    id: "weekly", title: "Weekly meeting", date: "2026-07-06", endDate: null,
    startTime: "19:00", endTime: "20:00", timezone: "America/Chicago",
    locationType: "in-person", address: "123 Main St", meetingLink: null,
    description: "District meeting", districtNumber: 24, type: "District",
    status: "approved", submitterEmail: "test@example.com", submissionKey: null, flyerUrl: null,
    denialReason: null, timeTBD: false, addressTBD: false, meetingLinkTBD: false,
    isRecurring: true, recurrenceType: "weekly", recurrencePattern: "[1]",
    monthlyPatternType: null, monthlyPatternValue: null, recurUntil: "2026-07-31",
    createdAt: "2026-07-01", updatedAt: "2026-07-01", reviewedBy: null, reviewedAt: null,
  }
}

describe("getDistrictPublicEvents", () => {
  afterEach(() => {
    vi.useRealTimers()
    getDb.mockReset()
    recordError.mockClear()
  })

  it("queries relations and expands upcoming occurrences while applying exceptions", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-11T12:00:00Z"))
    const select = vi.fn()
      .mockReturnValueOnce({ from: () => ({ where: () => ({ orderBy: () => ({ all: async () => [weeklyEvent()] }) }) }) })
      .mockReturnValueOnce({ from: () => ({ where: () => ({ all: async () => [{ eventId: "weekly", type: "District" }] }) }) })
      .mockReturnValueOnce({ from: () => ({ where: () => ({ orderBy: () => ({ all: async () => [] }) }) }) })
      .mockReturnValueOnce({ from: () => ({ where: () => ({ all: async () => [{
        id: "cancelled", eventId: "weekly", occurrenceDate: "2026-07-20",
        exceptionType: "cancelled", title: null, startTime: null, endTime: null,
        endDate: null, locationType: null, address: null, meetingLink: null,
        description: null, timeTBD: null, addressTBD: null, meetingLinkTBD: null,
        createdAt: "2026-07-01", createdBy: null,
      }] }) }) })
    getDb.mockResolvedValue({ select })

    const events = await getDistrictPublicEvents(24)

    expect(events.map((event) => event.date)).toEqual(["2026-07-13", "2026-07-27"])
    expect(events.some((event) => event.date === "2026-07-20")).toBe(false)
    expect(select).toHaveBeenCalledTimes(4)
  })

  it("throws a typed unavailable error instead of returning empty content on D1 failure", async () => {
    getDb.mockRejectedValue(new Error("D1 unavailable"))
    const queries = [
      getDistrictPublicEvents,
      getDistrictContacts,
      getDistrictPositions,
      getDistrictPublishedUpdates,
      getDistrictAllUpdates,
      getDistrictSiteConfig,
    ]

    for (const query of queries) {
      await expect(query(24)).rejects.toBeInstanceOf(DistrictDataUnavailableError)
    }

    expect(recordError).toHaveBeenCalledTimes(queries.length)
    for (const [entry] of recordError.mock.calls) {
      expect(entry).toMatchObject({
        kind: "D1_QUERY_FAILED",
      })
      expect(entry.messageOverride).not.toContain("D1 unavailable")
    }
  })
})
