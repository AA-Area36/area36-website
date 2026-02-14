"use server"

import { requireHostedDistrictAccessSession } from "@/lib/auth/guards"
import { getDb, schema } from "@/lib/db"
import { ensureDistrictSiteExists } from "@/lib/district/ensure-site"
import {
  parseDistrictContactCategory,
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

export async function createDistrictContact(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const category = parseDistrictContactCategory(formData.get("category") ?? "other")
  const role = parseRequiredText(formData.get("role"), "Role", 120)
  const name = parseOptionalText(formData.get("name"), "Name", 120)
  const email = parseOptionalEmail(formData.get("email"))
  const phone = parseOptionalText(formData.get("phone"), "Phone", 40)
  const active = formData.get("active") === "on"
  const sortOrder = parseSortOrder(formData.get("sortOrder"))

  const db = await getDb()
  await ensureDistrictSiteExists(db, districtNumber)
  await db.insert(schema.districtContacts).values({
    id: crypto.randomUUID(),
    districtNumber,
    category,
    role,
    name,
    email,
    phone,
    active,
    sortOrder,
  })

  revalidatePath("/admin/contacts")
}

export async function updateDistrictContact(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const id = String(formData.get("id") ?? "").trim()
  if (!id) throw new Error("Missing id")

  const category = parseDistrictContactCategory(formData.get("category") ?? "other")
  const role = parseRequiredText(formData.get("role"), "Role", 120)
  const name = parseOptionalText(formData.get("name"), "Name", 120)
  const email = parseOptionalEmail(formData.get("email"))
  const phone = parseOptionalText(formData.get("phone"), "Phone", 40)
  const active = formData.get("active") === "on"
  const sortOrder = parseSortOrder(formData.get("sortOrder"))

  const db = await getDb()
  await db
    .update(schema.districtContacts)
    .set({
      category,
      role,
      name,
      email,
      phone,
      active,
      sortOrder,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(schema.districtContacts.id, id), eq(schema.districtContacts.districtNumber, districtNumber)))

  revalidatePath("/admin/contacts")
}

export async function deleteDistrictContact(formData: FormData) {
  const districtNumber = coerceDistrict(formData.get("districtNumber"))
  if (!districtNumber) throw new Error("Invalid district")

  const session = await requireHostedDistrictAccessSession(districtNumber)
  if (!session?.user?.email) throw new Error("Unauthorized")

  const id = String(formData.get("id") ?? "").trim()
  if (!id) throw new Error("Missing id")

  const db = await getDb()
  await db
    .delete(schema.districtContacts)
    .where(and(eq(schema.districtContacts.id, id), eq(schema.districtContacts.districtNumber, districtNumber)))

  revalidatePath("/admin/contacts")
}
