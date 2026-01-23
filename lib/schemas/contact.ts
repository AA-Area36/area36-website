import { z } from "zod"

export const contactFormSchema = z.object({
  recipient: z.string().min(1, "Please select a recipient"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  consent: z.literal(true, {
    errorMap: () => ({ message: "You must acknowledge the anonymity policy" }),
  }),
  recaptchaToken: z.string().min(1, "reCAPTCHA verification failed"),
})

export type ContactFormData = z.infer<typeof contactFormSchema>
