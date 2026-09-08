"use server"

import { verifyRecaptcha } from "@/lib/security/recaptcha"

import {
  conferenceManualCountSchema,
  type ConferenceManualCountData,
} from "@/lib/schemas/conference-manual-count"
import { appendConferenceManualCount } from "@/lib/google/sheets"
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit"




export async function submitConferenceManualCount(data: ConferenceManualCountData) {
  const result = conferenceManualCountSchema.safeParse(data)
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message ?? "Invalid form data",
    }
  }

  const ip = await getClientIp()
  const rateLimit = await checkRateLimit(`conference-manual-count:${ip}`, {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  })
  if (!rateLimit.ok) {
    return {
      success: false,
      error: "Too many submissions. Please try again later.",
    }
  }

  const recaptchaResult = await verifyRecaptcha(result.data.recaptchaToken, "conference_manual_count")
  if (!recaptchaResult.success) {
    return {
      success: false,
      error: recaptchaResult.error,
    }
  }

  const timestamp = new Date().toISOString()
  const contactName = result.data.contactName.trim()
  const email = result.data.email.trim()
  const role = result.data.role.trim()
  const manualCount = result.data.manualCount

  try {
    await appendConferenceManualCount([
      timestamp,
      contactName,
      email,
      role,
      manualCount,
      "/conference-manual-count",
    ])

    return {
      success: true,
      message: "Manual count received. Thank you for helping us plan.",
    }
  } catch (error) {
    console.error("Conference manual count error:", error)

    if (error instanceof Error && error.message.includes("Google Sheets API has not been used")) {
      return {
        success: false,
        error: "Submissions are temporarily unavailable while Google Sheets access is being enabled. Please try again shortly.",
      }
    }

    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      return {
        success: false,
        error: `Local submission error: ${error.message}`,
      }
    }

    return {
      success: false,
      error: "We could not save your manual count just now. Please try again in a moment.",
    }
  }
}
