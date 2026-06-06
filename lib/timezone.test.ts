import { describe, expect, it } from "vitest"
import { formatTimeForDisplay, formatTimeRange } from "./timezone"

describe("event time formatting", () => {
  it("formats stored wall-clock times without timezone shifting", () => {
    expect(formatTimeForDisplay("13:30")).toBe("1:30 PM")
  })

  it("formats midnight, noon, and single-digit hour values", () => {
    expect(formatTimeForDisplay("00:00")).toBe("12:00 AM")
    expect(formatTimeForDisplay("12:00")).toBe("12:00 PM")
    expect(formatTimeForDisplay("9:05")).toBe("9:05 AM")
  })

  it("formats time ranges and missing start times", () => {
    expect(formatTimeRange("09:00", "10:30")).toBe("9:00 AM - 10:30 AM")
    expect(formatTimeRange("18:15", null)).toBe("6:15 PM")
    expect(formatTimeRange(null, "10:30")).toBe("Time TBD")
  })
})
