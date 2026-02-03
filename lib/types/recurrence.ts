import type { Event, EventException, EventFlyer, EventType, LocationType } from "@/lib/db/schema"

// Recurrence pattern types
export interface WeeklyPattern {
  daysOfWeek: number[] // 0-6, Sunday=0
}

export interface MonthlyDayOfMonthPattern {
  type: "dayOfMonth"
  dayOfMonth: number // 1-31
}

export interface MonthlyDayOfWeekPattern {
  type: "dayOfWeek"
  weekOfMonth: number // 1-5 (5 = last)
  dayOfWeek: number // 0-6, Sunday=0
}

export type MonthlyPattern = MonthlyDayOfMonthPattern | MonthlyDayOfWeekPattern

// Recurrence configuration for forms
export interface RecurrenceConfig {
  isRecurring: boolean
  recurrenceType: "none" | "weekly" | "monthly"
  weeklyPattern?: WeeklyPattern
  monthlyPattern?: MonthlyPattern
  recurUntil?: string // YYYY-MM-DD
}

// Virtual event instance (generated on-the-fly from recurring event)
export interface EventOccurrence {
  // Unique identifier for this occurrence: `${eventId}_${occurrenceDate}`
  occurrenceId: string

  // Reference to parent event
  parentEventId: string
  parentEvent: Event

  // The occurrence date (may differ from parent's date)
  date: string // YYYY-MM-DD
  endDate: string | null // For multi-day events, calculated from parent's duration

  // Whether this occurrence has been modified or cancelled
  isModified: boolean
  isCancelled: boolean

  // Exception data if modified (merged with parent)
  exception?: EventException

  // Final resolved values (parent values with exception overrides applied)
  title: string
  startTime: string | null
  endTime: string | null
  timezone: string
  locationType: LocationType
  address: string | null
  meetingLink: string | null
  description: string
  timeTBD: boolean
  addressTBD: boolean
  meetingLinkTBD: boolean

  // Indicator that this is a recurring event instance
  isRecurringInstance: true
}

// Event with all related data
export interface EventWithRelations extends Event {
  types: EventType[]
  flyers: EventFlyer[]
  exceptions?: EventException[]
}

// Simplified flyer info for display
export interface FlyerInfo {
  id: string
  fileKey: string
  fileName: string
  fileType: string
  fileSize: number
}

// For display purposes - unified type for both single events and occurrences
export interface DisplayEvent {
  id: string // eventId or occurrenceId
  isRecurringInstance: boolean
  parentEventId?: string

  // All display fields
  title: string
  date: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  timezone: string
  locationType: LocationType
  address: string | null
  meetingLink: string | null
  description: string
  status: string
  types: EventType[]
  flyers: FlyerInfo[]
  timeTBD: boolean
  addressTBD: boolean
  meetingLinkTBD: boolean
  submitterEmail: string

  // Recurrence metadata for display
  isRecurring: boolean
  isCancelled?: boolean
  isModified?: boolean
  recurrenceDescription?: string // "Every Tuesday" or "2nd Tuesday of month"
  recurUntil?: string | null
}
