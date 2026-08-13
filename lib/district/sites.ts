import { getDb, schema } from "@/lib/db"
import { eq } from "drizzle-orm"

export type DistrictSiteMode = "hosted" | "external_redirect"

export type DistrictSiteRow = {
  districtNumber: number
  subdomain: string
  displayName: string
  enabled: boolean
  mode: DistrictSiteMode
  redirectUrl: string | null
  createdAt: string
  updatedAt: string
}

export async function getDistrictSiteByNumber(districtNumber: number): Promise<DistrictSiteRow | null> {
  const db = await getDb()
  const row = await db
    .select({
      districtNumber: schema.districtSites.districtNumber,
      subdomain: schema.districtSites.subdomain,
      displayName: schema.districtSites.displayName,
      enabled: schema.districtSites.enabled,
      mode: schema.districtSites.mode,
      redirectUrl: schema.districtSites.redirectUrl,
      createdAt: schema.districtSites.createdAt,
      updatedAt: schema.districtSites.updatedAt,
    })
    .from(schema.districtSites)
    .where(eq(schema.districtSites.districtNumber, districtNumber))
    .get()
  return row ?? null
}

export async function getDistrictSiteBySubdomain(subdomain: string): Promise<DistrictSiteRow | null> {
  const db = await getDb()
  const row = await db
    .select({
      districtNumber: schema.districtSites.districtNumber,
      subdomain: schema.districtSites.subdomain,
      displayName: schema.districtSites.displayName,
      enabled: schema.districtSites.enabled,
      mode: schema.districtSites.mode,
      redirectUrl: schema.districtSites.redirectUrl,
      createdAt: schema.districtSites.createdAt,
      updatedAt: schema.districtSites.updatedAt,
    })
    .from(schema.districtSites)
    .where(eq(schema.districtSites.subdomain, subdomain))
    .get()
  return row ?? null
}

export async function listDistrictSites(): Promise<DistrictSiteRow[]> {
  const db = await getDb()
  const rows = await db
    .select({
      districtNumber: schema.districtSites.districtNumber,
      subdomain: schema.districtSites.subdomain,
      displayName: schema.districtSites.displayName,
      enabled: schema.districtSites.enabled,
      mode: schema.districtSites.mode,
      redirectUrl: schema.districtSites.redirectUrl,
      createdAt: schema.districtSites.createdAt,
      updatedAt: schema.districtSites.updatedAt,
    })
    .from(schema.districtSites)
    .all()
  return rows
}

export function validateRedirectUrl(value: string): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = value.trim()
  if (!trimmed) return { ok: false, error: "Redirect URL is required" }
  let u: URL
  try {
    u = new URL(trimmed)
  } catch {
    return { ok: false, error: "Invalid URL" }
  }
  if (u.protocol !== "https:") return { ok: false, error: "Redirect URL must use https://" }
  return { ok: true, url: u.toString() }
}
