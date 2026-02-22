"use server"

import { revalidatePath } from "next/cache"
import { eq, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { requireAreaAdminSession } from "@/lib/auth/guards"
import { getDb, schema } from "@/lib/db"
import { ADMIN_PERMISSIONS, type AppPermission } from "@/lib/auth/rbac"
import type { AppRoleKey } from "@/lib/db/schema"

const ADMIN_ROLE_KEY = "admin"
const PROTECTED_AREA_ADMIN_EMAIL = "webmaster@area36.org"

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function parseRoleKey(value: unknown): AppRoleKey {
  const role = String(value ?? "").trim().toLowerCase()
  if (!/^[a-z][a-z0-9_-]{0,63}$/.test(role)) throw new Error("Invalid role key")
  return role
}

function parseDisplayName(value: unknown): string {
  const displayName = String(value ?? "").trim()
  if (!displayName) throw new Error("Role display name is required")
  if (displayName.length > 80) throw new Error("Role display name is too long")
  return displayName
}

function parsePermission(value: unknown): AppPermission {
  const permission = String(value ?? "").trim() as AppPermission
  if (!ADMIN_PERMISSIONS.includes(permission)) {
    throw new Error("Invalid permission")
  }
  return permission
}

function parsePermissionJson(raw: string | null | undefined): AppPermission[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const allowed = new Set<string>(ADMIN_PERMISSIONS)
    return parsed.filter((entry): entry is AppPermission => typeof entry === "string" && allowed.has(entry))
  } catch {
    return []
  }
}

function parseDefaultPermissions(formData: FormData): AppPermission[] {
  const selected = formData.getAll("defaultPermissions")
  const parsed: AppPermission[] = []

  for (const entry of selected) {
    const raw = String(entry ?? "").trim()
    if (!raw) continue
    const permission = raw as AppPermission
    if (!ADMIN_PERMISSIONS.includes(permission)) {
      throw new Error("Invalid default permission")
    }
    parsed.push(permission)
  }

  return Array.from(new Set(parsed))
}

function isProtectedAreaAdminEmail(email: string): boolean {
  return normalizeEmail(email) === PROTECTED_AREA_ADMIN_EMAIL
}

async function ensureRoleExists(
  db: Awaited<ReturnType<typeof getDb>>,
  roleKey: AppRoleKey
): Promise<void> {
  const role = await db
    .select({ roleKey: schema.appRoles.roleKey })
    .from(schema.appRoles)
    .where(eq(schema.appRoles.roleKey, roleKey))
    .get()

  if (!role) throw new Error("Role does not exist")
}

async function getUserEmailById(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string
): Promise<string | null> {
  const user = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get()

  return user?.email ?? null
}

