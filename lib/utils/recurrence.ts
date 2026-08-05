import type { Event } from "@/lib/db/schema"
import type { WeeklyPattern, MonthlyPattern } from "@/lib/types/recurrence"

const MAX_ARCHIVE_MONTHS = 121

/**
 * Parse the weekly recurrence pattern from database JSON string
 */
export function parseWeeklyPattern(pattern: string | null): WeeklyPattern | null {
  if (!pattern) return null
  try {
    const parsed = JSON.parse(pattern)
    return { daysOfWeek: Array.isArray(parsed) ? parsed : [] }
  } catch {
    return null
  }
}

/**
 * Parse the monthly recurrence pattern from database fields
 */
export function parseMonthlyPattern(
  patternType: string | null,
  patternValue: string | null
): MonthlyPattern | null {
  if (!patternType || !patternValue) return null
  try {
    if (patternType === "dayOfMonth") {
      return { type: "dayOfMonth", dayOfMonth: parseInt(patternValue, 10) }
    }
    if (patternType === "dayOfWeek") {
      const parsed = JSON.parse(patternValue)
      return {
        type: "dayOfWeek",
        weekOfMonth: parsed.week,
        dayOfWeek: parsed.day,
      }
    }
  } catch {
    return null
  }
  return null
}

/**
 * Get the Nth occurrence of a weekday in a month
 * @param year - Full year (e.g., 2025)
 * @param month - Month (0-11)
 * @param dayOfWeek - Day of week (0-6, Sunday=0)
 * @param weekOfMonth - Week occurrence (1-5, 5 = last)
 * @returns Date or null if doesn't exist
 */
export function getNthWeekdayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number,
  weekOfMonth: number
): Date | null {
  if (weekOfMonth === 5) {
    // "Last" occurrence - work backwards from end of month
    const lastDay = new Date(year, month + 1, 0)
    for (let d = lastDay.getDate(); d >= 1; d--) {
      const date = new Date(year, month, d)
      if (date.getDay() === dayOfWeek) {
        return date
      }
    }
    return null
  }

  // Find Nth occurrence of the weekday
  let count = 0
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d)
    if (date.getMonth() !== month) break // Went past end of month
    if (date.getDay() === dayOfWeek) {
      count++
      if (count === weekOfMonth) {
        return date
      }
    }
  }
  return null
}

/**
 * Parse a YYYY-MM-DD string as local date
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Format a Date to YYYY-MM-DD string (using local timezone)
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Calculate the event duration in days (for multi-day events)
 */
export function getEventDurationDays(event: Event): number {
  if (!event.endDate) return 0
  const start = parseLocalDate(event.date)
  const end = parseLocalDate(event.endDate)
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
}

/**
 * Add days to a date string
 */
export function addDaysToDate(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr)
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

/**
 * Generate all occurrence dates for a recurring event within a date range
 */
export function generateOccurrenceDates(
  event: Event,
  rangeStart: Date,
  rangeEnd: Date
): string[] {
  if (!event.isRecurring || event.recurrenceType === "none") {
    return []
  }

  const occurrences: string[] = []
  const eventStart = parseLocalDate(event.date)
  const recurUntil = event.recurUntil ? parseLocalDate(event.recurUntil) : rangeEnd

  // Effective end is the earlier of recurUntil or rangeEnd
  const effectiveEnd = new Date(Math.min(recurUntil.getTime(), rangeEnd.getTime()))

  // Start from the later of eventStart or rangeStart
  const effectiveStart = new Date(Math.max(eventStart.getTime(), rangeStart.getTime()))

  if (event.recurrenceType === "weekly") {
    const pattern = parseWeeklyPattern(event.recurrencePattern)
    if (!pattern || pattern.daysOfWeek.length === 0) return []

    // Iterate day by day from effectiveStart to effectiveEnd
    const current = new Date(effectiveStart)
    while (current <= effectiveEnd) {
      if (pattern.daysOfWeek.includes(current.getDay())) {
        // Only include if it's on or after the original event start date
        if (current >= eventStart) {
          occurrences.push(formatDate(current))
        }
      }
      current.setDate(current.getDate() + 1)
    }
  } else if (event.recurrenceType === "monthly") {
    const pattern = parseMonthlyPattern(event.monthlyPatternType, event.monthlyPatternValue)
    if (!pattern) return []

    // Iterate month by month
    let year = effectiveStart.getFullYear()
    let month = effectiveStart.getMonth()

    const requestedMonths =
      (effectiveEnd.getFullYear() - effectiveStart.getFullYear()) * 12 +
      (effectiveEnd.getMonth() - effectiveStart.getMonth()) +
      1
    // The past-events API validates a maximum ten-year window. Keep a hard
    // archive cap for defense in depth while covering every requested month.
    const maxIterations = Math.min(
      Math.max(requestedMonths, 0),
      MAX_ARCHIVE_MONTHS
    )
    let iterations = 0

    while (iterations < maxIterations) {
      let occurrenceDate: Date | null = null

      if (pattern.type === "dayOfMonth") {
        // Check if this day exists in this month
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
        if (pattern.dayOfMonth <= lastDayOfMonth) {
          occurrenceDate = new Date(year, month, pattern.dayOfMonth)
        }
      } else {
        // dayOfWeek pattern
        occurrenceDate = getNthWeekdayOfMonth(year, month, pattern.dayOfWeek, pattern.weekOfMonth)
      }

      if (occurrenceDate) {
        if (occurrenceDate > effectiveEnd) break
        if (occurrenceDate >= eventStart && occurrenceDate >= effectiveStart) {
          occurrences.push(formatDate(occurrenceDate))
        }
      }

      // Move to next month
      month++
      if (month > 11) {
        month = 0
        year++
      }
      iterations++
    }
  }

  return occurrences
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

/**
 * Generate a human-readable description of the recurrence pattern
 */
export function getRecurrenceDescription(event: Event): string {
  if (!event.isRecurring || event.recurrenceType === "none") {
    return ""
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const weekOrdinals = ["", "1st", "2nd", "3rd", "4th", "Last"]

  if (event.recurrenceType === "weekly") {
    const pattern = parseWeeklyPattern(event.recurrencePattern)
    if (!pattern || pattern.daysOfWeek.length === 0) return "Weekly"

    const days = pattern.daysOfWeek.map((d) => dayNames[d]).join(", ")
    return `Every ${days}`
  }

  if (event.recurrenceType === "monthly") {
    const pattern = parseMonthlyPattern(event.monthlyPatternType, event.monthlyPatternValue)
    if (!pattern) return "Monthly"

    if (pattern.type === "dayOfMonth") {
      const suffix = getOrdinalSuffix(pattern.dayOfMonth)
      return `${pattern.dayOfMonth}${suffix} of every month`
    }

    const weekOrdinal = weekOrdinals[pattern.weekOfMonth] || `${pattern.weekOfMonth}th`
    const dayName = dayNames[pattern.dayOfWeek]
    return `${weekOrdinal} ${dayName} of every month`
  }

  return ""
}

/**
 * Serialize weekly pattern for database storage
 */
export function serializeWeeklyPattern(pattern: WeeklyPattern): string {
  return JSON.stringify(pattern.daysOfWeek)
}

/**
 * Serialize monthly pattern value for database storage
 */
export function serializeMonthlyPatternValue(pattern: MonthlyPattern): string {
  if (pattern.type === "dayOfMonth") {
    return String(pattern.dayOfMonth)
  }
  return JSON.stringify({
    week: pattern.weekOfMonth,
    day: pattern.dayOfWeek,
  })
}
