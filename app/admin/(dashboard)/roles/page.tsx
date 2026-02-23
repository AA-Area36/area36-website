import { asc, eq } from "drizzle-orm"
import { getDb, schema } from "@/lib/db"
import { ADMIN_PERMISSIONS } from "@/lib/auth/permissions"
import {
  createAppRole,
  updateAppRole,
  addAppUserPermission,
  removeAppUserAccess,
  removeAppUserPermission,
  updateAppUserRole,
  upsertAppUserRole,
} from "./actions"
import { RolesManagementClient } from "./roles-management-client"

export const dynamic = "force-dynamic"

function parseAdditionalPermissions(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    const allowed = new Set<string>(ADMIN_PERMISSIONS)
    return Array.isArray(parsed)
      ? parsed.filter((p): p is string => typeof p === "string" && allowed.has(p))
      : []
  } catch {
    return []
  }
}

export default async function RoleManagementPage() {
  const db = await getDb()
  const [roles, assignments] = await Promise.all([
    db
      .select({
        roleKey: schema.appRoles.roleKey,
        displayName: schema.appRoles.displayName,
        defaultPermissionsJson: schema.appRoles.defaultPermissionsJson,
      })
      .from(schema.appRoles)
      .orderBy(asc(schema.appRoles.roleKey))
      .all(),
    db
      .select({
        userId: schema.appUserAccess.userId,
        email: schema.users.email,
        roleKey: schema.appUserAccess.roleKey,
        additionalPermissionsJson: schema.appUserAccess.additionalPermissionsJson,
        updatedAt: schema.appUserAccess.updatedAt,
      })
      .from(schema.appUserAccess)
      .innerJoin(schema.users, eq(schema.users.id, schema.appUserAccess.userId))
      .orderBy(asc(schema.users.email))
      .all(),
  ])

  const roleOptions = roles.length > 0
    ? roles
    : [
        { roleKey: "chair", displayName: "Chair", defaultPermissionsJson: "[]" },
        { roleKey: "officer", displayName: "Officer", defaultPermissionsJson: "[]" },
        { roleKey: "admin", displayName: "Admin", defaultPermissionsJson: JSON.stringify(ADMIN_PERMISSIONS) },
      ]

  const normalizedAssignments = assignments.map((assignment) => ({
    userId: assignment.userId,
    email: assignment.email,
    roleKey: assignment.roleKey,
    updatedAt: assignment.updatedAt,
    additionalPermissions: parseAdditionalPermissions(assignment.additionalPermissionsJson),
  }))

  return (
    <RolesManagementClient
      roleOptions={roleOptions}
      assignments={normalizedAssignments}
      permissionOptions={[...ADMIN_PERMISSIONS]}
      createAppRoleAction={createAppRole}
      updateAppRoleAction={updateAppRole}
      upsertAppUserRoleAction={upsertAppUserRole}
      updateAppUserRoleAction={updateAppUserRole}
      removeAppUserAccessAction={removeAppUserAccess}
      addAppUserPermissionAction={addAppUserPermission}
      removeAppUserPermissionAction={removeAppUserPermission}
    />
  )
}