async function getOrCreateUserIdByEmail(email: string): Promise<string> {
  const db = await getDb()
  const normalizedEmail = normalizeEmail(email)
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = ${normalizedEmail}`)
    .get()

  if (existing?.id) return existing.id

  const id = `role-${nanoid(16)}`
  await db.insert(schema.users).values({
    id,
    email: normalizedEmail,
  })
  return id
}

export async function createAppRole(formData: FormData) {
  const session = await requireAreaAdminSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const roleKey = parseRoleKey(formData.get("roleKey"))
  const displayName = parseDisplayName(formData.get("displayName"))
  const defaultPermissions =
    roleKey === ADMIN_ROLE_KEY ? [...ADMIN_PERMISSIONS] : parseDefaultPermissions(formData)

  const db = await getDb()
  const now = new Date().toISOString()
  await db
    .insert(schema.appRoles)
    .values({
      roleKey,
      displayName,
      defaultPermissionsJson: JSON.stringify(defaultPermissions),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.appRoles.roleKey,
      set: {
        displayName,
        defaultPermissionsJson: JSON.stringify(defaultPermissions),
        updatedAt: now,
      },
    })

  revalidatePath("/admin/roles")
}

export async function updateAppRole(formData: FormData) {
  const session = await requireAreaAdminSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const roleKey = parseRoleKey(formData.get("roleKey"))
  const displayName = parseDisplayName(formData.get("displayName"))
  const defaultPermissions =
    roleKey === ADMIN_ROLE_KEY ? [...ADMIN_PERMISSIONS] : parseDefaultPermissions(formData)

  const db = await getDb()
  await ensureRoleExists(db, roleKey)
  await db
    .update(schema.appRoles)
    .set({
      displayName,
      defaultPermissionsJson: JSON.stringify(defaultPermissions),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.appRoles.roleKey, roleKey))

  revalidatePath("/admin/roles")
}

export async function upsertAppUserRole(formData: FormData) {
  const session = await requireAreaAdminSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const email = normalizeEmail(String(formData.get("email") ?? ""))
  const roleKey = parseRoleKey(formData.get("roleKey"))
  if (!email.includes("@")) throw new Error("Invalid email")
  if (isProtectedAreaAdminEmail(email) && roleKey !== ADMIN_ROLE_KEY) {
    throw new Error("The webmaster area admin role cannot be changed")
  }

  const db = await getDb()
  await ensureRoleExists(db, roleKey)
  const userId = await getOrCreateUserIdByEmail(email)
  const now = new Date().toISOString()

  await db
    .insert(schema.appUserAccess)
    .values({
      userId,
      roleKey,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.appUserAccess.userId,
      set: {
        roleKey,
        updatedAt: now,
      },
    })

  revalidatePath("/admin/roles")
}

export async function updateAppUserRole(formData: FormData) {
  const session = await requireAreaAdminSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const userId = String(formData.get("userId") ?? "").trim()
  const roleKey = parseRoleKey(formData.get("roleKey"))
  if (!userId) throw new Error("Missing user")

  const db = await getDb()
  const email = await getUserEmailById(db, userId)
  if (email && isProtectedAreaAdminEmail(email) && roleKey !== ADMIN_ROLE_KEY) {
    throw new Error("The webmaster area admin role cannot be changed")
  }
  await ensureRoleExists(db, roleKey)
  await db
    .update(schema.appUserAccess)
    .set({
      roleKey,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.appUserAccess.userId, userId))

  revalidatePath("/admin/roles")
}

export async function removeAppUserAccess(formData: FormData) {
  const session = await requireAreaAdminSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const userId = String(formData.get("userId") ?? "").trim()
  if (!userId) throw new Error("Missing user")

  const db = await getDb()
  const email = await getUserEmailById(db, userId)
  if (email && isProtectedAreaAdminEmail(email)) {
    throw new Error("The webmaster area admin access cannot be removed")
  }
  await db
    .delete(schema.appUserAccess)
    .where(eq(schema.appUserAccess.userId, userId))

  revalidatePath("/admin/roles")
}

export async function addAppUserPermission(formData: FormData) {
  const session = await requireAreaAdminSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const userId = String(formData.get("userId") ?? "").trim()
  const permission = parsePermission(formData.get("permission"))
  if (!userId) throw new Error("Missing user")

  const db = await getDb()
  const current = await db
    .select({ additionalPermissionsJson: schema.appUserAccess.additionalPermissionsJson })
    .from(schema.appUserAccess)
    .where(eq(schema.appUserAccess.userId, userId))
    .get()

  if (!current) throw new Error("Role assignment not found")

  const existing = parsePermissionJson(current.additionalPermissionsJson)
  const updated = Array.from(new Set<AppPermission>([...existing, permission]))

  await db
    .update(schema.appUserAccess)
    .set({
      additionalPermissionsJson: JSON.stringify(updated),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.appUserAccess.userId, userId))

  revalidatePath("/admin/roles")
}

export async function removeAppUserPermission(formData: FormData) {
  const session = await requireAreaAdminSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const userId = String(formData.get("userId") ?? "").trim()
  const permission = parsePermission(formData.get("permission"))
  if (!userId) throw new Error("Missing user")

  const db = await getDb()
  const current = await db
    .select({ additionalPermissionsJson: schema.appUserAccess.additionalPermissionsJson })
    .from(schema.appUserAccess)
    .where(eq(schema.appUserAccess.userId, userId))
    .get()

  if (!current) throw new Error("Role assignment not found")

  const existing = parsePermissionJson(current.additionalPermissionsJson)
  const updated = existing.filter((entry) => entry !== permission)

  await db
    .update(schema.appUserAccess)
    .set({
      additionalPermissionsJson: JSON.stringify(updated),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.appUserAccess.userId, userId))

  revalidatePath("/admin/roles")
}
