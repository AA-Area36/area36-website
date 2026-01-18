"use server"

import { eventSubmissionSchema, type EventSubmissionData } from "@/lib/schemas/event"
import { getDb } from "@/lib/db"
import { events } from "@/lib/db/schema"

interface HCaptchaResponse {
  success: boolean
  "error-codes"?: string[]
}

export async function submitEvent(data: EventSubmissionData) {
  // Validate the form data
  const result = eventSubmissionSchema.safeParse(data)

  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message ?? "Invalid form data",
    }
  }

  // Verify hCaptcha token
  const secretKey = process.env.HCAPTCHA_SECRET_KEY

  if (!secretKey) {
    console.error("HCAPTCHA_SECRET_KEY is not configured")
    return {
      success: false,
      error: "Server configuration error. Please try again later.",
    }
  }

  try {
    const verifyResponse = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: result.data.hcaptchaToken,
      }),
    })

    const verifyResult: HCaptchaResponse = await verifyResponse.json()

    if (!verifyResult.success) {
      console.error("hCaptcha verification failed:", verifyResult["error-codes"])
      return {
        success: false,
        error: "Captcha verification failed. Please try again.",
      }
    }

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
