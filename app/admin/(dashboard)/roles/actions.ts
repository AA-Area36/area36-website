"use server"

import { revalidatePath } from "next/cache"
import { eq, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { requireAreaAdminSession } from "@/lib/auth/guards"
import { getDb, schema } from "@/lib/db"
import { ADMIN_PERMISSIONS, type AppPermission } from "@/lib/auth/rbac"
import type { AppRoleKey } from "@/lib/db/schema"

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function parseRoleKey(value: unknown): AppRoleKey {
  const role = String(value ?? "").trim()
  if (role === "admin" || role === "officer" || role === "chair") return role
  throw new Error("Invalid role")
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

export async function upsertAppUserRole(formData: FormData) {
  const session = await requireAreaAdminSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const email = normalizeEmail(String(formData.get("email") ?? ""))
  const roleKey = parseRoleKey(formData.get("roleKey"))
  if (!email.includes("@")) throw new Error("Invalid email")

  const db = await getDb()
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
