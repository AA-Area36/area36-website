"use server"

import { getCloudflareContext } from "@opennextjs/cloudflare"
import {
  conferenceManualCountSchema,
  type ConferenceManualCountData,
} from "@/lib/schemas/conference-manual-count"
import { appendConferenceManualCount } from "@/lib/google/sheets"
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

async function getRecaptchaSecretKey(): Promise<string | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    if (env.RECAPTCHA_SECRET_KEY) {
      return env.RECAPTCHA_SECRET_KEY
    }
  } catch {
    // Not in Cloudflare environment.
  }

  return process.env.RECAPTCHA_SECRET_KEY
}

async function verifyRecaptcha(token: string): Promise<{ success: boolean; error?: string }> {
  if (process.env.NODE_ENV === "development") {
    return { success: true }
  }

  if (!token) {
    return { success: false, error: "reCAPTCHA token is missing. Please refresh and try again." }
  }

  const secretKey = await getRecaptchaSecretKey()
  if (!secretKey) {
    console.error("RECAPTCHA_SECRET_KEY is not configured")
    return { success: false, error: "Server configuration error. Please try again later." }
  }

  try {
    const verifyResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
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

export async function submitConferenceManualCount(data: ConferenceManualCountData) {
  const result = conferenceManualCountSchema.safeParse(data)
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message ?? "Invalid form data",
    }
  }

  const ip = await getClientIp()
  const rateLimit = checkRateLimit(`conference-manual-count:${ip}`, {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  })
  if (!rateLimit.ok) {
    return {
      success: false,
      error: "Too many submissions. Please try again later.",
    }
  }

  const recaptchaResult = await verifyRecaptcha(result.data.recaptchaToken)
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
