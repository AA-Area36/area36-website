import { z } from "zod"

export const newcomerFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone number is required"),
  age: z.string().min(1, "Age is required"),
  gender: z.string().min(1, "Gender is required"),
  dischargeDate: z.string().min(1, "Discharge date is required"),
  city: z.string().min(1, "City is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  treatmentFacility: z.string().min(1, "Treatment facility is required"),
  treatmentFacilityPhone: z.string().min(1, "Treatment facility phone is required"),
  treatmentFacilityAddress: z.string().min(1, "Treatment facility address is required"),
  recaptchaToken: z.string(),
})

export const volunteerFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Please enter a valid email address"),
  age: z.string().min(1, "Age is required"),
  gender: z.string().min(1, "Gender is required"),
  city: z.string().min(1, "City is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  homeGroup: z.string().min(1, "Home group is required"),
  homeGroupCity: z.string().min(1, "Home group city is required"),
  sobrietyDate: z.string().min(1, "Sobriety date is required"),
  recaptchaToken: z.string(),
})

export type NewcomerFormData = z.infer<typeof newcomerFormSchema>
export type VolunteerFormData = z.infer<typeof volunteerFormSchema>
