"use server"

import { requireHostedDistrictAccessSession } from "@/lib/auth/guards"
import { getDb, schema } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { EventType } from "@/lib/db/schema"
import {
  parseDate,
  parseEventTypes,
  parseLocationType,
  parseOptionalText,
  parseOptionalTime,
  parseOptionalUrl,
  parseRequiredText,
  parseTimezone,
  validateTimeRange,
} from "@/lib/district/validation"

function coerceDistrict(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export async function createDistrictEvent(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const title = parseRequiredText(formData.get("title"), "Title", 200)
  const date = parseDate(formData.get("date"))
  const startTime = parseOptionalTime(formData.get("startTime"), "Start time")
  const endTime = parseOptionalTime(formData.get("endTime"), "End time")
  const timezone = parseTimezone(formData.get("timezone") ?? "America/Chicago")
  const locationType = parseLocationType(formData.get("locationType") ?? "in-person")
  const address = parseOptionalText(formData.get("address"), "Address", 500)
  const meetingLink = parseOptionalUrl(formData.get("meetingLink"), "Meeting link")
  const description = parseRequiredText(formData.get("description"), "Description", 4000)
  const types: EventType[] = parseEventTypes(formData.get("types") ?? "District")

  validateTimeRange(startTime, endTime)

  const db = await getDb()
  const id = crypto.randomUUID()

  await db.insert(schema.events).values({
    id,
    title,
    date,
    endDate: null,
    startTime,
    endTime,
    timezone,
    locationType,
    address,
    meetingLink,
    description,
    // Keep legacy single-type column populated for DB compatibility.
    type: types[0],
    status: "approved",
    submitterEmail: session.user.email,
    districtNumber,
    timeTBD: !startTime,
    addressTBD: !address,
    meetingLinkTBD: locationType !== "in-person" && !meetingLink,
    isRecurring: false,
    recurrenceType: "none",
  })

  await db.insert(schema.eventToTypes).values(
    types.map((t) => ({
      eventId: id,
      type: t as EventType,
    }))
  )

  revalidatePath("/admin/calendar")
}

export async function updateDistrictEvent(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const eventId = String(formData.get("eventId") ?? "").trim()
  if (!eventId) throw new Error("Missing eventId")

  const title = parseRequiredText(formData.get("title"), "Title", 200)
  const date = parseDate(formData.get("date"))
  const startTime = parseOptionalTime(formData.get("startTime"), "Start time")
  const endTime = parseOptionalTime(formData.get("endTime"), "End time")
  const timezone = parseTimezone(formData.get("timezone") ?? "America/Chicago")
  const locationType = parseLocationType(formData.get("locationType") ?? "in-person")
  const address = parseOptionalText(formData.get("address"), "Address", 500)
  const meetingLink = parseOptionalUrl(formData.get("meetingLink"), "Meeting link")
  const description = parseRequiredText(formData.get("description"), "Description", 4000)
  const types: EventType[] = parseEventTypes(formData.get("types") ?? "District")

  validateTimeRange(startTime, endTime)

  const db = await getDb()
  const event = await db
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(and(eq(schema.events.id, eventId), eq(schema.events.districtNumber, districtNumber)))
    .get()
  if (!event) throw new Error("Event not found")

  await db
    .update(schema.events)
    .set({
      title,
      date,
      startTime,
      endTime,
      timezone,
      locationType,
      address,
      meetingLink,
      description,
      // Keep legacy single-type column in sync with the selected list.
      type: types[0],
      timeTBD: !startTime,
      addressTBD: !address,
      meetingLinkTBD: locationType !== "in-person" && !meetingLink,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.events.id, eventId))

  await db.delete(schema.eventToTypes).where(eq(schema.eventToTypes.eventId, eventId))
  await db.insert(schema.eventToTypes).values(types.map((t) => ({ eventId, type: t as EventType })))

  revalidatePath("/admin/calendar")
}

export async function deleteDistrictEvent(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const eventId = String(formData.get("eventId") ?? "").trim()
  if (!eventId) throw new Error("Missing eventId")

  const db = await getDb()
  await db
    .delete(schema.events)
    .where(and(eq(schema.events.id, eventId), eq(schema.events.districtNumber, districtNumber)))

  revalidatePath("/admin/calendar")
}
