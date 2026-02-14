"use server"

import { requireHostedDistrictAccessSession } from "@/lib/auth/guards"
import { getDb, schema } from "@/lib/db"
import { ensureDistrictSiteExists } from "@/lib/district/ensure-site"
import { parseOptionalText, parseRequiredText } from "@/lib/district/validation"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { sql } from "drizzle-orm"

function coerceDistrict(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export async function createDistrictUpdate(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const committee = parseOptionalText(formData.get("committee"), "Committee", 120)
  const title = parseRequiredText(formData.get("title"), "Title", 200)
  const body = parseRequiredText(formData.get("body"), "Body", 10000)

  const db = await getDb()
  await ensureDistrictSiteExists(db, districtNumber)
  await db.insert(schema.districtUpdates).values({
    id: crypto.randomUUID(),
    districtNumber,
    committee,
    title,
    body,
    publishedAt: null,
    authorEmail: session.user.email,
  })

  revalidatePath("/admin/updates")
}

export async function updateDistrictUpdate(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const id = String(formData.get("id") ?? "").trim()
  if (!id) throw new Error("Missing id")

  const committee = parseOptionalText(formData.get("committee"), "Committee", 120)
  const title = parseRequiredText(formData.get("title"), "Title", 200)
  const body = parseRequiredText(formData.get("body"), "Body", 10000)

  const db = await getDb()
  await db
    .update(schema.districtUpdates)
    .set({
      committee,
      title,
      body,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(schema.districtUpdates.id, id), eq(schema.districtUpdates.districtNumber, districtNumber)))

  revalidatePath("/admin/updates")
}

export async function publishDistrictUpdate(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const id = String(formData.get("id") ?? "").trim()
  if (!id) throw new Error("Missing id")

  const db = await getDb()
  await db
    .update(schema.districtUpdates)
    .set({
      publishedAt: sql`(datetime('now'))` as any,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(schema.districtUpdates.id, id), eq(schema.districtUpdates.districtNumber, districtNumber)))

  revalidatePath("/admin/updates")
  revalidatePath("/updates")
}

export async function unpublishDistrictUpdate(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const id = String(formData.get("id") ?? "").trim()
  if (!id) throw new Error("Missing id")

  const db = await getDb()
  await db
    .update(schema.districtUpdates)
    .set({
      publishedAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(schema.districtUpdates.id, id), eq(schema.districtUpdates.districtNumber, districtNumber)))

  revalidatePath("/admin/updates")
  revalidatePath("/updates")
}

export async function deleteDistrictUpdate(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const id = String(formData.get("id") ?? "").trim()
  if (!id) throw new Error("Missing id")

  const db = await getDb()
  await db
    .delete(schema.districtUpdates)
    .where(and(eq(schema.districtUpdates.id, id), eq(schema.districtUpdates.districtNumber, districtNumber)))

  revalidatePath("/admin/updates")
  revalidatePath("/updates")
}
