"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { FormSubmitButton } from "@/components/form-submit-button"
import { PermissionCombobox } from "./permission-combobox"

const ADMIN_ROLE_KEY = "admin"
const ALL_FILTER_VALUE = "__all__"
const PROTECTED_AREA_ADMIN_EMAIL = "webmaster@area36.org"

type RoleOption = {
  roleKey: string
  displayName: string
  defaultPermissionsJson: string
}

type RoleAssignment = {
  userId: string
  email: string
  roleKey: string
  additionalPermissions: string[]
  updatedAt: string
}

interface RolesManagementClientProps {
  roleOptions: RoleOption[]
  assignments: RoleAssignment[]
  permissionOptions: string[]
  createAppRoleAction: (formData: FormData) => Promise<void>
  updateAppRoleAction: (formData: FormData) => Promise<void>
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

function togglePermission(list: string[], permission: string): string[] {
  return list.includes(permission)
    ? list.filter((entry) => entry !== permission)
    : [...list, permission]
}

function matchesText(value: string, query: string): boolean {
  if (!query) return true
  return value.toLowerCase().includes(query.toLowerCase())
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function RolesManagementClient({
  roleOptions,
  assignments,
  permissionOptions,
  createAppRoleAction,
  updateAppRoleAction,
  upsertAppUserRoleAction,
  updateAppUserRoleAction,
  removeAppUserAccessAction,
  addAppUserPermissionAction,
  removeAppUserPermissionAction,
}: RolesManagementClientProps) {
  const fallbackRoleKey = roleOptions[0]?.roleKey ?? ""
  const defaultAssignmentRole =
    roleOptions.find((role) => role.roleKey !== ADMIN_ROLE_KEY)?.roleKey ?? fallbackRoleKey

  const [activeTab, setActiveTab] = React.useState("roles")

  const [createRoleKey, setCreateRoleKey] = React.useState("")
  const [createDisplayName, setCreateDisplayName] = React.useState("")
  const [createPermissions, setCreatePermissions] = React.useState<string[]>([])

  const [newAssignmentRoleKey, setNewAssignmentRoleKey] = React.useState(defaultAssignmentRole)
  const [editRoleByUser, setEditRoleByUser] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(assignments.map((a) => [a.userId, a.roleKey]))
  )
  const [permissionByUser, setPermissionByUser] = React.useState<Record<string, string>>({})

  const [roleDisplayByKey, setRoleDisplayByKey] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(roleOptions.map((role) => [role.roleKey, role.displayName]))
  )
  const [rolePermissionsByKey, setRolePermissionsByKey] = React.useState<Record<string, string[]>>(() =>
    Object.fromEntries(roleOptions.map((role) => [role.roleKey, parsePermissions(role.defaultPermissionsJson)]))
  )

  const [roleSearch, setRoleSearch] = React.useState("")
  const [rolePermissionSearch, setRolePermissionSearch] = React.useState("")
  const [roleAccordionOpen, setRoleAccordionOpen] = React.useState<string[]>([])

  const [assignmentSearch, setAssignmentSearch] = React.useState("")
  const [assignmentRoleFilter, setAssignmentRoleFilter] = React.useState(ALL_FILTER_VALUE)
  const [assignmentAccordionOpen, setAssignmentAccordionOpen] = React.useState<string[]>([])

