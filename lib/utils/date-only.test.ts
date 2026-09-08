import { describe, expect, it } from "vitest"
import { isDateOnly, addCalendarDays, calendarDayDifference } from "./date-only"
describe("calendar-only arithmetic", () => {
  it.each(["2026-02-29", "2026-02-31", "2026-13-01", "2026-00-01", "invalid"])("rejects impossible date %s", (value) => expect(isDateOnly(value)).toBe(false))
  it("handles leap days, month/year boundaries and DST without elapsed-hour rounding", () => {
    expect(isDateOnly("2028-02-29")).toBe(true)
    expect(addCalendarDays("2026-09-01", 1)).toBe("2026-09-02")
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(calendarDayDifference("2027-03-13", "2027-03-15")).toBe(2)
  })
})
