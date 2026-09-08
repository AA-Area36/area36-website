"use server"

import { verifyRecaptcha } from "@/lib/security/recaptcha"

import { eventSubmissionWithRecurrenceSchema, type EventSubmissionWithRecurrenceData } from "@/lib/schemas/event"
import { getDb } from "@/lib/db"
import { events, eventToTypes, type MonthlyPatternType } from "@/lib/db/schema"
import { serializeWeeklyPattern, serializeMonthlyPatternValue } from "@/lib/utils/recurrence"
import { createEventUploadToken } from "@/lib/security/upload-token"
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit"
import { eq } from "drizzle-orm"


type SubmitEventResult =
  | {
      success: true
      eventId: string
      uploadToken?: string
      message: string
    }
  | {
      success: false
      error: string
      fieldErrors?: Record<string, string>
    }

async function getExistingSubmission(
  submissionId: string,
  submitterEmail: string,
) {
  const db = await getDb()
  const existing = await db
    .select({
      id: events.id,
      submitterEmail: events.submitterEmail,
    })
    .from(events)
    .where(eq(events.submissionKey, submissionId))
    .get()

  if (
    !existing ||
    existing.submitterEmail.toLowerCase() !== submitterEmail.toLowerCase()
  ) {
    return null
  }

  return existing
}

async function successfulSubmission(eventId: string) {
  const uploadToken = await createEventUploadToken(eventId)
  return {
    success: true as const,
    eventId,
    uploadToken: uploadToken ?? undefined,
    message:
      "Your event has been submitted and is pending review. You will be notified once it is approved.",
  }
}

/**
 * Get reCAPTCHA secret key from Cloudflare context or process.env
 */

export async function submitEvent(
  data: EventSubmissionWithRecurrenceData,
): Promise<SubmitEventResult> {
  // Validate the form data
  const result = eventSubmissionWithRecurrenceSchema.safeParse(data)

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

  const ip = await getClientIp()
  const rateLimit = await checkRateLimit(`event:${ip}`, {
    limit: 3,
    windowMs: 10 * 60 * 1000,
  })
  if (!rateLimit.ok) {
    if (rateLimit.source === "unavailable") {
      return {
        success: false,
        error: "Submission service is temporarily unavailable. Please try again shortly.",
      }
    }
    return {
      success: false,
      error: "Too many submissions. Please try again later.",
    }
  }

  const recaptcha = await verifyRecaptcha(result.data.recaptchaToken, "submit_event")
  if (!recaptcha.success) return { success: false, error: recaptcha.error }

  try {
    const existing = await getExistingSubmission(
      result.data.submissionId,
      result.data.submitterEmail,
    )
    if (existing) {
      return successfulSubmission(existing.id)
    }

    // Insert event into database
    const db = await getDb()
    const eventId = crypto.randomUUID()

    // Insert event into database
    // Use first type for backward compatibility with legacy `type` column
    const primaryType = result.data.types[0]

    // Serialize recurrence patterns for database storage
    let recurrencePattern: string | null = null
    let monthlyPatternType: MonthlyPatternType | null = null
    let monthlyPatternValue: string | null = null

    if (result.data.isRecurring) {
      if (result.data.recurrenceType === "weekly" && result.data.weeklyPattern) {
        recurrencePattern = serializeWeeklyPattern(result.data.weeklyPattern)
      } else if (result.data.recurrenceType === "monthly" && result.data.monthlyPattern) {
        monthlyPatternType = result.data.monthlyPattern.type as MonthlyPatternType
        monthlyPatternValue = serializeMonthlyPatternValue(result.data.monthlyPattern)
      }
    }
    
    const insertEvent = db.insert(events).values({
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
      submissionKey: result.data.submissionId,
      flyerUrl: result.data.flyerUrl || null,
      timeTBD: result.data.timeTBD,
      addressTBD: result.data.addressTBD,
      meetingLinkTBD: result.data.meetingLinkTBD,
      // Recurrence fields
      isRecurring: result.data.isRecurring,
      recurrenceType: result.data.recurrenceType,
      recurrencePattern,
      monthlyPatternType,
      monthlyPatternValue,
      recurUntil: result.data.recurUntil || null,
    })

    // Insert all event types into the junction table
    const insertTypes = db.insert(eventToTypes).values(
      result.data.types.map((type) => ({
        eventId,
        type,
      })),
    )

    await db.batch([insertEvent, insertTypes])

    return successfulSubmission(eventId)
  } catch (error) {
    // A concurrent retry can lose the unique-key race after both requests
    // check for an existing submission. Resolve that race as the same success.
    const existing = await getExistingSubmission(
      result.data.submissionId,
      result.data.submitterEmail,
    ).catch(() => null)
    if (existing) {
      return successfulSubmission(existing.id)
    }

    console.error("Event submission error:", error)
    return {
      success: false,
      error: "An error occurred while submitting your event. Please try again.",
    }
  }
}
