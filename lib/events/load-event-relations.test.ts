import { describe, expect, it, vi } from "vitest"
import {
  eventExceptions,
  eventFlyers,
  eventToTypes,
  type Event,
} from "@/lib/db/schema"
import { loadEventRelations } from "./load-event-relations"

function baseEvent(): Event {
  return {
    id: "event-1",
    title: "District meeting",
    date: "2026-07-23",
    endDate: null,
    startTime: "19:00",
    endTime: "20:00",
    timezone: "America/Chicago",
    locationType: "in-person",
    address: "123 Main St",
    meetingLink: null,
    description: "Monthly meeting",
    districtNumber: 24,
    type: null,
    status: "approved",
    submitterEmail: "member@example.com",
    submissionKey: null,
    flyerUrl: null,
    denialReason: null,
    timeTBD: false,
    addressTBD: false,
    meetingLinkTBD: false,
    isRecurring: true,
    recurrenceType: "monthly",
    recurrencePattern: null,
    monthlyPatternType: "dayOfMonth",
    monthlyPatternValue: "23",
    recurUntil: "2027-07-23",
    createdAt: "2026-07-01",
    updatedAt: "2026-07-01",
    reviewedBy: null,
    reviewedAt: null,
  }
}

function requestLog() {
  return {
    tracker: {
      time: async <T>(_name: string, operation: () => Promise<T>) => operation(),
    },
  }
}

describe("loadEventRelations", () => {
  it("does not query relation tables when no base events were selected", async () => {
    const select = vi.fn()

    const result = await loadEventRelations(
      { select } as never,
      [],
      requestLog() as never
    )

    expect(result).toEqual([])
    expect(select).not.toHaveBeenCalled()
  })

  it("scopes and combines each relation query for selected event IDs", async () => {
    const queriedTables: unknown[] = []
    const rowsByTable = new Map<unknown, unknown[]>([
      [eventToTypes, [{ eventId: "event-1", type: "District" }]],
      [
        eventFlyers,
        [
          {
            id: "flyer-1",
            eventId: "event-1",
            fileKey: "events/event-1/flyer.pdf",
            fileName: "flyer.pdf",
            fileType: "application/pdf",
            fileSize: 100,
            order: 0,
            createdAt: "2026-07-01",
          },
        ],
      ],
      [
        eventExceptions,
        [
          {
            id: "exception-1",
            eventId: "event-1",
            occurrenceDate: "2026-08-23",
            exceptionType: "cancelled",
            title: null,
            startTime: null,
            endTime: null,
            endDate: null,
            locationType: null,
            address: null,
            meetingLink: null,
            description: null,
            timeTBD: null,
            addressTBD: null,
            meetingLinkTBD: null,
            createdAt: "2026-07-01",
            createdBy: null,
          },
        ],
      ],
    ])

    const select = vi.fn(() => ({
      from: (table: unknown) => {
        const rows = rowsByTable.get(table) || []
        const builder = {
          where: vi.fn(() => {
            queriedTables.push(table)
            return builder
          }),
          orderBy: vi.fn(() => Promise.resolve(rows)),
          then: (
            onFulfilled: (value: unknown[]) => unknown,
            onRejected?: (reason: unknown) => unknown
          ) => Promise.resolve(rows).then(onFulfilled, onRejected),
        }
        return builder
      },
    }))

    const result = await loadEventRelations(
      { select } as never,
      [baseEvent()],
      requestLog() as never
    )

    expect(queriedTables).toEqual([eventToTypes, eventFlyers, eventExceptions])
    expect(result).toHaveLength(1)
    const loadedEvent = result[0]!
    expect(loadedEvent.types).toEqual(["District"])
    expect(loadedEvent.flyers.map((flyer) => flyer.id)).toEqual(["flyer-1"])
    expect(loadedEvent.exceptions?.map((exception) => exception.id)).toEqual(["exception-1"])
  })
})
