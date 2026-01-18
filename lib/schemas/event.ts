import { z } from "zod"
import { eventTypes, locationTypes } from "@/lib/db/schema"

const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/

// Basic address validation - requires at least a street number/name pattern
// This checks for common address patterns like "123 Main St" or "1234 W Broadway Ave"
const addressRegex = /^\d+\s+[\w\s]+(\s+(St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Ln|Lane|Way|Ct|Court|Pl|Place|Cir|Circle|Hwy|Highway|Pkwy|Parkway)\.?)?(,?\s+[\w\s]+)*(,?\s+\w{2}\s+\d{5}(-\d{4})?)?$/i

export const eventSubmissionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  date: z.string().min(1, "Date is required"),
  endDate: z.string().optional(),
  startTime: z.string()
    .min(1, "Start time is required")
    .regex(timeRegex, "Please enter a valid time (HH:MM)"),
  endTime: z.string()
    .regex(timeRegex, "Please enter a valid time (HH:MM)")
    .optional()
    .or(z.literal("")),
  timezone: z.string().min(1, "Timezone is required"),
  locationType: z.enum(locationTypes, { errorMap: () => ({ message: "Please select a location type" }) }),
  address: z.string().max(500, "Address must be 500 characters or less").optional().or(z.literal("")),
  meetingLink: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description must be 2000 characters or less"),
  type: z.enum(eventTypes, { errorMap: () => ({ message: "Please select a valid event type" }) }),
  submitterEmail: z.string().email("Please enter a valid email address"),
  flyerUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  hcaptchaToken: z.string().min(1, "Please complete the captcha"),
}).refine(
  (data) => {
    // If both start and end time are provided, end must be after start
    if (data.startTime && data.endTime) {
      return data.endTime > data.startTime
    }
    return true
  },
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
).refine(
  (data) => {
    // Address is required for in-person and hybrid events
    if (data.locationType === "in-person" || data.locationType === "hybrid") {
      return !!data.address && data.address.trim().length > 0
    }
    return true
  },
  {
    message: "Address is required for in-person and hybrid events",
    path: ["address"],
  }
).refine(
  (data) => {
    // Validate address format for in-person and hybrid events
    if ((data.locationType === "in-person" || data.locationType === "hybrid") && data.address) {
      return addressRegex.test(data.address.trim())
    }
    return true
  },
  {
    message: "Please enter a valid address (e.g., 123 Main St, City, MN 55555)",
    path: ["address"],
  }
)

export type EventSubmissionData = z.infer<typeof eventSubmissionSchema>
