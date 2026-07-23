"use server"

import { requireAreaAdminSession } from "@/lib/auth/guards"
import { getDb, schema } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { sql } from "drizzle-orm"
import { validateRedirectUrl } from "@/lib/district/sites"
import { revalidatePath } from "next/cache"

const PROTECTED_SITE_ADMIN_EMAIL = "webmaster@area36.org"

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
  // Use base columns only so local DBs that have not applied the latest district-site
  // migrations are still manageable from localhost.
  await db.$client
    .prepare(
      `INSERT INTO district_sites (
        district_number,
        subdomain,
        display_name,
        enabled,
        mode,
        redirect_url,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(district_number) DO UPDATE SET
        subdomain = excluded.subdomain,
        display_name = excluded.display_name,
        enabled = excluded.enabled,
        mode = excluded.mode,
        redirect_url = excluded.redirect_url,
        updated_at = datetime('now')`
    )
    .bind(districtNumber, `d${districtNumber}`, displayName, enabled ? 1 : 0, mode, redirectUrl)
    .run()

  // If switching to external_redirect, purge any district admins (district is fully outside our system).
  if (mode === "external_redirect") {
    await db
      .delete(schema.districtAdmins)
      .where(
        and(
          eq(schema.districtAdmins.districtNumber, districtNumber),
          sql`lower(${schema.districtAdmins.email}) <> ${PROTECTED_SITE_ADMIN_EMAIL}`
        )
      )
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
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [schema.districtAdmins.districtNumber, schema.districtAdmins.email],
      set: { role, updatedAt: now },
    })

  revalidatePath(`/admin/district-sites/${districtNumber}`)
}

export async function removeDistrictAdmin(formData: FormData) {
  const session = await requireAreaAdminSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const districtNumber = Number(formData.get("districtNumber"))
  const email = normalizeEmail(String(formData.get("email") ?? ""))
  if (!Number.isFinite(districtNumber) || !email) throw new Error("Invalid input")
  if (email === PROTECTED_SITE_ADMIN_EMAIL) {
    throw new Error("The webmaster site admin cannot be removed")
  }

  const db = await getDb()
  await db
    .delete(schema.districtAdmins)
    .where(and(eq(schema.districtAdmins.districtNumber, districtNumber), eq(schema.districtAdmins.email, email)))

  revalidatePath(`/admin/district-sites/${districtNumber}`)
}
