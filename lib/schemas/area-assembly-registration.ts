import { z } from "zod"

export const areaAssemblyRegistrationSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastInitial: z
      .string()
      .trim()
      .regex(/^[A-Za-z]$/, "Last initial must be a single letter"),
    attendingApril18: z.boolean(),
    attendingApril18InPerson: z.boolean(),
    attendingApril21: z.boolean(),
    recaptchaToken: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!value.attendingApril18 && !value.attendingApril21) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attendingApril18"],
        message: "Select at least one meeting date",
      })
    }

    if (value.attendingApril18InPerson && !value.attendingApril18) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attendingApril18InPerson"],
        message: "In-person attendance applies only to the April 18 meeting",
      })
    }
  })

export type AreaAssemblyRegistrationData = z.infer<typeof areaAssemblyRegistrationSchema>
