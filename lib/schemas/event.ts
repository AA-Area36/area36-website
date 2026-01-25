import { z } from "zod"
import { eventTypes, locationTypes, type EventType } from "@/lib/db/schema"

const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/

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
