import { formatInTimeZone } from "date-fns-tz"

export const TIMEZONES = [
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
] as const

export const DEFAULT_TIMEZONE = "America/Chicago"

export function formatTimeForDisplay(time: string, timezone: string): string {
  // time is stored as "HH:mm" in 24-hour format
  // Create a date object for today with the given time in the stored timezone
  const today = new Date()
  const [hours, minutes] = time.split(":").map(Number)

  // Create a date string that date-fns-tz can parse
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T${time}:00`

  try {
    // Format the time in the target timezone
    return formatInTimeZone(new Date(dateStr), timezone, "h:mm a")
  } catch {
    // Fallback to simple formatting if timezone conversion fails
    const period = hours >= 12 ? "PM" : "AM"
    const displayHours = hours % 12 || 12
    return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`
  }
}

export function formatTimeRange(
  startTime: string,
  endTime: string | null | undefined,
  timezone: string
): string {
  const start = formatTimeForDisplay(startTime, timezone)
  if (!endTime) {
    return start
  }
  const end = formatTimeForDisplay(endTime, timezone)
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
