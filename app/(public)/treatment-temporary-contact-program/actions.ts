"use server"

import { verifyRecaptcha } from "@/lib/security/recaptcha"

import { getCloudflareContext } from "@opennextjs/cloudflare"
import { sendEmail, getGmailCredentials } from "@/lib/gmail/client"
import {
  newcomerFormSchema,
  volunteerFormSchema,
  type NewcomerFormData,
  type VolunteerFormData,
} from "@/lib/schemas/treatment-tcp"
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit"

const TREATMENT_RECIPIENTS = ["ttcc@area36.org", "treatment@area36.org"] as const
const DELIVERY_ERROR =
  "We could not deliver your request. Please try again or contact ttcc@area36.org directly."

async function deliverTreatmentMessage(
  credentials: ReturnType<typeof getGmailCredentials>,
  message: Omit<Parameters<typeof sendEmail>[1], "to">
): Promise<boolean> {
  let delivered = 0

  for (const recipient of TREATMENT_RECIPIENTS) {
    try {
      const emailResult = await sendEmail(credentials, { ...message, to: recipient })
      if (emailResult.success) {
        delivered++
      } else {
        console.error(`Failed to send Treatment TCP form to ${recipient}:`, emailResult.error)
      }
    } catch (error) {
      console.error(`Treatment TCP delivery threw for ${recipient}:`, error)
    }
  }

  return delivered > 0
}



export async function submitNewcomerForm(data: NewcomerFormData) {
  const result = newcomerFormSchema.safeParse(data)

  if (!result.success) {
    return { success: false, error: result.error.errors[0]?.message ?? "Invalid form data" }
  }

  const ip = await getClientIp()
  const rateLimit = await checkRateLimit(`treatment:newcomer:${ip}`, {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  })
  if (!rateLimit.ok) {
    return { success: false, error: "Too many submissions. Please try again later." }
  }

  const recaptchaResult = await verifyRecaptcha(result.data.recaptchaToken, "newcomer_form")
  if (!recaptchaResult.success) {
    return { success: false, error: recaptchaResult.error }
  }

  try {
    const { env } = await getCloudflareContext({ async: true })
    const credentials = getGmailCredentials(env)

    const body = `New Treatment TCP Newcomer Sign Up

Contact Information:
Name: ${result.data.firstName} ${result.data.lastName}
Phone: ${result.data.phone}
Age: ${result.data.age}
Gender: ${result.data.gender}

Location After Discharge:
City: ${result.data.city}
Zip Code: ${result.data.zipCode}
Discharge Date: ${result.data.dischargeDate}

Treatment Facility:
Facility Name: ${result.data.treatmentFacility}
Facility Phone: ${result.data.treatmentFacilityPhone}
Facility Address: ${result.data.treatmentFacilityAddress}

---
This form was submitted via the Area 36 website Treatment Temporary Contact Program page.`

    const delivered = await deliverTreatmentMessage(credentials, {
      subject: "[Treatment TCP] New Newcomer Sign Up Request",
      body,
    })
    if (!delivered) {
      return { success: false, error: DELIVERY_ERROR }
    }

    return { success: true, message: "Your request has been submitted. The Treatment TCP Coordinator will contact you shortly." }
  } catch (error) {
    console.error("Newcomer form submission error:", error)
    return { success: false, error: "An error occurred. Please try again or contact ttcc@area36.org directly." }
  }
}

export async function submitVolunteerForm(data: VolunteerFormData) {
  const result = volunteerFormSchema.safeParse(data)

  if (!result.success) {
    return { success: false, error: result.error.errors[0]?.message ?? "Invalid form data" }
  }

  const ip = await getClientIp()
  const rateLimit = await checkRateLimit(`treatment:volunteer:${ip}`, {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  })
  if (!rateLimit.ok) {
    return { success: false, error: "Too many submissions. Please try again later." }
  }

  const recaptchaResult = await verifyRecaptcha(result.data.recaptchaToken, "volunteer_form")
  if (!recaptchaResult.success) {
    return { success: false, error: recaptchaResult.error }
  }

  try {
    const { env } = await getCloudflareContext({ async: true })
    const credentials = getGmailCredentials(env)

    const body = `New Treatment TCP Volunteer Sign Up

Contact Information:
Name: ${result.data.firstName} ${result.data.lastName}
Phone: ${result.data.phone}
Email: ${result.data.email}
Age: ${result.data.age}
Gender: ${result.data.gender}

Location:
City: ${result.data.city}
Zip Code: ${result.data.zipCode}

A.A. Information:
Home Group: ${result.data.homeGroup}
Home Group City: ${result.data.homeGroupCity}
Sobriety Date: ${result.data.sobrietyDate}

---
This form was submitted via the Area 36 website Treatment Temporary Contact Program page.`

    const delivered = await deliverTreatmentMessage(credentials, {
      subject: "[Treatment TCP] New Volunteer Sign Up",
      body,
      replyTo: result.data.email,
    })
    if (!delivered) {
      return { success: false, error: DELIVERY_ERROR }
    }

    return { success: true, message: "Your volunteer sign up has been submitted. The Treatment TCP Coordinator will contact you shortly." }
  } catch (error) {
    console.error("Volunteer form submission error:", error)
    return { success: false, error: "An error occurred. Please try again or contact ttcc@area36.org directly." }
  }
}
