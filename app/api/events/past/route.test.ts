// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getEventsForDateRange: vi.fn(),
  loadEventRelations: vi.fn(),
  recordError: vi.fn(),
  trackerTime: vi.fn(),
  trackerFinish: vi.fn(),
}))

vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }))
vi.mock("@/lib/utils/event-queries", () => ({
  getEventsForDateRange: mocks.getEventsForDateRange,
}))
vi.mock("@/lib/events/load-event-relations", () => ({
  loadEventRelations: mocks.loadEventRelations,
}))
vi.mock("@/lib/monitoring/errors", () => ({ recordError: mocks.recordError }))
vi.mock("@/lib/logger", () => ({
  createRequestLogger: () => ({
    requestId: "request-test",
    tracker: { time: mocks.trackerTime, finish: mocks.trackerFinish },
    error: vi.fn(),
  }),
}))

import { GET } from "./route"

function displayEvent(day: number, year = 2026) {
  return {
    id: `event-${day}`,
    title: `Event ${day}`,
    description: "",
    date: `${year}-07-${String(day).padStart(2, "0")}`,
    endDate: null,
    startTime: "10:00",
    meetingLink: null,
    address: null,
    types: [],
  }
}

describe("past event query windows", () => {
  const select = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-05T12:00:00.000Z"))
    vi.clearAllMocks()
    mocks.trackerTime.mockImplementation(async (_name: string, operation: () => unknown) => operation())
    const where = vi.fn().mockResolvedValue([{ id: "candidate" }])
    select.mockImplementation(() => ({ from: vi.fn(() => ({ where })) }))
    mocks.getDb.mockResolvedValue({ select })
    mocks.loadEventRelations.mockImplementation(async (_db, rows) => rows)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("stops after the newest bounded window when it has a page and look-ahead", async () => {
    mocks.getEventsForDateRange.mockReturnValue([
      displayEvent(30),
      displayEvent(29),
      displayEvent(28),
      displayEvent(27),
      displayEvent(26),
      displayEvent(25),
    ])

    const response = await GET(new Request("https://area36.org/api/events/past"))
    const body = await response.json() as { events: unknown[]; nextCursor: string | null }

    expect(response.status).toBe(200)
    expect(body.events).toHaveLength(5)
    expect(body.nextCursor).toContain("2026-07-26")
    expect(select).toHaveBeenCalledOnce()
    expect(mocks.loadEventRelations).toHaveBeenCalledOnce()
    expect(mocks.getEventsForDateRange).toHaveBeenCalledOnce()
  })

  it("reads the next non-overlapping window only when the newer window is sparse", async () => {
    mocks.getEventsForDateRange
      .mockReturnValueOnce([])
      .mockReturnValueOnce([
        displayEvent(24, 2023),
        displayEvent(23, 2023),
        displayEvent(22, 2023),
        displayEvent(21, 2023),
        displayEvent(20, 2023),
        displayEvent(19, 2023),
      ])

    await GET(new Request("https://area36.org/api/events/past"))

    expect(select).toHaveBeenCalledTimes(2)
    const firstRangeStart = mocks.getEventsForDateRange.mock.calls[0][1] as Date
    const secondRangeEnd = mocks.getEventsForDateRange.mock.calls[1][2] as Date
    const dayBeforeFirstStart = new Date(firstRangeStart)
    dayBeforeFirstStart.setDate(dayBeforeFirstStart.getDate() - 1)
    expect(secondRangeEnd.toDateString()).toBe(dayBeforeFirstStart.toDateString())
  })
})
