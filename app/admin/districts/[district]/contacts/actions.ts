"use server"

import { requireHostedDistrictAccessSession } from "@/lib/auth/guards"
import { getDb, schema } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { DistrictContactCategory } from "@/lib/db/schema"

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

  const category = String(formData.get("category") ?? "other") as DistrictContactCategory
  const role = String(formData.get("role") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim() || null
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null
  const phone = String(formData.get("phone") ?? "").trim() || null
  const active = formData.get("active") === "on"
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0

  if (!role) throw new Error("Role is required")

  const db = await getDb()
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

  const category = String(formData.get("category") ?? "other") as DistrictContactCategory
  const role = String(formData.get("role") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim() || null
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null
  const phone = String(formData.get("phone") ?? "").trim() || null
  const active = formData.get("active") === "on"
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0

  if (!role) throw new Error("Role is required")

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
