"use server"

import { eventSubmissionSchema, type EventSubmissionData } from "@/lib/schemas/event"
import { getDb } from "@/lib/db"
import { events, eventToTypes } from "@/lib/db/schema"

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

export async function submitEvent(data: EventSubmissionData) {
  // Validate the form data
  const result = eventSubmissionSchema.safeParse(data)

  if (!result.success) {
    // Build field-level errors
    const fieldErrors: Record<string, string> = {}
    for (const error of result.error.errors) {
      const field = error.path[0] as string
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = error.message
      }
    }
    return {
      success: false,
      error: "Please fix the errors below",
      fieldErrors,
    }
  }

  // Skip reCAPTCHA verification in development/localhost
  const isDevelopment = process.env.NODE_ENV === "development"
  
  if (!isDevelopment) {
    // Verify reCAPTCHA token
    if (!result.data.recaptchaToken) {
      return {
        success: false,
        error: "reCAPTCHA token is missing. Please try again.",
      }
    }

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
      console.log("reCAPTCHA verify result:", verifyResult)

      if (!verifyResult.success) {
        console.error("reCAPTCHA verification failed:", verifyResult["error-codes"])
        return {
          success: false,
          error: `reCAPTCHA verification failed: ${verifyResult["error-codes"]?.join(", ") || "unknown error"}`,
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

  try {
    // Insert event into database
    const db = await getDb()
    const eventId = crypto.randomUUID()

    // Insert event into database
    // Use first type for backward compatibility with legacy `type` column
    const primaryType = result.data.types[0]
    
    await db.insert(events).values({
      id: eventId,
      title: result.data.title,
      date: result.data.date,
      endDate: result.data.endDate || null,
      startTime: result.data.startTime || null,
      endTime: result.data.endTime || null,
      timezone: result.data.timezone,
      locationType: result.data.locationType,
      address: result.data.address || null,
      meetingLink: result.data.meetingLink || null,
      description: result.data.description,
      type: primaryType, // For backward compatibility
      status: "pending",
      submitterEmail: result.data.submitterEmail,
      flyerUrl: result.data.flyerUrl || null,
      timeTBD: result.data.timeTBD,
      addressTBD: result.data.addressTBD,
      meetingLinkTBD: result.data.meetingLinkTBD,
    })

    // Insert all event types into the junction table
    if (result.data.types.length > 0) {
      await db.insert(eventToTypes).values(
        result.data.types.map((type) => ({
          eventId,
          type,
        }))
      )
    }

    return {
      success: true,
      eventId,
      message: "Your event has been submitted and is pending review. You will be notified once it is approved.",
    }
  } catch (error) {
    console.error("Event submission error:", error)
    return {
      success: false,
      error: "An error occurred while submitting your event. Please try again.",
    }
  }
}
