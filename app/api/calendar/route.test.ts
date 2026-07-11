import { describe, expect, it } from "vitest"
import { buildICalTimingLines } from "./route"

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
})
