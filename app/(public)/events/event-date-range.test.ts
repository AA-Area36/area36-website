import { describe, expect, it } from "vitest"
import { parseEventDateParam, parseEventDateRange } from "./event-date-range"

function format(date: Date | undefined) {
  if (!date) return undefined
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

describe("event date URL parsing", () => {
  it("accepts exact real calendar dates including leap day", () => {
    expect(format(parseEventDateParam("2028-02-29") ?? undefined)).toBe("2028-02-29")
  })

  it.each([
    "garbage",
    "2026-2-03",
    "2026-02-3",
    "2026-02-30",
    "2026-04-31",
    "2025-02-29",
    "1999-12-31",
    "2101-01-01",
  ])("rejects malformed, impossible, or extreme date %s", (value) => {
    expect(parseEventDateParam(value)).toBeNull()
  })

  it("supports a valid open-ended range", () => {
    const range = parseEventDateRange("2026-08-05", null)
    expect(format(range?.from)).toBe("2026-08-05")
    expect(range?.to).toBeUndefined()
  })

  it("normalizes a reversed range into chronological order", () => {
    const range = parseEventDateRange("2026-08-20", "2026-08-05")
    expect(format(range?.from)).toBe("2026-08-05")
    expect(format(range?.to)).toBe("2026-08-20")
  })

  it("discards the range when a supplied endpoint is invalid", () => {
    expect(parseEventDateRange("garbage", "2026-08-20")).toBeUndefined()
    expect(parseEventDateRange("2026-08-05", "garbage")).toBeUndefined()
    expect(parseEventDateRange(null, "2026-08-20")).toBeUndefined()
  })
})
