import { z } from "zod"

export const correctionsContactFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  recaptchaToken: z.string(),
})

export type CorrectionsContactFormData = z.infer<typeof correctionsContactFormSchema>
