import { z } from "zod"

export const conferenceManualCountSchema = z.object({
  contactName: z.string().trim().min(1, "Contact name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  role: z.string().trim().min(1, "Role is required"),
  manualCount: z.coerce
    .number({ invalid_type_error: "Enter the number of manuals" })
    .int("Enter a whole number")
    .min(1, "Enter at least 1 manual"),
  recaptchaToken: z.string(),
})

export type ConferenceManualCountData = z.infer<typeof conferenceManualCountSchema>
