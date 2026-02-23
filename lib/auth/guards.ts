import { getCloudflareContext } from "@opennextjs/cloudflare"
import { getSession, type A36Session } from "@/lib/auth"
import { isLocalAdminBypassEnabled } from "@/lib/auth/dev-bypass"
import { hasPermission, isEffectivelyAreaAdmin, requireCorrectionsDelete, requireCorrectionsWrite } from "@/lib/auth/rbac"

type DistrictSiteMode = "hosted" | "external_redirect"

async function getDistrictSiteMode(env: CloudflareEnv, districtNumber: number): Promise<{ enabled: boolean; mode: DistrictSiteMode } | null> {
  try {
    const row = await env.DB
      .prepare("SELECT enabled, mode FROM district_sites WHERE district_number = ? LIMIT 1")
      .bind(districtNumber)
      .first<{ enabled: number | boolean; mode: DistrictSiteMode }>()
    if (!row) return null
    const enabled = typeof row.enabled === "number" ? row.enabled === 1 : !!row.enabled
    return { enabled, mode: row.mode }
  } catch {
    return null
  }
}

export async function requireAreaAdminSession(): Promise<A36Session | null> {
  const session = await getSession()
  if (!session) return null
  if (!session.user.isAreaAdmin) return null
  return session
}

export async function requireCorrectionsReadSession(): Promise<A36Session | null> {
  const session = await getSession()
  if (!session) return null
  if (await isEffectivelyAreaAdmin(session)) return session

  if (await hasPermission(session, "corrections:view")) {
    return session
  }

  return null
}

export async function requireCorrectionsWriteSession(): Promise<A36Session | null> {
  const session = await getSession()
  if (!session) return null

  if (await requireCorrectionsWrite(session)) {
    return session
  }

  return null
}

export async function requireCorrectionsDeleteSession(): Promise<A36Session | null> {
  const session = await getSession()
  if (!session) return null

  if (await requireCorrectionsDelete(session)) {
    return session
  }

  return null
}

export async function requireHostedDistrictAccessSession(districtNumber: number): Promise<A36Session | null> {
  const session = await getSession()
  if (!session) return null
  if (await isLocalAdminBypassEnabled()) return session

  const { env } = await getCloudflareContext({ async: true })
  const site = await getDistrictSiteMode(env, districtNumber)
  if (!site || !site.enabled || site.mode !== "hosted") return null

  if (session.user.isAreaAdmin) return session
  if (session.user.districtAdminFor.includes(districtNumber)) return session
  return null
}
