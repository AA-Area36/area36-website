"use server"

import { requireHostedDistrictAccessSession } from "@/lib/auth/guards"
import { getDb, schema } from "@/lib/db"
import { ensureDistrictSiteExists } from "@/lib/district/ensure-site"
import {
  parseDistrictPositionStatus,
  parseOptionalEmail,
  parseOptionalText,
  parseRequiredText,
  parseSortOrder,
} from "@/lib/district/validation"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

function coerceDistrict(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export async function createDistrictPosition(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const title = parseRequiredText(formData.get("title"), "Title", 160)
  const status = parseDistrictPositionStatus(formData.get("status") ?? "open")
  const contactName = parseOptionalText(formData.get("contactName"), "Contact name", 120)
  const contactEmail = parseOptionalEmail(formData.get("contactEmail"), "Contact email")
  const notes = parseOptionalText(formData.get("notes"), "Notes", 4000)
  const sortOrder = parseSortOrder(formData.get("sortOrder"))

  const db = await getDb()
  await ensureDistrictSiteExists(db, districtNumber)
  await db.insert(schema.districtPositions).values({
    id: crypto.randomUUID(),
    districtNumber,
    title,
    status,
    contactName,
    contactEmail,
    notes,
    sortOrder,
  })

  revalidatePath("/admin/positions")
}

export async function updateDistrictPosition(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const id = String(formData.get("id") ?? "").trim()
  if (!id) throw new Error("Missing id")

  const title = parseRequiredText(formData.get("title"), "Title", 160)
  const status = parseDistrictPositionStatus(formData.get("status") ?? "open")
  const contactName = parseOptionalText(formData.get("contactName"), "Contact name", 120)
  const contactEmail = parseOptionalEmail(formData.get("contactEmail"), "Contact email")
  const notes = parseOptionalText(formData.get("notes"), "Notes", 4000)
  const sortOrder = parseSortOrder(formData.get("sortOrder"))

  const db = await getDb()
  await db
    .update(schema.districtPositions)
    .set({
      title,
      status,
      contactName,
      contactEmail,
      notes,
      sortOrder,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(schema.districtPositions.id, id), eq(schema.districtPositions.districtNumber, districtNumber)))

  revalidatePath("/admin/positions")
}

export async function deleteDistrictPosition(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const id = String(formData.get("id") ?? "").trim()
  if (!id) throw new Error("Missing id")

  const db = await getDb()
  await db
    .delete(schema.districtPositions)
    .where(and(eq(schema.districtPositions.id, id), eq(schema.districtPositions.districtNumber, districtNumber)))

  revalidatePath("/admin/positions")
}
