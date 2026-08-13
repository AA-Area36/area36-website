import { describe, expect, it } from "vitest"
import { getPastEventCandidateStart } from "./event-query-window"

describe("getPastEventCandidateStart", () => {
  it("bounds the default past-event candidate query to ten years", () => {
    expect(getPastEventCandidateStart("2026-07-23", null)).toBe("2016-07-23")
  })

  it("preserves an explicit historical start date", () => {
    expect(getPastEventCandidateStart("2026-07-23", "2012-01-01")).toBe("2012-01-01")
  })

  it("handles leap-day range ends deterministically", () => {
    expect(getPastEventCandidateStart("2024-02-29", null)).toBe("2014-03-01")
  })
})
