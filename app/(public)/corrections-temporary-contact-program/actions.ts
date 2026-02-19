"use server"

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

interface ReCaptchaResponse {
  success: boolean
  score?: number
  action?: string
  challenge_ts?: string
  hostname?: string
  "error-codes"?: string[]
}

const RECAPTCHA_SCORE_THRESHOLD = 0.5

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function getRecaptchaSecretKey(): Promise<string | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    if (env.RECAPTCHA_SECRET_KEY) {
      return env.RECAPTCHA_SECRET_KEY
    }
  } catch {
    // Not in Cloudflare environment
  }
  return process.env.RECAPTCHA_SECRET_KEY
}

async function verifyRecaptcha(token: string): Promise<{ success: boolean; error?: string }> {
  const isDevelopment = process.env.NODE_ENV === "development"

  if (isDevelopment) {
    return { success: true }
  }

  if (!token) {
    return { success: false, error: "reCAPTCHA token is missing. Please try again." }
  }

  const secretKey = await getRecaptchaSecretKey()

  if (!secretKey) {
    console.error("RECAPTCHA_SECRET_KEY is not configured")
    return { success: false, error: "Server configuration error. Please try again later." }
  }

  try {
    const verifyResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    })

    const verifyResult: ReCaptchaResponse = await verifyResponse.json()

    if (!verifyResult.success) {
      console.error("reCAPTCHA verification failed:", verifyResult["error-codes"])
      return { success: false, error: "reCAPTCHA verification failed. Please try again." }
    }

    if (verifyResult.score !== undefined && verifyResult.score < RECAPTCHA_SCORE_THRESHOLD) {
      console.warn("reCAPTCHA score too low:", verifyResult.score)
      return { success: false, error: "Suspicious activity detected. Please try again." }
    }

    return { success: true }
  } catch (error) {
    console.error("reCAPTCHA verification error:", error)
    return { success: false, error: "reCAPTCHA verification failed. Please try again." }
  }
}

export async function submitCorrectionsContactForm(data: CorrectionsContactFormData) {
  const result = correctionsContactFormSchema.safeParse(data)

  if (!result.success) {
    return { success: false, error: result.error.errors[0]?.message ?? "Invalid form data" }
  }

  const ip = await getClientIp()
  const rateLimit = checkRateLimit(`corrections:${ip}`, {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  })
  if (!rateLimit.ok) {
    return { success: false, error: "Too many submissions. Please try again later." }
  }

  const recaptchaResult = await verifyRecaptcha(result.data.recaptchaToken)
  if (!recaptchaResult.success) {
    return { success: false, error: recaptchaResult.error }
  }

  const normalizedEmail = normalizeEmail(result.data.email)

  try {
    const db = await getDb()
    const now = new Date().toISOString()

    const existing = await db
      .select({ id: correctionsContacts.id })
      .from(correctionsContacts)
      .where(eq(correctionsContacts.emailNormalized, normalizedEmail))
      .get()

    if (existing) {
      await db
        .update(correctionsContacts)
        .set({
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
          homeGroup: result.data.homeGroup.trim(),
          notes: result.data.notes?.trim() || null,
          active: true,
          updatedAt: now,
        })
        .where(eq(correctionsContacts.id, existing.id))
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
        homeGroup: result.data.homeGroup.trim(),
        notes: result.data.notes?.trim() || null,
        active: true,
      })
    }

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
Home Group: ${result.data.homeGroup}
Notes: ${result.data.notes || ""}

---
This form was submitted via the Area 36 Corrections Temporary Contact Program page.`

    const recipients = ["ctcp@area36.org", "corrections@area36.org"]
    for (const recipient of recipients) {
      const emailResult = await sendEmail(credentials, {
        to: recipient,
        subject: "[Corrections TCP] New Volunteer Sign Up",
        body,
        replyTo: result.data.email,
      })

      if (!emailResult.success) {
        console.error(`Failed to send corrections form to ${recipient}:`, emailResult.error)
      }
    }

    return {
      success: true,
      message: "Your volunteer sign up has been submitted. The Corrections TCP Coordinator will contact you shortly.",
    }
  } catch (error) {
    console.error("Corrections contact form submission error:", error)
    return {
      success: false,
      error: "An error occurred. Please try again or contact ctcp@area36.org directly.",
    }
  }
}