  const [overrideSearch, setOverrideSearch] = React.useState("")
  const [overridePermissionSearch, setOverridePermissionSearch] = React.useState("")
  const [onlyWithOverrides, setOnlyWithOverrides] = React.useState(true)
  const [overrideAccordionOpen, setOverrideAccordionOpen] = React.useState<string[]>([])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Refresh editable assignment drafts when server-owned assignments change.
    setEditRoleByUser(Object.fromEntries(assignments.map((a) => [a.userId, a.roleKey])))
  }, [assignments])

  React.useEffect(() => {
    if (!newAssignmentRoleKey || !roleOptions.some((role) => role.roleKey === newAssignmentRoleKey)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Fall back when refreshed role options invalidate the current selection.
      setNewAssignmentRoleKey(defaultAssignmentRole)
    }
  }, [defaultAssignmentRole, newAssignmentRoleKey, roleOptions])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Refresh editable role drafts when server-owned options change.
    setRoleDisplayByKey(Object.fromEntries(roleOptions.map((role) => [role.roleKey, role.displayName])))
    setRolePermissionsByKey(
      Object.fromEntries(roleOptions.map((role) => [role.roleKey, parsePermissions(role.defaultPermissionsJson)]))
    )
  }, [roleOptions])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Remove per-user drafts that refreshed permissions no longer allow.
    setPermissionByUser((prev) => {
      const next: Record<string, string> = {}
      for (const assignment of assignments) {
        const selected = prev[assignment.userId]
        if (!selected) continue
        const stillAvailable = permissionOptions.some(
          (permission) => permission === selected && !assignment.additionalPermissions.includes(permission)
        )
        if (stillAvailable) next[assignment.userId] = selected
      }
      return next
    })
  }, [assignments, permissionOptions])

  const visiblePermissionOptions = React.useMemo(
    () =>
      permissionOptions.filter(
        (permission) =>
          matchesText(permission, rolePermissionSearch) ||
          matchesText(formatPermissionLabel(permission), rolePermissionSearch)
      ),
    [permissionOptions, rolePermissionSearch]
  )

  const filteredRoles = React.useMemo(() => {
    return roleOptions.filter((role) => {
      const displayName = roleDisplayByKey[role.roleKey] ?? role.displayName
      const selectedPermissions =
        role.roleKey === ADMIN_ROLE_KEY ? permissionOptions : rolePermissionsByKey[role.roleKey] ?? []

      const roleTextMatches =
        matchesText(role.roleKey, roleSearch) ||
        matchesText(displayName, roleSearch)

      const permissionMatches =
        !rolePermissionSearch ||
        selectedPermissions.some(
          (permission) =>
            matchesText(permission, rolePermissionSearch) ||
            matchesText(formatPermissionLabel(permission), rolePermissionSearch)
        )

      return roleTextMatches && permissionMatches
    })
  }, [permissionOptions, roleDisplayByKey, roleOptions, rolePermissionSearch, rolePermissionsByKey, roleSearch])

  const filteredAssignments = React.useMemo(() => {
    return assignments.filter((assignment) => {
      const matchesAssignmentSearch =
        matchesText(assignment.email, assignmentSearch) ||
        matchesText(assignment.userId, assignmentSearch)
      const matchesRole = assignmentRoleFilter === ALL_FILTER_VALUE || assignment.roleKey === assignmentRoleFilter
      return matchesAssignmentSearch && matchesRole
    })
  }, [assignmentRoleFilter, assignmentSearch, assignments])

  const filteredOverrideAssignments = React.useMemo(() => {
    return assignments.filter((assignment) => {
      const hasOverrides = assignment.additionalPermissions.length > 0
      if (onlyWithOverrides && !hasOverrides) return false

      const matchesBaseSearch =
        matchesText(assignment.email, overrideSearch) ||
        matchesText(assignment.userId, overrideSearch)
      if (!matchesBaseSearch) return false

      if (!overridePermissionSearch) return true

      return assignment.additionalPermissions.some(
        (permission) =>
          matchesText(permission, overridePermissionSearch) ||
          matchesText(formatPermissionLabel(permission), overridePermissionSearch)
      )
    })
  }, [assignments, onlyWithOverrides, overridePermissionSearch, overrideSearch])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Role Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage roles, assignments, and user-specific permission overrides at scale.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="overrides">User Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Create role</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use lowercase keys like <code>editor</code> or <code>report_manager</code>.
                </p>
              </div>
              <Badge variant="outline">{roleOptions.length} total roles</Badge>
            </div>

            <form action={createAppRoleAction} className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor="create-role-key" className="text-xs font-medium text-muted-foreground">
                    Role key
                  </label>
                  <Input
                    id="create-role-key"
                    name="roleKey"
                    required
                    value={createRoleKey}
                    onChange={(event) => setCreateRoleKey(event.target.value)}
                    className="mt-1"
                    placeholder="editor"
                  />
                </div>
                <div>
                  <label htmlFor="create-display-name" className="text-xs font-medium text-muted-foreground">
                    Display name
                  </label>
                  <Input
                    id="create-display-name"
                    name="displayName"
                    required
                    value={createDisplayName}
                    onChange={(event) => setCreateDisplayName(event.target.value)}
                    className="mt-1"
                    placeholder="Editor"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground">Default permissions</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {visiblePermissionOptions.map((permission) => {
                    const checked = createPermissions.includes(permission)
                    return (
                      <label
                        key={`create-${permission}`}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => setCreatePermissions((prev) => togglePermission(prev, permission))}
                        />
                        <span>{formatPermissionLabel(permission)}</span>
                      </label>
                    )
                  })}
                </div>
                {visiblePermissionOptions.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">No permissions match the current filter.</p>
                )}
                {createPermissions.map((permission) => (
                  <input
                    key={`create-hidden-${permission}`}
                    type="hidden"
                    name="defaultPermissions"
                    value={permission}
                  />
                ))}
              </div>

              <FormSubmitButton pendingText="Saving role...">Create / Update Role</FormSubmitButton>
            </form>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Role defaults</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Admin always has all permissions. Use filters for large role/permission sets.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRoleAccordionOpen(filteredRoles.map((role) => role.roleKey))}
                >
                  Expand All
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setRoleAccordionOpen([])}>
                  Collapse All
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="role-search" className="text-xs font-medium text-muted-foreground">
                  Search roles
                </label>
                <Input
                  id="role-search"
                  value={roleSearch}
                  onChange={(event) => setRoleSearch(event.target.value)}
                  placeholder="Filter by key or display name"
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="role-permission-search" className="text-xs font-medium text-muted-foreground">
                  Search permissions
                </label>
                <Input
                  id="role-permission-search"
                  value={rolePermissionSearch}
                  onChange={(event) => setRolePermissionSearch(event.target.value)}
                  placeholder="Filter by permission"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Showing {filteredRoles.length} of {roleOptions.length} roles</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  setRoleSearch("")
                  setRolePermissionSearch("")
                }}
              >
                Clear Filters
              </Button>
            </div>

            {filteredRoles.length === 0 ? (
              <div className="mt-4 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
                No roles match the current filters.
              </div>
            ) : (
              <Accordion
                type="multiple"
                value={roleAccordionOpen}
                onValueChange={setRoleAccordionOpen}
                className="mt-4 rounded-lg border border-border bg-background px-4"
              >
                {filteredRoles.map((role) => {
                  const isAdminRole = role.roleKey === ADMIN_ROLE_KEY
                  const selectedPermissions = isAdminRole
                    ? permissionOptions
                    : rolePermissionsByKey[role.roleKey] ?? []
                  const displayName = roleDisplayByKey[role.roleKey] ?? role.displayName

                  return (
                    <AccordionItem key={`role-default-${role.roleKey}`} value={role.roleKey}>
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{displayName}</span>
                          <Badge variant="outline" className="text-[11px]">
                            {role.roleKey}
                          </Badge>
                          <Badge variant="secondary" className="text-[11px]">
                            {selectedPermissions.length} permissions
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <form action={updateAppRoleAction} className="space-y-3 pb-1">
                          <input type="hidden" name="roleKey" value={role.roleKey} />
                          {selectedPermissions.map((permission) => (
                            <input
                              key={`role-hidden-${role.roleKey}-${permission}`}
                              type="hidden"
                              name="defaultPermissions"
                              value={permission}
                            />
                          ))}

                          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                            <div>
                              <label
                                htmlFor={`display-name-${role.roleKey}`}
                                className="text-xs font-medium text-muted-foreground"
                              >
                                Display name
                              </label>
                              <Input
                                id={`display-name-${role.roleKey}`}
                                name="displayName"
                                required
                                value={displayName}
                                onChange={(event) =>
                                  setRoleDisplayByKey((prev) => ({
                                    ...prev,
                                    [role.roleKey]: event.target.value,
                                  }))
                                }
                                className="mt-1"
                              />
                            </div>
                            <FormSubmitButton variant="outline" pendingText="Saving role...">
                              Save Role
                            </FormSubmitButton>
                          </div>

                          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                            {visiblePermissionOptions.map((permission) => {
                              const checked = selectedPermissions.includes(permission)
                              return (
                                <label
                                  key={`role-${role.roleKey}-${permission}`}
                                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-xs"
                                >
                                  <Checkbox
                                    checked={checked}
                                    disabled={isAdminRole}
                                    onCheckedChange={() =>
                                      setRolePermissionsByKey((prev) => ({
                                        ...prev,
                                        [role.roleKey]: togglePermission(prev[role.roleKey] ?? [], permission),
                                      }))
                                    }
                                  />
                                  <span>{formatPermissionLabel(permission)}</span>
                                </label>
                              )
                            })}
                          </div>
                          {visiblePermissionOptions.length === 0 && (
                            <p className="text-xs text-muted-foreground">No permissions match the current filter.</p>
                          )}
                          {isAdminRole && (
                            <p className="text-xs text-muted-foreground">
                              Admin permission set is locked to full access.
                            </p>
                          )}
                        </form>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </section>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground">Add or update user role</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Assign any role to a user. New users are created automatically from email.
            </p>
            <form action={upsertAppUserRoleAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
              <div>
                <label htmlFor="role-email" className="text-xs font-medium text-muted-foreground">
                  Email
                </label>
                <Input id="role-email" name="email" type="email" required className="mt-1" placeholder="user@area36.org" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <input type="hidden" name="roleKey" value={newAssignmentRoleKey} />
                <Select value={newAssignmentRoleKey} onValueChange={setNewAssignmentRoleKey}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={`new-assignment-${role.roleKey}`} value={role.roleKey}>
                        {role.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:self-end">
                <FormSubmitButton pendingText="Saving..." disabled={!newAssignmentRoleKey}>
                  Add / Update
                </FormSubmitButton>
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Current assignments</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Filter and expand only the users you need to edit.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignmentAccordionOpen(filteredAssignments.map((assignment) => assignment.userId))}
                >
                  Expand All
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAssignmentAccordionOpen([])}>
                  Collapse All
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
              <div>
                <label htmlFor="assignment-search" className="text-xs font-medium text-muted-foreground">
                  Search users
                </label>
                <Input
                  id="assignment-search"
                  value={assignmentSearch}
                  onChange={(event) => setAssignmentSearch(event.target.value)}
                  className="mt-1"
                  placeholder="Filter by email or user id"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Role filter</label>
                <Select value={assignmentRoleFilter} onValueChange={setAssignmentRoleFilter}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FILTER_VALUE}>All roles</SelectItem>
                    {roleOptions.map((role) => (
                      <SelectItem key={`assignment-filter-${role.roleKey}`} value={role.roleKey}>
                        {role.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Showing {filteredAssignments.length} of {assignments.length} users</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  setAssignmentSearch("")
                  setAssignmentRoleFilter(ALL_FILTER_VALUE)
                }}
              >
                Clear Filters
              </Button>
            </div>

            {filteredAssignments.length === 0 ? (
              <div className="mt-4 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
                No user assignments match the current filters.
              </div>
            ) : (
              <Accordion
                type="multiple"
                value={assignmentAccordionOpen}
                onValueChange={setAssignmentAccordionOpen}
                className="mt-4 rounded-lg border border-border bg-background px-4"
              >
                {filteredAssignments.map((assignment) => {
                  const roleValue = editRoleByUser[assignment.userId] ?? assignment.roleKey
                  const roleLabel =
                    roleOptions.find((role) => role.roleKey === roleValue)?.displayName ?? roleValue
                  const isProtectedAreaAdmin = normalizeEmail(assignment.email) === PROTECTED_AREA_ADMIN_EMAIL

                  return (
                    <AccordionItem key={`assignment-${assignment.userId}`} value={assignment.userId}>
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{assignment.email}</span>
                          <Badge variant="outline" className="text-[11px]">
                            {roleLabel}
                          </Badge>
                          {isProtectedAreaAdmin && (
                            <Badge variant="secondary" className="text-[11px]">
                              Protected Area Admin
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[11px]">
                            {assignment.additionalPermissions.length} overrides
                          </Badge>
                          <span className="text-xs text-muted-foreground">Updated: {assignment.updatedAt}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <form action={updateAppUserRoleAction} className="flex flex-wrap items-center gap-2">
                            <input type="hidden" name="userId" value={assignment.userId} />
                            <input type="hidden" name="roleKey" value={roleValue} />
                            <div className="min-w-52">
                              <Select
                                value={roleValue}
                                onValueChange={(value) =>
                                  setEditRoleByUser((prev) => ({
                                    ...prev,
                                    [assignment.userId]: value,
                                  }))
                                }
                                disabled={isProtectedAreaAdmin}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roleOptions.map((role) => (
                                    <SelectItem
                                      key={`assignment-${assignment.userId}-${role.roleKey}`}
                                      value={role.roleKey}
                                    >
                                      {role.displayName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <FormSubmitButton
                              variant="outline"
                              pendingText="Saving..."
                              disabled={isProtectedAreaAdmin}
                            >
                              Save Role
                            </FormSubmitButton>
                          </form>

                          {isProtectedAreaAdmin ? (
                            <span className="text-xs text-muted-foreground">Protected</span>
                          ) : (
                            <form action={removeAppUserAccessAction}>
                              <input type="hidden" name="userId" value={assignment.userId} />
                              <FormSubmitButton variant="ghost" pendingText="Removing...">
                                Remove Access
                              </FormSubmitButton>
                            </form>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </section>
        </TabsContent>

        <TabsContent value="overrides" className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">User-specific permission overrides</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add or remove per-user permissions without changing role defaults.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOverrideAccordionOpen(filteredOverrideAssignments.map((assignment) => assignment.userId))
                  }
                >
                  Expand All
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setOverrideAccordionOpen([])}>
                  Collapse All
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="override-search" className="text-xs font-medium text-muted-foreground">
                  Search users
                </label>
                <Input
                  id="override-search"
                  value={overrideSearch}
                  onChange={(event) => setOverrideSearch(event.target.value)}
                  className="mt-1"
                  placeholder="Filter by email or user id"
                />
              </div>
              <div>
                <label htmlFor="override-permission-search" className="text-xs font-medium text-muted-foreground">
                  Search permissions
                </label>
                <Input
                  id="override-permission-search"
                  value={overridePermissionSearch}
                  onChange={(event) => setOverridePermissionSearch(event.target.value)}
                  className="mt-1"
                  placeholder="Filter by override permission"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={onlyWithOverrides} onCheckedChange={(checked) => setOnlyWithOverrides(!!checked)} />
                Show only users with overrides
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  setOverrideSearch("")
                  setOverridePermissionSearch("")
                  setOnlyWithOverrides(true)
                }}
              >
                Reset Filters
              </Button>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              Showing {filteredOverrideAssignments.length} of {assignments.length} users
            </div>

            {filteredOverrideAssignments.length === 0 ? (
              <div className="mt-4 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
                No users match the current override filters.
              </div>
            ) : (
              <Accordion
                type="multiple"
                value={overrideAccordionOpen}
                onValueChange={setOverrideAccordionOpen}
                className="mt-4 rounded-lg border border-border bg-background px-4"
              >
                {filteredOverrideAssignments.map((assignment) => {
                  const selectedPermission = permissionByUser[assignment.userId] ?? ""
                  const availablePermissions = permissionOptions.filter(
                    (permission) => !assignment.additionalPermissions.includes(permission)
                  )
                  const roleLabel =
                    roleOptions.find((role) => role.roleKey === assignment.roleKey)?.displayName ?? assignment.roleKey

                  return (
                    <AccordionItem key={`override-${assignment.userId}`} value={assignment.userId}>
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{assignment.email}</span>
                          <Badge variant="outline" className="text-[11px]">
                            {roleLabel}
                          </Badge>
                          <Badge variant="secondary" className="text-[11px]">
                            {assignment.additionalPermissions.length} overrides
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Current overrides
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {assignment.additionalPermissions.length === 0 && (
                              <span className="text-xs text-muted-foreground">No user-specific permissions.</span>
                            )}

                            {assignment.additionalPermissions.map((permission) => (
                              <form action={removeAppUserPermissionAction} key={`${assignment.userId}-${permission}`}>
                                <input type="hidden" name="userId" value={assignment.userId} />
                                <input type="hidden" name="permission" value={permission} />
                                <Button type="submit" variant="secondary" size="sm" className="h-7 gap-2 pr-2">
                                  <Badge
                                    variant="outline"
                                    className="h-5 border-transparent bg-transparent px-0 text-xs"
                                  >
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
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  )
}
