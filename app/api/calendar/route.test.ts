import { describe, expect, it } from "vitest"
import type { Event, EventException } from "@/lib/db/schema"
import { buildICalTimingLines, generateExDates, generateRRule } from "./route"

function recurringTimeTbdEvent(): Event {
  return {
    id: "event-1", title: "TBD series", date: "2026-07-01", endDate: null,
    startTime: null, endTime: null, timezone: "America/Chicago", locationType: "in-person",
    address: null, meetingLink: null, description: "Description", districtNumber: null,
    type: "Meeting", status: "approved", submitterEmail: "test@example.com", flyerUrl: null,
    denialReason: null, timeTBD: true, addressTBD: false, meetingLinkTBD: false,
    isRecurring: true, recurrenceType: "weekly", recurrencePattern: "[3]",
    monthlyPatternType: null, monthlyPatternValue: null, recurUntil: "2026-07-31",
    createdAt: "2026-07-01", updatedAt: "2026-07-01", reviewedBy: null, reviewedAt: null,
  }
}

describe("calendar event timing", () => {
  it("represents Time TBD as a DATE value instead of midnight", () => {
    expect(buildICalTimingLines({
      date: "2026-08-10",
      endDate: null,
      startTime: null,
      endTime: null,
      timezone: "America/Chicago",
      timeTBD: true,
    })).toEqual(["DTSTART;VALUE=DATE:20260810"])
  })

  it("uses an exclusive DATE end for a multi-day TBD event", () => {
    expect(buildICalTimingLines({
      date: "2026-08-10",
      endDate: "2026-08-12",
      startTime: null,
      endTime: null,
      timezone: "America/Chicago",
      timeTBD: true,
    })).toEqual(["DTSTART;VALUE=DATE:20260810", "DTEND;VALUE=DATE:20260813"])
  })

  it("keeps recurrence rules and exclusions date-valued for a TBD series", () => {
    const event = recurringTimeTbdEvent()
    const exception = {
      eventId: event.id,
      occurrenceDate: "2026-07-15",
      exceptionType: "cancelled",
    } as EventException

    expect(generateRRule(event)).toContain("UNTIL=20260731")
    expect(generateRRule(event)).not.toContain("T235959Z")
    expect(generateExDates(event, [exception])).toEqual(["EXDATE;VALUE=DATE:20260715"])
  })
})
