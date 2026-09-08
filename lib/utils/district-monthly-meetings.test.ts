import { describe, expect, it } from "vitest"
import { districtDirectory } from "@/lib/constants/district-directory"
import { buildDistrictMonthlyMeetingOccurrences } from "./district-monthly-meetings"

describe("District 14 September 2026 reschedule", () => {
  const directory = districtDirectory.filter((district) => district.number === 14)

  it("moves only September's meeting and preserves its identity and details", () => {
    const meetings = buildDistrictMonthlyMeetingOccurrences(
      new Date(2026, 7, 1), new Date(2026, 9, 31), directory,
    )
    expect(meetings.map((meeting) => meeting.date)).toEqual([
      "2026-08-03", "2026-09-14", "2026-10-05",
    ])
    expect(meetings[1]).toMatchObject({
      id: "district-meeting:14:2026-09-07",
      title: "District 14 Monthly Meeting",
      startTime: "19:00",
      isModified: true,
    })
    expect(meetings[1].description).toContain("Rescheduled from 2026-09-07 to 2026-09-14.")
  })

  it("uses the new date when filtering after the original meeting date", () => {
    expect(buildDistrictMonthlyMeetingOccurrences(
      new Date(2026, 8, 8), new Date(2026, 8, 14), directory,
    ).map((meeting) => meeting.date)).toEqual(["2026-09-14"])
    expect(buildDistrictMonthlyMeetingOccurrences(
      new Date(2026, 8, 1), new Date(2026, 8, 7), directory,
    )).toEqual([])
  })
})
