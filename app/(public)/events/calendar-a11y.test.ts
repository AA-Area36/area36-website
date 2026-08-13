import { describe, expect, it } from "vitest"
import { getCalendarCellLabel } from "./calendar-a11y"

describe("getCalendarCellLabel", () => {
  it("announces a date, current-day state, count, and event names", () => {
    expect(
      getCalendarCellLabel({
        date: new Date(2026, 6, 23),
        isToday: true,
        eventTitles: ["Area Assembly", "District Meeting"],
      }),
    ).toBe(
      "Thursday, July 23, 2026, today, 2 events: Area Assembly, District Meeting",
    )
  })

  it("announces an empty date without relying on the visual layout", () => {
    expect(
      getCalendarCellLabel({
        date: new Date(2026, 6, 24),
        isToday: false,
        eventTitles: [],
      }),
    ).toBe("Friday, July 24, 2026, no events")
  })
})
