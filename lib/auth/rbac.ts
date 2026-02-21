import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { appRoles, appUserAccess, users } from "@/lib/db/schema"

type SessionLike = {
  user?: {
    email?: string | null
    id?: string
    isAreaAdmin?: boolean
  }
} | null

export const ADMIN_PERMISSIONS = [
  "events:read",
  "events:write",
  "recordings:read",
  "recordings:write",
  "files:read",
  "files:write",
  "subscription-drives:read",
  "subscription-drives:write",
  "reports:read",
  "content:read",
  "content:write",
  "district-sites:read",
  "district-sites:write",
  "corrections:view",
  "corrections:edit",
  "corrections:match",
  "access:read",
  "access:write",
] as const

export type AppPermission = (typeof ADMIN_PERMISSIONS)[number]

export type SeedAssignment = {
  roleKey: "admin" | "officer" | "chair"
  additionalPermissions: AppPermission[]
}

const SEED_ASSIGNMENTS: Record<string, SeedAssignment> = {
  "webmaster@area36.org": { roleKey: "admin", additionalPermissions: [] },
  "technology@area36.org": { roleKey: "admin", additionalPermissions: [] },
  "alltechnology@area36.org": { roleKey: "admin", additionalPermissions: [] },
  "alttechnology@area36.org": { roleKey: "admin", additionalPermissions: [] },
  "corrections@area36.org": { roleKey: "chair", additionalPermissions: ["corrections:view"] },
  "altcorrections@area36.org": { roleKey: "chair", additionalPermissions: ["corrections:view"] },
  "ctcp@area36.org": {
    roleKey: "chair",
    additionalPermissions: ["corrections:view", "corrections:edit", "corrections:match"],
  },
}

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? ""
}

function parsePermissionJson(raw: string | null | undefined): AppPermission[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    const allowed = new Set<string>(ADMIN_PERMISSIONS)
    return parsed.filter((item): item is AppPermission => typeof item === "string" && allowed.has(item))
  } catch {
    return []
  }
}

export function getSeedAssignmentByEmail(email: string | null | undefined): SeedAssignment | null {
  const normalized = normalizeEmail(email)
  return SEED_ASSIGNMENTS[normalized] ?? null
}

export function isSeedEmailAllowed(email: string | null | undefined): boolean {
  return !!getSeedAssignmentByEmail(email)
}

async function upsertSeedAccess(userId: string, email: string) {
  const seed = getSeedAssignmentByEmail(email)
  if (!seed) return

  const db = await getDb()
  const now = new Date().toISOString()
  await db
    .insert(appUserAccess)
    .values({
      userId,
      roleKey: seed.roleKey,
      additionalPermissionsJson: JSON.stringify(seed.additionalPermissions),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: appUserAccess.userId,
      set: {
        roleKey: seed.roleKey,
        additionalPermissionsJson: JSON.stringify(seed.additionalPermissions),
        updatedAt: now,
      },
    })
}

export async function hasAssignedAccessForEmail(email: string | null | undefined): Promise<boolean> {
  const normalized = normalizeEmail(email)
  if (!normalized) return false

  try {
    const db = await getDb()
    const row = await db
      .select({ userId: appUserAccess.userId })
      .from(appUserAccess)
      .innerJoin(users, eq(users.id, appUserAccess.userId))
      .where(eq(users.email, normalized))
      .get()

    return !!row
  } catch {
    return false
  }
}

export async function getEffectivePermissions(session: SessionLike): Promise<Set<AppPermission>> {
  if (!session?.user?.email || !session.user.id) return new Set<AppPermission>()

  if (session.user.isAreaAdmin) {
    return new Set<AppPermission>(ADMIN_PERMISSIONS)
  }

  const email = normalizeEmail(session.user.email)

  try {
    await upsertSeedAccess(session.user.id, email)

    const db = await getDb()
    const accessRow = await db
      .select({
        roleKey: appUserAccess.roleKey,
        additionalPermissionsJson: appUserAccess.additionalPermissionsJson,
      })
      .from(appUserAccess)
      .where(eq(appUserAccess.userId, session.user.id))
      .get()

    if (!accessRow) {
      const seed = getSeedAssignmentByEmail(email)
      return new Set(seed?.additionalPermissions ?? [])
    }

    const roleRow = await db
      .select({ defaultPermissionsJson: appRoles.defaultPermissionsJson })
      .from(appRoles)
      .where(eq(appRoles.roleKey, accessRow.roleKey))
      .get()

    const defaults = parsePermissionJson(roleRow?.defaultPermissionsJson)
    const additional = parsePermissionJson(accessRow.additionalPermissionsJson)

    return new Set<AppPermission>([...defaults, ...additional])
  } catch {
    const seed = getSeedAssignmentByEmail(email)
    return new Set(seed?.additionalPermissions ?? [])
  }
}

export async function hasPermission(session: SessionLike, permission: AppPermission): Promise<boolean> {
  const permissions = await getEffectivePermissions(session)
  return permissions.has(permission)
}

export async function requireCorrectionsWrite(session: SessionLike): Promise<boolean> {
  if (!session?.user?.email) return false
  if (session.user.isAreaAdmin) return true
  return hasPermission(session, "corrections:edit")
}
