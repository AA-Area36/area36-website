import {
  districtContactCategories,
  districtPositionStatuses,
  eventTypes,
  locationTypes,
  type DistrictContactCategory,
  type DistrictPositionStatus,
  type EventType,
  type LocationType,
} from "@/lib/db/schema"

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function trimToString(value: unknown): string {
  return String(value ?? "").trim()
}

export function parseRequiredText(value: unknown, field: string, maxLength: number): string {
  const parsed = trimToString(value)
  if (!parsed) throw new Error(`${field} is required`)
  if (parsed.length > maxLength) throw new Error(`${field} must be ${maxLength} characters or fewer`)
  return parsed
}

export function parseOptionalText(value: unknown, field: string, maxLength: number): string | null {
  const parsed = trimToString(value)
  if (!parsed) return null
  if (parsed.length > maxLength) throw new Error(`${field} must be ${maxLength} characters or fewer`)
  return parsed
}

export function parseDate(value: unknown, field = "Date"): string {
  const parsed = trimToString(value)
  if (!DATE_REGEX.test(parsed)) throw new Error(`${field} must be YYYY-MM-DD`)
  return parsed
}

export function parseOptionalTime(value: unknown, field: string): string | null {
  const parsed = trimToString(value)
  if (!parsed) return null
  if (!TIME_REGEX.test(parsed)) throw new Error(`${field} must be HH:MM`)
  return parsed
}

export function validateTimeRange(startTime: string | null, endTime: string | null) {
  if (endTime && !startTime) throw new Error("Start time is required when end time is set")
  if (startTime && endTime && endTime <= startTime) {
    throw new Error("End time must be after start time")
  }
}

export function parseOptionalEmail(value: unknown, field = "Email"): string | null {
  const parsed = trimToString(value).toLowerCase()
  if (!parsed) return null
  if (parsed.length > 254) throw new Error(`${field} must be 254 characters or fewer`)
  if (!EMAIL_REGEX.test(parsed)) throw new Error(`${field} is invalid`)
  return parsed
}

export function parseOptionalUrl(value: unknown, field: string): string | null {
  const parsed = trimToString(value)
  if (!parsed) return null
  if (parsed.length > 2048) throw new Error(`${field} must be 2048 characters or fewer`)

  let url: URL
  try {
    url = new URL(parsed)
  } catch {
    throw new Error(`${field} must be a valid URL`)
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${field} must start with https:// or http://`)
  }
  return url.toString()
}

export function parseSortOrder(value: unknown): number {
  const parsed = Number(value ?? 0)
  if (!Number.isInteger(parsed) || parsed < -9999 || parsed > 9999) {
    throw new Error("Sort order must be an integer between -9999 and 9999")
  }
  return parsed
}

export function parseDistrictContactCategory(value: unknown): DistrictContactCategory {
  const parsed = trimToString(value)
  if (!districtContactCategories.includes(parsed as DistrictContactCategory)) {
    throw new Error("Category is invalid")
  }
  return parsed as DistrictContactCategory
}

export function parseDistrictPositionStatus(value: unknown): DistrictPositionStatus {
  const parsed = trimToString(value)
  if (!districtPositionStatuses.includes(parsed as DistrictPositionStatus)) {
    throw new Error("Status is invalid")
  }
  return parsed as DistrictPositionStatus
}

export function parseLocationType(value: unknown): LocationType {
  const parsed = trimToString(value)
  if (!locationTypes.includes(parsed as LocationType)) {
    throw new Error("Location type is invalid")
  }
  return parsed as LocationType
}

export function parseEventTypes(value: unknown): EventType[] {
  const parsed = trimToString(value)
  const allowed = new Set(eventTypes)
  const values = parsed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item): item is EventType => allowed.has(item as EventType))

  const unique = Array.from(new Set(values))
  return unique.length > 0 ? unique : ["District"]
}

export function parseTimezone(value: unknown): string {
  const parsed = trimToString(value)
  if (!parsed) throw new Error("Timezone is required")
  if (parsed.length > 100) throw new Error("Timezone is invalid")
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: parsed }).format(new Date())
  } catch {
    throw new Error("Timezone is invalid")
  }
  return parsed
}
