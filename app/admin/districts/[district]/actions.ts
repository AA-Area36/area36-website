"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireHostedDistrictAccessSession } from "@/lib/auth/guards"
import { getDb, schema } from "@/lib/db"
import { ensureDistrictSiteExists } from "@/lib/district/ensure-site"
import {
  parseLocationType,
  parseOptionalText,
  parseOptionalTime,
  parseOptionalUrl,
} from "@/lib/district/validation"

function coerceDistrict(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

function parseMeetingRecurrenceMode(value: unknown): "weekday_of_month" | "day_of_month" {
  const parsed = String(value ?? "").trim()
  if (parsed === "weekday_of_month" || parsed === "day_of_month") return parsed
  throw new Error("Recurrence mode is invalid")
}

function parseOptionalBoundedInt(value: unknown, min: number, max: number, field: string): number | null {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${field} must be between ${min} and ${max}`)
  }
  return parsed
}

function isMissingMonthlyMeetingColumnsError(err: unknown): boolean {
  const msg = String((err as any)?.cause?.message ?? (err as any)?.message ?? err).toLowerCase()
  return (
    msg.includes("meeting_recurrence_mode") ||
    msg.includes("meeting_contact_for_details") ||
    msg.includes("meeting_id") ||
    msg.includes("meeting_passcode")
  )
}

function districtMonthlyMeetingMigrationErrorMessage(): string {
  return [
    "District meeting settings are not migrated in this database yet.",
    "Run: pnpm wrangler d1 migrations apply area36-website --local",
  ].join(" ")
}

export async function updateDistrictMonthlyMeetingSettings(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const db = await getDb()
  await ensureDistrictSiteExists(db, districtNumber)

  try {
    const existing = await db
      .select({
        meetingRecurrenceMode: schema.districtSites.meetingRecurrenceMode,
        meetingWeekOfMonth: schema.districtSites.meetingWeekOfMonth,
        meetingWeekday: schema.districtSites.meetingWeekday,
        meetingDayOfMonth: schema.districtSites.meetingDayOfMonth,
        meetingLocationType: schema.districtSites.meetingLocationType,
      })
      .from(schema.districtSites)
      .where(and(eq(schema.districtSites.districtNumber, districtNumber)))
      .get()

    const recurrenceMode = parseMeetingRecurrenceMode(
      formData.get("meetingRecurrenceMode") ?? existing?.meetingRecurrenceMode ?? "weekday_of_month"
    )
    const weekOfMonth = parseOptionalBoundedInt(
      formData.get("meetingWeekOfMonth") ?? existing?.meetingWeekOfMonth,
      1,
      5,
      "Week of month"
    )
    const weekday = parseOptionalBoundedInt(formData.get("meetingWeekday") ?? existing?.meetingWeekday, 0, 6, "Weekday")
    const dayOfMonth = parseOptionalBoundedInt(
      formData.get("meetingDayOfMonth") ?? existing?.meetingDayOfMonth,
      1,
      31,
      "Day of month"
    )
    const meetingTime = parseOptionalTime(formData.get("meetingTime"), "Meeting time")
    const meetingLocationType = parseLocationType(
      formData.get("meetingLocationType") ?? existing?.meetingLocationType ?? "in-person"
    )
    const meetingLocationName = parseOptionalText(formData.get("meetingLocationName"), "Location name", 200)
    const meetingAddress = parseOptionalText(formData.get("meetingAddress"), "Address", 500)
    const meetingLink = parseOptionalUrl(formData.get("meetingLink"), "Meeting link")
    const meetingId = parseOptionalText(formData.get("meetingId"), "Meeting ID", 120)
    const meetingPasscode = parseOptionalText(formData.get("meetingPasscode"), "Meeting passcode", 120)
    const meetingContactRaw = String(formData.get("meetingContactForDetails") ?? "").trim().toLowerCase()
    const meetingContactForDetails =
      meetingContactRaw === "on" || meetingContactRaw === "true" || meetingContactRaw === "1"

    // In case a form control omits values, preserve existing settings or use sensible defaults.
    // This avoids accidental resets to null.
    const resolvedWeekOfMonth =
      recurrenceMode === "weekday_of_month" ? (weekOfMonth ?? existing?.meetingWeekOfMonth ?? 1) : null
    const resolvedWeekday =
      recurrenceMode === "weekday_of_month" ? (weekday ?? existing?.meetingWeekday ?? 2) : null
    const resolvedDayOfMonth =
      recurrenceMode === "day_of_month" ? (dayOfMonth ?? existing?.meetingDayOfMonth ?? 1) : null

    await db
      .update(schema.districtSites)
      .set({
        meetingRecurrenceMode: recurrenceMode,
        meetingWeekOfMonth: resolvedWeekOfMonth,
        meetingWeekday: resolvedWeekday,
        meetingDayOfMonth: resolvedDayOfMonth,
        meetingTime,
        meetingLocationType,
        meetingLocationName,
        meetingAddress,
        meetingLink,
        meetingId,
        meetingPasscode,
        meetingContactForDetails,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(schema.districtSites.districtNumber, districtNumber)))
  } catch (err) {
    if (isMissingMonthlyMeetingColumnsError(err)) {
      throw new Error(districtMonthlyMeetingMigrationErrorMessage())
    }
    throw err
  }

  revalidatePath(`/admin/districts/${districtNumber}`)
  revalidatePath(`/district-site/${districtNumber}`)
}
