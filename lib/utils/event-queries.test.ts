import { describe, expect, it } from "vitest"
import type { EventWithRelations } from "@/lib/types/recurrence"
import { getEventsForDateRange } from "./event-queries"

function recurringEvent(): EventWithRelations {
  return {
    id: "weekly",
    title: "Weekly meeting",
    date: "2026-07-06",
    endDate: null,
    startTime: "19:00",
    endTime: "20:00",
    timezone: "America/Chicago",
    locationType: "in-person",
    address: "123 Main St, Mankato, MN 56001",
    meetingLink: null,
    description: "Weekly district meeting",
    districtNumber: 24,
    type: "District",
    status: "approved",
    submitterEmail: "test@example.com",
    submissionKey: null,
    flyerUrl: null,
    denialReason: null,
    timeTBD: false,
    addressTBD: false,
    meetingLinkTBD: false,
    isRecurring: true,
    recurrenceType: "weekly",
    recurrencePattern: JSON.stringify([1]),
    monthlyPatternType: null,
    monthlyPatternValue: null,
    recurUntil: "2026-07-31",
    createdAt: "2026-07-01",
    updatedAt: "2026-07-01",
    reviewedBy: null,
    reviewedAt: null,
    types: ["District"],
    flyers: [],
    exceptions: [{
      id: "cancelled",
      eventId: "weekly",
      occurrenceDate: "2026-07-20",
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
    }],
  }
}

describe("district-compatible event range expansion", () => {
  it("returns future recurring occurrences and omits cancelled dates", () => {
    const events = getEventsForDateRange(
      [recurringEvent()],
      new Date("2026-07-11T00:00:00Z"),
      new Date("2026-07-31T23:59:59Z")
    )
    expect(events.map((event) => event.date)).toEqual(["2026-07-13", "2026-07-27"])
  })
})
