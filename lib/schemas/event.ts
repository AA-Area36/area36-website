import { z } from "zod"
import { eventTypes, locationTypes, recurrenceTypes } from "@/lib/db/schema"

const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
const dateRegex = /^\d{4}-\d{2}-\d{2}$/

// Helper for multi-select event types - accepts array of valid event types
const eventTypesArray = z.array(z.enum(eventTypes)).min(1, "Please select at least one event type")

// Basic address validation - requires at least a street number/name pattern
// This checks for common address patterns like "123 Main St" or "1234 W Broadway Ave"
const addressRegex = /^\d+\s+[\w\s]+(\s+(St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Ln|Lane|Way|Ct|Court|Pl|Place|Cir|Circle|Hwy|Highway|Pkwy|Parkway)\.?)?(,?\s+[\w\s]+)*(,?\s+\w{2}\s+\d{5}(-\d{4})?)?$/i

// Helper to handle optional URL fields - empty string becomes undefined
const optionalUrl = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().url("Please enter a valid URL").optional()
)

// Helper to handle optional string fields - empty string becomes undefined  
const optionalString = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional()
)

export const eventSubmissionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  date: z.string().min(1, "Date is required"),
  endDate: optionalString,
  startTime: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().regex(timeRegex, "Please enter a valid time (HH:MM)").optional()
  ),
  endTime: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().regex(timeRegex, "Please enter a valid time (HH:MM)").optional()
  ),
  timezone: z.string().min(1, "Timezone is required"),
  locationType: z.enum(locationTypes, { errorMap: () => ({ message: "Please select a location type" }) }),
  address: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().max(500, "Address must be 500 characters or less").optional()
  ),
  meetingLink: optionalUrl,
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description must be 2000 characters or less"),
  types: eventTypesArray,
  submitterEmail: z.string().email("Please enter a valid email address"),
  submissionId: z.string().uuid("Invalid submission identifier"),
  flyerUrl: optionalUrl,
  recaptchaToken: z.string(),
  // TBD flags
  timeTBD: z.boolean().default(false),
  addressTBD: z.boolean().default(false),
  meetingLinkTBD: z.boolean().default(false),
}).refine(
  (data) => {
    // Start time is required unless TBD
    if (!data.timeTBD && !data.startTime) {
      return false
    }
    return true
  },
  {
    message: "Start time is required unless marked as TBD",
    path: ["startTime"],
  }
).refine(
  (data) => {
    // If both start and end time are provided on the SAME day, end must be after start
    // For multi-day events (endDate > date), end time can be before start time
    if (data.startTime && data.endTime) {
      const isSameDay = !data.endDate || data.endDate === data.date
      if (isSameDay) {
        return data.endTime > data.startTime
      }
    }
    return true
  },
  {
    message: "End time must be after start time for same-day events",
    path: ["endTime"],
  }
).refine(
  (data) => {
    // Address is required for in-person and hybrid events, unless TBD
    if ((data.locationType === "in-person" || data.locationType === "hybrid") && !data.addressTBD) {
      return !!data.address && data.address.trim().length > 0
    }
    return true
  },
  {
    message: "Address is required for in-person and hybrid events (or mark as TBD)",
    path: ["address"],
  }
).refine(
  (data) => {
    // Validate address format for in-person and hybrid events (unless TBD)
    if ((data.locationType === "in-person" || data.locationType === "hybrid") && !data.addressTBD && data.address) {
      return addressRegex.test(data.address.trim())
    }
    return true
  },
  {
    message: "Please enter a valid address (e.g., 123 Main St, City, MN 55555)",
    path: ["address"],
  }
).refine(
  (data) => {
    // Meeting link is required for online and hybrid events, unless TBD
    if ((data.locationType === "online" || data.locationType === "hybrid") && !data.meetingLinkTBD) {
      return !!data.meetingLink && data.meetingLink.trim().length > 0
    }
    return true
  },
  {
    message: "Meeting link is required for online and hybrid events (or mark as TBD)",
    path: ["meetingLink"],
  }
)

export type EventSubmissionData = z.infer<typeof eventSubmissionSchema>

// Weekly recurrence pattern schema
export const weeklyPatternSchema = z.object({
  daysOfWeek: z.array(z.number().min(0).max(6)).min(1, "Select at least one day"),
})

