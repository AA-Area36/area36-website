import { z } from "zod"
import { districtNumbers } from "@/lib/constants/districts"

export const driveSubmissionSchema = z.object({
  district: z.enum(districtNumbers.map(String) as [string, ...string[]], {
    errorMap: () => ({ message: "Please select a district" }),
  }),
  subscriptionCount: z.coerce
    .number()
    .int("Subscription count must be a whole number")
    .min(1, "At least 1 subscription is required")
    .max(1000, "Please contact an administrator for bulk submissions"),
  submitterContact: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  privacyAcknowledged: z.literal(true, {
    errorMap: () => ({ message: "Please acknowledge the privacy notice" }),
  }),
  hcaptchaToken: z.string().min(1, "Please complete the captcha"),
})

export type DriveSubmissionData = z.infer<typeof driveSubmissionSchema>

export const createDriveSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  prizeDescription: z.string().max(500, "Prize description must be 500 characters or less").optional().or(z.literal("")),
}).refine(
  (data) => {
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    return end >= start
  },
  {
    message: "End date must be on or after start date",
    path: ["endDate"],
  }
)

export type CreateDriveData = z.infer<typeof createDriveSchema>

export const updateDriveSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  prizeDescription: z.string().max(500, "Prize description must be 500 characters or less").optional().or(z.literal("")),
  isActive: z.boolean(),
}).refine(
  (data) => {
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    return end >= start
  },
  {
    message: "End date must be on or after start date",
    path: ["endDate"],
  }
)

export type UpdateDriveData = z.infer<typeof updateDriveSchema>
