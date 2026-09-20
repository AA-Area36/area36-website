import { describe, expect, it } from "vitest"
import { eventEditSchema } from "./event"

const valid = { title: "Fixture event", date: "2026-10-01", startTime: "18:00", endTime: "20:00", timezone: "America/Chicago", locationType: "online", meetingLink: "https://example.test/meeting", description: "Synthetic meeting description", types: ["Meeting"] }
describe("admin event invariants", () => {
  it("accepts complete HTTPS meetings and rejects reversed times and missing hybrid address", () => {
    expect(eventEditSchema.safeParse(valid).success).toBe(true)
    expect(eventEditSchema.safeParse({ ...valid, endTime: "17:00" }).success).toBe(false)
    expect(eventEditSchema.safeParse({ ...valid, locationType: "hybrid" }).success).toBe(false)
  })
  it.each(["javascript:alert(1)", "data:text/plain,test", "file:///tmp/file", "//example.test", "https://example.test/\npath"])("rejects unsafe URL %s", meetingLink => {
    expect(eventEditSchema.safeParse({ ...valid, meetingLink }).success).toBe(false)
  })
})
