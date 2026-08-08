import { z } from "zod"
import { districtNumbers } from "@/lib/constants/districts"
import { NEWSLETTER_DELIVERIES, SERVICE_POSITIONS } from "@/lib/quorum/constants"

const districtValues = new Set([
  ...districtNumbers.map(String),
  "other",
  "dont_know",
])

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const QUORUM_EVENT_KEY_PATTERN = /^[A-Za-z0-9_-]{14}$/
const SUBMISSION_ID_PATTERN = /^[A-Za-z0-9_-]{18}$/

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export const quorumEventKeySchema = z.string().regex(QUORUM_EVENT_KEY_PATTERN, "Invalid quorum event key")

export const quorumEventSchema = z.object({
  title: z.string().trim().min(3, "Event title is required").max(80),
  eventDate: z.string().refine(isValidIsoDate, "Enter a valid event date"),
  quorumTarget: z.coerce.number().int().min(1, "Quorum target must be at least 1").max(1000),
  featured: z.boolean().default(true),
})

export type QuorumEventInput = z.infer<typeof quorumEventSchema>

export const quorumRegistrationSchema = z
  .object({
    name: z.string().trim().min(2, "First and last name are required").max(120),
    district: z.string().refine((value) => districtValues.has(value), "Select a valid district"),
    homeGroup: z.string().trim().min(1, "Home group is required").max(120),
    servicePosition: z.enum(SERVICE_POSITIONS),
    positionDetail: z.string().trim().max(120).default(""),
    representation: z.enum(["primary", "alternate"]).default("primary"),
    email: z.string().trim().email("Enter a valid email address").max(200),
    phone: z.string().trim().min(7, "Phone number is required").max(40),
    streetAddress: z.string().trim().min(3, "Street address is required").max(160),
    city: z.string().trim().min(1, "City is required").max(100),
    state: z.string().trim().min(2, "State is required").max(40),
    zip: z.string().trim().min(5, "ZIP code is required").max(12),
    newsletterDelivery: z.enum(NEWSLETTER_DELIVERIES, {
      message: "Choose how you would like to receive The Pigeon",
    }),
    recaptchaToken: z.string().min(1, "Security verification is missing").max(4096),
  })
  .superRefine((value, ctx) => {
    if (
      (value.servicePosition === "area_officer" || value.servicePosition === "area_committee_chair") &&
      !value.positionDetail
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["positionDetail"],
        message: value.servicePosition === "area_officer" ? "Enter the Area office" : "Enter the committee name",
      })
    }
  })

export type QuorumRegistrationInput = z.infer<typeof quorumRegistrationSchema>

export const quorumCorrectionSchema = z.object({
  submissionId: z.string().regex(SUBMISSION_ID_PATTERN, "Invalid submission ID"),
  action: z.enum(["exclude", "restore", "make_voting", "make_non_voting", "clear_override"]),
  reason: z.string().trim().min(3, "A correction reason is required").max(240),
})

export type QuorumCorrectionInput = z.infer<typeof quorumCorrectionSchema>