// Monthly recurrence pattern schemas
export const monthlyDayOfMonthSchema = z.object({
  type: z.literal("dayOfMonth"),
  dayOfMonth: z.number().min(1).max(31),
})

export const monthlyDayOfWeekSchema = z.object({
  type: z.literal("dayOfWeek"),
  weekOfMonth: z.number().min(1).max(5), // 5 = "last"
  dayOfWeek: z.number().min(0).max(6),
})

export const monthlyPatternSchema = z.discriminatedUnion("type", [
  monthlyDayOfMonthSchema,
  monthlyDayOfWeekSchema,
])

// Recurrence configuration schema
export const recurrenceConfigSchema = z.object({
  isRecurring: z.boolean().default(false),
  recurrenceType: z.enum(recurrenceTypes).default("none"),
  weeklyPattern: weeklyPatternSchema.optional(),
  monthlyPattern: monthlyPatternSchema.optional(),
  recurUntil: z.string().regex(dateRegex, "Invalid date format").optional(),
})

export type RecurrenceConfigData = z.infer<typeof recurrenceConfigSchema>
export type WeeklyPatternData = z.infer<typeof weeklyPatternSchema>
export type MonthlyPatternData = z.infer<typeof monthlyPatternSchema>

// Extended event submission schema with recurrence
export const eventSubmissionWithRecurrenceSchema = eventSubmissionSchema.and(
  recurrenceConfigSchema
).refine(
  (data) => {
    // If recurring, recurrence type must not be "none"
    if (data.isRecurring && data.recurrenceType === "none") {
      return false
    }
    return true
  },
  {
    message: "Please select a recurrence pattern",
    path: ["recurrenceType"],
  }
).refine(
  (data) => {
    // If weekly recurrence, weeklyPattern is required
    if (data.isRecurring && data.recurrenceType === "weekly" && !data.weeklyPattern) {
      return false
    }
    return true
  },
  {
    message: "Please select at least one day of the week",
    path: ["weeklyPattern"],
  }
).refine(
  (data) => {
    // If monthly recurrence, monthlyPattern is required
    if (data.isRecurring && data.recurrenceType === "monthly" && !data.monthlyPattern) {
      return false
    }
    return true
  },
  {
    message: "Please configure the monthly recurrence pattern",
    path: ["monthlyPattern"],
  }
).refine(
  (data) => {
    // If recurring, recurUntil is required
    if (data.isRecurring && !data.recurUntil) {
      return false
    }
    return true
  },
  {
    message: "End date is required for recurring events",
    path: ["recurUntil"],
  }
).refine(
  (data) => {
    // recurUntil must be after start date
    if (data.isRecurring && data.recurUntil && data.date) {
      return data.recurUntil > data.date
    }
    return true
  },
  {
    message: "Recurring end date must be after the start date",
    path: ["recurUntil"],
  }
).refine(
  (data) => {
    // Limit recurring events to max 2 years
    if (data.isRecurring && data.recurUntil && data.date) {
      const start = new Date(data.date)
      const end = new Date(data.recurUntil)
      const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000
      return (end.getTime() - start.getTime()) <= twoYearsMs
    }
    return true
  },
  {
    message: "Recurring events can span a maximum of 2 years",
    path: ["recurUntil"],
  }
)

export type EventSubmissionWithRecurrenceData = z.infer<typeof eventSubmissionWithRecurrenceSchema>

// Exception creation schema (for modifying/cancelling individual occurrences)
export const eventExceptionSchema = z.object({
  eventId: z.string().min(1),
  occurrenceDate: z.string().regex(dateRegex, "Invalid date format"),
  exceptionType: z.enum(["cancelled", "modified"]),
  // For modified exceptions - all optional (null = use parent value)
  title: z.string().optional(),
  startTime: z.string().regex(timeRegex).optional().nullable(),
  endTime: z.string().regex(timeRegex).optional().nullable(),
  endDate: z.string().regex(dateRegex).optional().nullable(),
  locationType: z.enum(locationTypes).optional(),
  address: z.string().optional().nullable(),
  meetingLink: z.string().url().optional().nullable(),
  description: z.string().optional(),
  timeTBD: z.boolean().optional(),
  addressTBD: z.boolean().optional(),
  meetingLinkTBD: z.boolean().optional(),
})

export type EventExceptionData = z.infer<typeof eventExceptionSchema>
