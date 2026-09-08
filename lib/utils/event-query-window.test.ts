import { describe, expect, it } from "vitest"
import {
  getPastEventCandidateStart,
  getPastEventQueryWindows,
} from "./event-query-window"

describe("getPastEventCandidateStart", () => {
  it("bounds the default past-event candidate query to ten years", () => {
    expect(getPastEventCandidateStart("2026-07-23", null)).toBe("2016-07-23")
  })

  it("preserves an explicit start date within the supported history", () => {
    expect(getPastEventCandidateStart("2026-07-23", "2021-01-01")).toBe("2021-01-01")
  })

  it("clamps an explicit start date to ten years", () => {
    expect(getPastEventCandidateStart("2026-07-23", "2012-01-01")).toBe("2016-07-23")
  })

  it("handles leap-day range ends deterministically", () => {
    expect(getPastEventCandidateStart("2024-02-29", null)).toBe("2014-03-01")
  })
})

describe("getPastEventQueryWindows", () => {
  it("creates newest-first non-overlapping windows", () => {
    expect(getPastEventQueryWindows("2026-07-23", "2021-01-01")).toEqual([
      { start: "2024-07-23", end: "2026-07-23" },
      { start: "2022-07-22", end: "2024-07-22" },
      { start: "2021-01-01", end: "2022-07-21" },
    ])
  })

  it("bounds the default history to ten years", () => {
    const windows = getPastEventQueryWindows("2026-07-23", null)

    expect(windows).toHaveLength(5)
    expect(windows[0]).toEqual({ start: "2024-07-23", end: "2026-07-23" })
    expect(windows.at(-1)?.start).toBe("2016-07-23")
    for (let index = 1; index < windows.length; index++) {
      const previousStart = new Date(`${windows[index - 1].start}T00:00:00Z`)
      previousStart.setUTCDate(previousStart.getUTCDate() - 1)
      expect(windows[index].end).toBe(previousStart.toISOString().slice(0, 10))
    }
  })
})
