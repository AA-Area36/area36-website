"use server"

import { requireAreaAdminSession } from "@/lib/auth/guards"
import { getDb, schema } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { sql } from "drizzle-orm"
import { validateRedirectUrl } from "@/lib/district/sites"
import { revalidatePath } from "next/cache"

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function upsertDistrictSite(formData: FormData) {
  const session = await requireAreaAdminSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const districtNumber = Number(formData.get("districtNumber"))
  const enabled = formData.get("enabled") === "on"
  const mode = String(formData.get("mode") ?? "hosted") as "hosted" | "external_redirect"
  const displayName = String(formData.get("displayName") ?? "").trim() || `District ${districtNumber}`
  const redirectUrlRaw = String(formData.get("redirectUrl") ?? "").trim()

  let redirectUrl: string | null = null
  if (mode === "external_redirect") {
    const v = validateRedirectUrl(redirectUrlRaw)
    if (!v.ok) throw new Error(v.error)
    redirectUrl = v.url
  }

  if (!Number.isFinite(districtNumber) || districtNumber < 1 || districtNumber > 27 || districtNumber === 10) {
    throw new Error("Invalid district number")
  }

  const db = await getDb()
  const now = sql`(datetime('now'))`

  await db
    .insert(schema.districtSites)
    .values({
      districtNumber,
      subdomain: `d${districtNumber}`,
      displayName,
      enabled,
      mode,
      redirectUrl,
      updatedAt: now as any,
    })
    .onConflictDoUpdate({
      target: schema.districtSites.districtNumber,
      set: {
        displayName,
        enabled,
        mode,
        redirectUrl,
        updatedAt: now as any,
      },
    })

  // If switching to external_redirect, purge any district admins (district is fully outside our system).
  if (mode === "external_redirect") {
    await db.delete(schema.districtAdmins).where(eq(schema.districtAdmins.districtNumber, districtNumber))
  }

  revalidatePath("/admin/district-sites")
  revalidatePath(`/admin/district-sites/${districtNumber}`)
}

export async function addDistrictAdmin(formData: FormData) {
  const session = await requireAreaAdminSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const districtNumber = Number(formData.get("districtNumber"))
  const email = normalizeEmail(String(formData.get("email") ?? ""))
  const role = String(formData.get("role") ?? "editor") as "manager" | "editor"

  if (!email.includes("@")) throw new Error("Invalid email")
  if (!Number.isFinite(districtNumber)) throw new Error("Invalid district number")

  const db = await getDb()
  const site = await db
    .select({ enabled: schema.districtSites.enabled, mode: schema.districtSites.mode })
    .from(schema.districtSites)
    .where(eq(schema.districtSites.districtNumber, districtNumber))
    .get()

  if (!site || !site.enabled || site.mode !== "hosted") {
    throw new Error("District site is not hosted/enabled")
  }

  const now = sql`(datetime('now'))`
  await db
    .insert(schema.districtAdmins)
    .values({
      districtNumber,
      email,
      role,
      updatedAt: now as any,
    })
    .onConflictDoUpdate({
      target: [schema.districtAdmins.districtNumber, schema.districtAdmins.email],
      set: { role, updatedAt: now as any },
    })

  revalidatePath(`/admin/district-sites/${districtNumber}`)
}

export async function removeDistrictAdmin(formData: FormData) {
  const session = await requireAreaAdminSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const districtNumber = Number(formData.get("districtNumber"))
  const email = normalizeEmail(String(formData.get("email") ?? ""))
  if (!Number.isFinite(districtNumber) || !email) throw new Error("Invalid input")

  const db = await getDb()
  await db
    .delete(schema.districtAdmins)
    .where(and(eq(schema.districtAdmins.districtNumber, districtNumber), eq(schema.districtAdmins.email, email)))

  revalidatePath(`/admin/district-sites/${districtNumber}`)
}
