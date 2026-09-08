import { z } from "zod"

export const contactFormSchema = z.object({
  recipients: z.array(z.string()).min(1, "Please select at least one recipient"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  subject: z.string().min(1, "Subject is required").max(200).refine((value) => !/[\r\n\x00-\x1f\x7f]/.test(value), "Subject must be a single line"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  consent: z.literal(true, {
    errorMap: () => ({ message: "You must acknowledge the anonymity policy" }),
  }),
  recaptchaToken: z.string(),
})

export type ContactFormData = z.infer<typeof contactFormSchema>
