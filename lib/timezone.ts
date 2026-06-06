export const TIMEZONES = [
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
] as const

export const DEFAULT_TIMEZONE = "America/Chicago"

const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/

export function formatTimeForDisplay(time: string): string {
  // Event times are stored as local wall-clock HH:mm values, not UTC instants.
  const match = timeRegex.exec(time.trim())
  if (!match) {
    return time
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])
  const period = hours >= 12 ? "PM" : "AM"
  const displayHours = hours % 12 || 12

  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`
}

export function formatTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string {
  if (!startTime) {
    return "Time TBD"
  }
  const start = formatTimeForDisplay(startTime)
  if (!endTime) {
    return start
  }
  const end = formatTimeForDisplay(endTime)
  return `${start} - ${end}`
}

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return DEFAULT_TIMEZONE
  }
}

export function getTimezoneAbbreviation(timezone: string): string {
  try {
    const date = new Date()
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    })
    const parts = formatter.formatToParts(date)
    const tzPart = parts.find((part) => part.type === "timeZoneName")
    return tzPart?.value || timezone
  } catch {
    return timezone
  }
}
