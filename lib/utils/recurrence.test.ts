import { describe, expect, it } from "vitest"
import type { Event } from "@/lib/db/schema"
import { generateOccurrenceDates } from "./recurrence"

function monthlyEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "monthly",
    title: "Monthly meeting",
    date: "2016-01-15",
    endDate: null,
    startTime: "19:00",
    endTime: "20:00",
    timezone: "America/Chicago",
    locationType: "in-person",
    address: null,
    meetingLink: null,
    description: "Monthly service meeting",
    districtNumber: null,
    type: "Meeting",
    status: "approved",
    submitterEmail: "test@example.com",
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
    monthlyPatternValue: "15",
    recurUntil: null,
    createdAt: "2016-01-01",
    updatedAt: "2016-01-01",
    reviewedBy: null,
    reviewedAt: null,
    ...overrides,
  }
}

describe("monthly recurrence archive expansion", () => {
  it("covers every month in a ten-year requested window", () => {
    const occurrences = generateOccurrenceDates(
      monthlyEvent(),
      new Date(2016, 0, 1),
      new Date(2025, 11, 31)
    )

    expect(occurrences).toHaveLength(120)
    expect(occurrences[0]).toBe("2016-01-15")
    expect(occurrences.at(-1)).toBe("2025-12-15")
  })

  it("honors the recurrence end inside a longer requested window", () => {
    const occurrences = generateOccurrenceDates(
      monthlyEvent({ recurUntil: "2021-06-15" }),
      new Date(2016, 0, 1),
      new Date(2025, 11, 31)
    )

    expect(occurrences.at(-1)).toBe("2021-06-15")
    expect(occurrences).toHaveLength(66)
  })

  it("keeps a hard 121-month cap for unvalidated callers", () => {
    const occurrences = generateOccurrenceDates(
      monthlyEvent(),
      new Date(2016, 0, 1),
      new Date(2035, 11, 31)
    )

    expect(occurrences).toHaveLength(121)
    expect(occurrences.at(-1)).toBe("2026-01-15")
  })
})
