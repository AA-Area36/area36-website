"use server"

import { eventSubmissionSchema, type EventSubmissionData } from "@/lib/schemas/event"
import { getDb } from "@/lib/db"
import { events } from "@/lib/db/schema"

interface ReCaptchaResponse {
  success: boolean
  score?: number
  action?: string
  challenge_ts?: string
  hostname?: string
  "error-codes"?: string[]
}

const RECAPTCHA_SCORE_THRESHOLD = 0.5

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

  // Skip reCAPTCHA verification on localhost
  const isLocalhost = process.env.NODE_ENV === "development"

  if (!isLocalhost) {
    // Verify reCAPTCHA token
    const secretKey = process.env.RECAPTCHA_SECRET_KEY

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

  try {
    // Insert event into database
    const db = await getDb()
    const eventId = crypto.randomUUID()

    await db.insert(events).values({
      id: eventId,
      title: result.data.title,
      date: result.data.date,
      endDate: result.data.endDate || null,
      startTime: result.data.startTime,
      endTime: result.data.endTime || null,
      timezone: result.data.timezone,
      locationType: result.data.locationType,
      address: result.data.address || null,
      meetingLink: result.data.meetingLink || null,
      description: result.data.description,
      type: result.data.type,
      status: "pending",
      submitterEmail: result.data.submitterEmail,
      flyerUrl: result.data.flyerUrl || null,
    })

    return {
      success: true,
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
