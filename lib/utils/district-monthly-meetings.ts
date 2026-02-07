import type { DisplayEvent } from "@/lib/types/recurrence"
import { districtDirectory } from "@/lib/constants/district-directory"

const WEEKDAY_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function formatDateYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseMeetingDayPattern(
  meetingDay: string
): { weekOfMonth: number; dayOfWeek: number; label: string } | null {
  // Expected formats used in current district content, e.g.:
  // "3rd Wednesday", "1st Saturday", "2nd Friday", "4th Tuesday"
  const match = meetingDay.trim().match(/^(\d)(st|nd|rd|th)\s+(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/i)
  if (!match) return null

  const weekOfMonth = Number(match[1])
  const weekday = match[3].toLowerCase()
  const dayOfWeek = WEEKDAY_TO_INDEX[weekday]
  if (!Number.isFinite(weekOfMonth) || weekOfMonth < 1 || weekOfMonth > 5) return null
  if (dayOfWeek === undefined) return null

  return { weekOfMonth, dayOfWeek, label: `${match[1]}${match[2]} ${match[3]}` }
}

function getNthWeekdayOfMonth(year: number, monthIndex0: number, weekOfMonth: number, dayOfWeek: number): Date | null {
  // Find first day-of-week occurrence in the month, then add (week-1)*7.
  const firstOfMonth = new Date(year, monthIndex0, 1)
  const firstDow = firstOfMonth.getDay()
  const offset = (dayOfWeek - firstDow + 7) % 7
  const day = 1 + offset + (weekOfMonth - 1) * 7
  const candidate = new Date(year, monthIndex0, day)
  if (candidate.getMonth() !== monthIndex0) return null
  return candidate
}

function parseTimeTo24h(time: string): string | null {
  // Supports "6:30 PM", "7:00 PM", "6:00 PM"
  const m = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i)
  if (!m) return null
  let hours = Number(m[1])
  const minutes = Number(m[2] ?? "00")
  const ampm = m[3].toUpperCase()
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours < 1 || hours > 12) return null
  if (minutes < 0 || minutes > 59) return null
  if (ampm === "PM" && hours !== 12) hours += 12
  if (ampm === "AM" && hours === 12) hours = 0
  return `${pad2(hours)}:${pad2(minutes)}`
}

function deriveLocationType(location: string | undefined): "in-person" | "hybrid" | "online" {
  const lower = (location ?? "").toLowerCase()
  if (lower.includes("hybrid")) return "hybrid"
  if (lower.includes("zoom")) return "online"
  if (lower.includes("on zoom")) return "online"
  return "in-person"
}

export function buildDistrictMonthlyMeetingOccurrences(rangeStart: Date, rangeEnd: Date): DisplayEvent[] {
  const results: DisplayEvent[] = []

  // Normalize to first-of-month and iterate months through rangeEnd.
  const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
  const endMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1)

  // Pre-parse district patterns once.
  const districtPatterns = districtDirectory
    .map((district) => {
      if (!district.meetingDay) return null
      const pattern = parseMeetingDayPattern(district.meetingDay)
      if (!pattern) return null
      return { district, pattern }
    })
    .filter(Boolean) as Array<{
    district: (typeof districtDirectory)[number]
    pattern: NonNullable<ReturnType<typeof parseMeetingDayPattern>>
  }>

  while (cursor <= endMonth) {
    const year = cursor.getFullYear()
    const monthIndex0 = cursor.getMonth()

    for (const { district, pattern } of districtPatterns) {
      const meetingDate = getNthWeekdayOfMonth(year, monthIndex0, pattern.weekOfMonth, pattern.dayOfWeek)
      if (!meetingDate) continue
      if (meetingDate < rangeStart || meetingDate > rangeEnd) continue

      const dateStr = formatDateYmd(meetingDate)
      const locationType = deriveLocationType(district.meetingLocation)
      const startTime = district.meetingTime ? parseTimeTo24h(district.meetingTime) : null

      const addressParts: string[] = []
      if (district.meetingLocation) addressParts.push(district.meetingLocation)
      if (district.meetingAddress) addressParts.push(district.meetingAddress)
      const address = addressParts.length > 0 ? addressParts.join(", ") : null

      const descriptionParts: string[] = []
      descriptionParts.push(`${district.name} monthly meeting.`)
      if (district.meetingNote) descriptionParts.push(district.meetingNote)
      if (district.dcmEmail) descriptionParts.push(`Questions: ${district.dcmEmail}`)
      const description = descriptionParts.join("\n")

      const parentEventId = `district-meeting:${district.number}`

      results.push({
        id: `${parentEventId}:${dateStr}`,
        isRecurringInstance: true,
        parentEventId,
        title: `${district.name} Monthly Meeting`,
        date: dateStr,
        endDate: null,
        startTime,
        endTime: null,
        timezone: "America/Chicago",
        locationType,
        address,
        meetingLink: null,
        description,
        status: "approved",
        types: ["District"],
        flyers: [],
        timeTBD: !startTime,
        addressTBD: !address,
        meetingLinkTBD: locationType !== "in-person",
        submitterEmail: "",
        isRecurring: true,
        recurrenceDescription: `Monthly on ${pattern.label}`,
        recurUntil: null,
      })
    }

    cursor.setMonth(cursor.getMonth() + 1)
  }

  results.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    if (!a.startTime && !b.startTime) return 0
    if (!a.startTime) return 1
    if (!b.startTime) return -1
    return a.startTime.localeCompare(b.startTime)
  })

  return results
}

