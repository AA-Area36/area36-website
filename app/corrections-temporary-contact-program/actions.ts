"use server"

import { getCloudflareContext } from "@opennextjs/cloudflare"
import { sendEmail, getGmailCredentials } from "@/lib/gmail/client"
import {
  correctionsContactFormSchema,
  type CorrectionsContactFormData,
} from "@/lib/schemas/corrections-tcp"

interface ReCaptchaResponse {
  success: boolean
  score?: number
  action?: string
  challenge_ts?: string
  hostname?: string
  "error-codes"?: string[]
}

const RECAPTCHA_SCORE_THRESHOLD = 0.5

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

  const recaptchaResult = await verifyRecaptcha(result.data.recaptchaToken)
  if (!recaptchaResult.success) {
    return { success: false, error: recaptchaResult.error }
  }

  try {
    const { env } = await getCloudflareContext({ async: true })
    const credentials = getGmailCredentials(env)

    const body = `New Corrections TCP Contact Request

Contact Information:
Name: ${result.data.firstName} ${result.data.lastName}
Email: ${result.data.email}

---
This form was submitted via the Area 36 website Corrections Temporary Contact Program page.
Please follow up with this person regarding the Corrections TCP.`

    // Send to both ctcp@area36.org and corrections@area36.org
    const recipients = ["ctcp@area36.org", "corrections@area36.org"]

    for (const recipient of recipients) {
      const emailResult = await sendEmail(credentials, {
        to: recipient,
        subject: "[Corrections TCP] New Contact Request",
        body,
        replyTo: result.data.email,
      })

      if (!emailResult.success) {
        console.error(`Failed to send corrections form to ${recipient}:`, emailResult.error)
      }
    }

    return { success: true, message: "Your request has been submitted. The Corrections TCP Coordinator will contact you shortly." }
  } catch (error) {
    console.error("Corrections contact form submission error:", error)
    return { success: false, error: "An error occurred. Please try again or contact ctcp@area36.org directly." }
  }
}
