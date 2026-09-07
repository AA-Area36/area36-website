"use server"

import { verifyRecaptcha } from "@/lib/security/recaptcha"

import { eq } from "drizzle-orm"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { getDb } from "@/lib/db"
import { correctionsContacts } from "@/lib/db/schema"
import { sendEmail, getGmailCredentials } from "@/lib/gmail/client"
import {
  correctionsContactFormSchema,
  type CorrectionsContactFormData,
} from "@/lib/schemas/corrections-tcp"
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit"


function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}



export async function submitCorrectionsContactForm(data: CorrectionsContactFormData) {
  const result = correctionsContactFormSchema.safeParse(data)

  if (!result.success) {
    return { success: false, error: result.error.errors[0]?.message ?? "Invalid form data" }
  }

  const ip = await getClientIp()
  const rateLimit = await checkRateLimit(`corrections:${ip}`, {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  })
  if (!rateLimit.ok) {
    return { success: false, error: "Too many submissions. Please try again later." }
  }

  const recaptchaResult = await verifyRecaptcha(result.data.recaptchaToken, "corrections_volunteer_form")
  if (!recaptchaResult.success) {
    return { success: false, error: recaptchaResult.error }
  }

  const normalizedEmail = normalizeEmail(result.data.email)

  try {
    const db = await getDb()

    const existing = await db
      .select({ id: correctionsContacts.id })
      .from(correctionsContacts)
      .where(eq(correctionsContacts.emailNormalized, normalizedEmail))
      .get()

    if (existing) {
      return { success: true, message: "If a sign-up already exists, its details have been kept. Contact the Corrections TCP Coordinator to request changes." }
    } else {
      await db.insert(correctionsContacts).values({
        id: crypto.randomUUID(),
        firstName: result.data.firstName.trim(),
        lastName: result.data.lastName.trim(),
        gender: result.data.gender.trim(),
        streetAddress: result.data.streetAddress?.trim() || null,
        city: result.data.city.trim(),
        county: result.data.county?.trim() || null,
        state: result.data.state?.trim() || null,
        zipCode: result.data.zipCode?.trim() || null,
        email: result.data.email.trim(),
        emailNormalized: normalizedEmail,
        sobrietyDate: result.data.sobrietyDate,
        phonePrimary: result.data.phonePrimary?.trim() || null,
        phoneSecondary: result.data.phoneSecondary?.trim() || null,
        birthYear: Number(result.data.birthYear),
        isSpanishSpeaking: result.data.isSpanishSpeaking,
        otherLanguages: result.data.otherLanguages?.trim() || null,
        homeGroup: result.data.homeGroup?.trim() || null,
        notes: result.data.notes?.trim() || null,
        active: true,
      })
    }

    let notified = false
    try {
    const { env } = await getCloudflareContext({ async: true })
    const credentials = getGmailCredentials(env)

    const body = `New Corrections TCP Volunteer Sign Up

Volunteer Information:
Name: ${result.data.firstName} ${result.data.lastName}
Gender: ${result.data.gender}
Address: ${result.data.streetAddress || ""}
City: ${result.data.city}
County: ${result.data.county || ""}
State: ${result.data.state || ""}
Zip: ${result.data.zipCode || ""}
Email: ${result.data.email}
Sobriety Date: ${result.data.sobrietyDate}
Phone 1: ${result.data.phonePrimary || ""}
Phone 2: ${result.data.phoneSecondary || ""}
Birth Year: ${result.data.birthYear}
Spanish Speaking: ${result.data.isSpanishSpeaking ? "Yes" : "No"}
Other Languages: ${result.data.otherLanguages || ""}
Home Group: ${result.data.homeGroup || ""}
Notes: ${result.data.notes || ""}

---
This form was submitted via the Area 36 Corrections Temporary Contact Program page.`

    const recipients = ["ctcp@area36.org"]
    for (const recipient of recipients) {
      const emailResult = await sendEmail(credentials, {
        to: recipient,
        subject: "[Corrections TCP] New Volunteer Sign Up",
        body,
        replyTo: result.data.email,
      })

      notified = emailResult.success
      if (!emailResult.success) {
        console.error(`Failed to send corrections form to ${recipient}:`, emailResult.error)
      }
    }
    } catch {
      // The saved sign-up remains available to the coordinator; do not invite a duplicate write.
      notified = false
    }

    return {
      success: true,
      message: notified
        ? "Your volunteer sign up has been saved and the Corrections TCP Coordinator has been notified."
        : "Your volunteer sign up has been saved, but we could not notify the coordinator. Please contact ctcp@area36.org; you do not need to submit again.",
    }
  } catch (error) {
    console.error("Corrections contact form submission error:", error)
    return {
      success: false,
      error: "An error occurred. Please try again or contact ctcp@area36.org directly.",
    }
  }
}
