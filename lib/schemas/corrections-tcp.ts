import { z } from "zod"

export const correctionsContactFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  gender: z
    .string()
    .min(1, "Gender is required")
    .refine((value) => value === "Male" || value === "Female", "Gender must be Male or Female"),
  streetAddress: z.string().optional(),
  city: z.string().min(1, "City is required"),
  county: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  email: z.string().email("Please enter a valid email address"),
  sobrietyDate: z.string().min(1, "Sobriety date is required"),
  phonePrimary: z.string().optional(),
  phoneSecondary: z.string().optional(),
  birthYear: z
    .string()
    .min(4, "Birth year is required")
    .regex(/^\d{4}$/, "Birth year must be 4 digits"),
  isSpanishSpeaking: z.boolean(),
  otherLanguages: z.string().optional(),
  homeGroup: z.string().optional(),
  notes: z.string().optional(),
  recaptchaToken: z.string(),
})

export type CorrectionsContactFormData = z.infer<typeof correctionsContactFormSchema>
