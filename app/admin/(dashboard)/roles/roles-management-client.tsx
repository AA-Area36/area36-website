"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormSubmitButton } from "@/components/form-submit-button"
import { PermissionCombobox } from "./permission-combobox"

type RoleKey = "admin" | "officer" | "chair"

type RoleOption = {
  roleKey: RoleKey
  displayName: string
  defaultPermissionsJson: string
}

type RoleAssignment = {
  userId: string
  email: string
  roleKey: RoleKey
  additionalPermissions: string[]
  updatedAt: string
}

interface RolesManagementClientProps {
  roleOptions: RoleOption[]
  assignments: RoleAssignment[]
  permissionOptions: string[]
  upsertAppUserRoleAction: (formData: FormData) => Promise<void>
  updateAppUserRoleAction: (formData: FormData) => Promise<void>
  removeAppUserAccessAction: (formData: FormData) => Promise<void>
  addAppUserPermissionAction: (formData: FormData) => Promise<void>
  removeAppUserPermissionAction: (formData: FormData) => Promise<void>
}

function parsePermissions(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : []
  } catch {
    return []
  }
}

function formatPermissionLabel(value: string): string {
  return value.replace(/:/g, " / ")
}

export function RolesManagementClient({
  roleOptions,
  assignments,
  permissionOptions,
  upsertAppUserRoleAction,
  updateAppUserRoleAction,
  removeAppUserAccessAction,
  addAppUserPermissionAction,
  removeAppUserPermissionAction,
}: RolesManagementClientProps) {
  const [newRoleKey, setNewRoleKey] = React.useState<RoleKey>("chair")
  const [editRoleByUser, setEditRoleByUser] = React.useState<Record<string, RoleKey>>(() =>
    Object.fromEntries(assignments.map((a) => [a.userId, a.roleKey])) as Record<string, RoleKey>
  )
  const [permissionByUser, setPermissionByUser] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    setEditRoleByUser(Object.fromEntries(assignments.map((a) => [a.userId, a.roleKey])) as Record<string, RoleKey>)
  }, [assignments])

  React.useEffect(() => {
    setPermissionByUser((prev) => {
      const next: Record<string, string> = {}
      for (const assignment of assignments) {
        const selected = prev[assignment.userId]
        if (!selected) continue
        const stillAvailable = permissionOptions.some(
          (permission) =>
            permission === selected &&
            !assignment.additionalPermissions.includes(permission)
        )
        if (stillAvailable) next[assignment.userId] = selected
      }
      return next
    })
  }, [assignments, permissionOptions])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Role Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign application roles for non-Area-admin users and add user-level permissions as needed.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Add or update user role</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          If the email has never signed in before, a user record will be created automatically.
        </p>
        <form action={upsertAppUserRoleAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <div>
            <label htmlFor="role-email" className="text-xs font-medium text-muted-foreground">
              Email
            </label>
            <input
              id="role-email"
              name="email"
              type="email"
              required
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              placeholder="user@area36.org"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Role</label>
            <input type="hidden" name="roleKey" value={newRoleKey} />
            <Select
              value={newRoleKey}
              onValueChange={(value) => setNewRoleKey(value as RoleKey)}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role.roleKey} value={role.roleKey}>
                    {role.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:self-end">
            <FormSubmitButton pendingText="Saving...">Add / Update</FormSubmitButton>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">Current access assignments</h2>
        </div>

        {assignments.length === 0 ? (
          <div className="px-6 py-8 text-sm text-muted-foreground">No role assignments configured yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {assignments.map((assignment) => {
              const selectedPermission = permissionByUser[assignment.userId] ?? ""
              const availablePermissions = permissionOptions.filter(
                (permission) => !assignment.additionalPermissions.includes(permission)
              )
              const roleValue = editRoleByUser[assignment.userId] ?? assignment.roleKey

              return (
                <div
                  key={assignment.userId}
                  className="flex flex-col gap-4 px-6 py-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{assignment.email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Updated: {assignment.updatedAt}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <form action={updateAppUserRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={assignment.userId} />
                        <input type="hidden" name="roleKey" value={roleValue} />
                        <div className="min-w-44">
                          <Select
                            value={roleValue}
                            onValueChange={(value) =>
                              setEditRoleByUser((prev) => ({
                                ...prev,
                                [assignment.userId]: value as RoleKey,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roleOptions.map((role) => (
                                <SelectItem key={role.roleKey} value={role.roleKey}>
                                  {role.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <FormSubmitButton variant="outline" pendingText="Saving...">
                          Save
                        </FormSubmitButton>
                      </form>

                      <form action={removeAppUserAccessAction}>
                        <input type="hidden" name="userId" value={assignment.userId} />
                        <FormSubmitButton variant="ghost" pendingText="Removing...">
                          Remove
                        </FormSubmitButton>
                      </form>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Individual Permissions
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {assignment.additionalPermissions.length === 0 && (
                        <span className="text-xs text-muted-foreground">No user-specific permissions.</span>
                      )}

                      {assignment.additionalPermissions.map((permission) => (
                        <form action={removeAppUserPermissionAction} key={`${assignment.userId}-${permission}`}>
                          <input type="hidden" name="userId" value={assignment.userId} />
                          <input type="hidden" name="permission" value={permission} />
                          <Button
                            type="submit"
                            variant="secondary"
                            size="sm"
                            className="h-7 gap-2 pr-2"
                          >
                            <Badge variant="outline" className="h-5 border-transparent bg-transparent px-0 text-xs">
                              {formatPermissionLabel(permission)}
                            </Badge>
                            <span className="text-xs">Remove</span>
                          </Button>
                        </form>
                      ))}
                    </div>

                    <form action={addAppUserPermissionAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                      <input type="hidden" name="userId" value={assignment.userId} />
                      <input type="hidden" name="permission" value={selectedPermission} />
                      <PermissionCombobox
                        value={selectedPermission}
                        onChange={(value) =>
                          setPermissionByUser((prev) => ({
                            ...prev,
                            [assignment.userId]: value,
                          }))
                        }
                        options={availablePermissions}
                        placeholder={
                          availablePermissions.length > 0
                            ? "Add permission..."
                            : "All permissions already granted"
                        }
                      />
                      <FormSubmitButton
                        pendingText="Adding..."
                        disabled={!selectedPermission || availablePermissions.length === 0}
                      >
                        Add Permission
                      </FormSubmitButton>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Role defaults</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {roleOptions.map((role) => {
            const defaults = parsePermissions(role.defaultPermissionsJson)
            return (
              <div key={role.roleKey} className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm font-medium text-foreground">{role.displayName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {defaults.length} default permission{defaults.length === 1 ? "" : "s"}
                </p>
                {defaults.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {defaults.map((permission) => (
                      <Badge key={`${role.roleKey}-${permission}`} variant="outline" className="text-[11px]">
                        {formatPermissionLabel(permission)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">No default permissions.</p>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
