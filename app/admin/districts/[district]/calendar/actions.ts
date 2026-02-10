"use server"

import { requireHostedDistrictAccessSession } from "@/lib/auth/guards"
import { getDb, schema } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { eventTypes, type EventType, type LocationType } from "@/lib/db/schema"

function coerceDistrict(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

function parseTypes(raw: string): EventType[] {
  const allowed = new Set(eventTypes)
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((t): t is EventType => allowed.has(t as EventType))
}

export async function createDistrictEvent(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const title = String(formData.get("title") ?? "").trim()
  const date = String(formData.get("date") ?? "").trim()
  const startTime = String(formData.get("startTime") ?? "").trim() || null
  const endTime = String(formData.get("endTime") ?? "").trim() || null
  const timezone = String(formData.get("timezone") ?? "America/Chicago").trim() || "America/Chicago"
  const locationType = String(formData.get("locationType") ?? "in-person") as LocationType
  const address = String(formData.get("address") ?? "").trim() || null
  const meetingLink = String(formData.get("meetingLink") ?? "").trim() || null
  const description = String(formData.get("description") ?? "").trim()
  const parsedTypes = parseTypes(String(formData.get("types") ?? "District"))
  const types = parsedTypes.length ? parsedTypes : ["District"]

  if (!title) throw new Error("Title is required")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Date must be YYYY-MM-DD")
  if (!description) throw new Error("Description is required")

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

  const title = String(formData.get("title") ?? "").trim()
  const date = String(formData.get("date") ?? "").trim()
  const startTime = String(formData.get("startTime") ?? "").trim() || null
  const endTime = String(formData.get("endTime") ?? "").trim() || null
  const timezone = String(formData.get("timezone") ?? "America/Chicago").trim() || "America/Chicago"
  const locationType = String(formData.get("locationType") ?? "in-person") as LocationType
  const address = String(formData.get("address") ?? "").trim() || null
  const meetingLink = String(formData.get("meetingLink") ?? "").trim() || null
  const description = String(formData.get("description") ?? "").trim()
  const parsedTypes = parseTypes(String(formData.get("types") ?? "District"))
  const types = parsedTypes.length ? parsedTypes : ["District"]

  if (!title) throw new Error("Title is required")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Date must be YYYY-MM-DD")
  if (!description) throw new Error("Description is required")

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
