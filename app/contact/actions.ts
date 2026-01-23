"use server"

import { contactFormSchema, type ContactFormData } from "@/lib/schemas/contact"
import { sendContactEmail } from "@/lib/email"

interface ReCaptchaResponse {
  success: boolean
  score?: number
  action?: string
  challenge_ts?: string
  hostname?: string
  "error-codes"?: string[]
}

const RECAPTCHA_SCORE_THRESHOLD = 0.5

/**
 * Get reCAPTCHA secret key from Cloudflare context or process.env
 */
async function getRecaptchaSecretKey(): Promise<string | undefined> {
  // Try Cloudflare context first (for deployed environment)
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare")
    const { env } = await getCloudflareContext({ async: true })
    if (env.RECAPTCHA_SECRET_KEY) {
      return env.RECAPTCHA_SECRET_KEY
    }
  } catch {
    // Not in Cloudflare environment
  }

  // Fall back to process.env (for local development)
  return process.env.RECAPTCHA_SECRET_KEY
}

export async function submitContactForm(data: ContactFormData) {
  // Validate the form data
  const result = contactFormSchema.safeParse(data)

  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message ?? "Invalid form data",
    }
  }

  // Skip reCAPTCHA verification on localhost
  const isLocalhost = process.env.NODE_ENV === "development"

  if (!isLocalhost) {
    // Verify reCAPTCHA token
    const secretKey = await getRecaptchaSecretKey()

    if (!secretKey) {
      console.error("RECAPTCHA_SECRET_KEY is not configured")
      return {
        success: false,
        error: "Server configuration error. Please try again later.",
      }
    }

    try {
      const verifyResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: result.data.recaptchaToken,
        }),
      })

      const verifyResult: ReCaptchaResponse = await verifyResponse.json()

      if (!verifyResult.success) {
        console.error("reCAPTCHA verification failed:", verifyResult["error-codes"])
        return {
          success: false,
          error: "reCAPTCHA verification failed. Please try again.",
        }
      }

      // Check the score (v3 returns a score from 0.0 to 1.0)
      if (verifyResult.score !== undefined && verifyResult.score < RECAPTCHA_SCORE_THRESHOLD) {
        console.warn("reCAPTCHA score too low:", verifyResult.score)
        return {
          success: false,
          error: "Suspicious activity detected. Please try again or contact us directly.",
        }
      }
    } catch (error) {
      console.error("reCAPTCHA verification error:", error)
      return {
        success: false,
        error: "reCAPTCHA verification failed. Please try again.",
      }
    }
  }

  // Send email to the selected recipient
  try {
    const emailResult = await sendContactEmail({
      recipient: result.data.recipient,
      firstName: result.data.firstName,
      lastName: result.data.lastName,
      email: result.data.email,
      phone: result.data.phone,
      subject: result.data.subject,
      message: result.data.message,
    })

    if (!emailResult.success) {
      console.error("Failed to send contact email:", emailResult.error)
      return {
        success: false,
        error: "Failed to send your message. Please try again or contact us directly.",
      }
    }

    return {
      success: true,
      message: "Your message has been sent successfully. We will get back to you soon.",
    }
  } catch (error) {
    console.error("Contact form submission error:", error)
    return {
      success: false,
      error: "An error occurred while sending your message. Please try again.",
    }
  }
}
