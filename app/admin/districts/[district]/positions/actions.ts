"use server"

import { requireHostedDistrictAccessSession } from "@/lib/auth/guards"
import { getDb, schema } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { DistrictPositionStatus } from "@/lib/db/schema"

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

  const title = String(formData.get("title") ?? "").trim()
  const status = String(formData.get("status") ?? "open") as DistrictPositionStatus
  const contactName = String(formData.get("contactName") ?? "").trim() || null
  const contactEmail = String(formData.get("contactEmail") ?? "").trim().toLowerCase() || null
  const notes = String(formData.get("notes") ?? "").trim() || null
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0

  if (!title) throw new Error("Title is required")

  const db = await getDb()
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

  const title = String(formData.get("title") ?? "").trim()
  const status = String(formData.get("status") ?? "open") as DistrictPositionStatus
  const contactName = String(formData.get("contactName") ?? "").trim() || null
  const contactEmail = String(formData.get("contactEmail") ?? "").trim().toLowerCase() || null
  const notes = String(formData.get("notes") ?? "").trim() || null
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0

  if (!title) throw new Error("Title is required")

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
