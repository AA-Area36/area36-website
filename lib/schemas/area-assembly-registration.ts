import { z } from "zod"

export const areaAssemblyRegistrationSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastInitial: z
    .string()
    .trim()
    .regex(/^[A-Za-z]$/, "Last initial must be a single letter"),
  recaptchaToken: z.string(),
})

export type AreaAssemblyRegistrationData = z.infer<typeof areaAssemblyRegistrationSchema>
