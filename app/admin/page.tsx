import Link from "next/link"
import { redirect } from "next/navigation"
import { eq, sql } from "drizzle-orm"
import { Check, Shield } from "lucide-react"
import { getSession, signOut } from "@/lib/auth"
import { AdminNav } from "@/components/admin-nav"
import { getLocalViewAsProfileForSession } from "@/lib/auth/local-view-as"
import { getDb, schema } from "@/lib/db"
import { getEffectivePermissions, isEffectivelyAreaAdmin } from "@/lib/auth/rbac"
import type { AppPermission } from "@/lib/auth/permissions"
import { AdminMain } from "@/components/admin-main"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Home | Area 36",
}

export const dynamic = "force-dynamic"

function formatRoleKey(roleKey: string): string {
  return roleKey
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function hasAny(permissions: Set<AppPermission>, values: AppPermission[]): boolean {
  return values.some((value) => permissions.has(value))
}

function buildFeatureAccessRows(permissions: Set<AppPermission>) {
  return [
    { feature: "Events", read: permissions.has("events:read"), write: permissions.has("events:write") },
    { feature: "Recordings", read: permissions.has("recordings:read"), write: permissions.has("recordings:write") },
    { feature: "Files", read: permissions.has("files:read"), write: permissions.has("files:write") },
    { feature: "Content", read: permissions.has("content:read"), write: permissions.has("content:write") },
    {
      feature: "Subscription Drives",
      read: permissions.has("subscription-drives:read"),
      write: permissions.has("subscription-drives:write"),
    },
    { feature: "Reports", read: permissions.has("reports:read"), write: false },
    { feature: "District Sites", read: permissions.has("district-sites:read"), write: permissions.has("district-sites:write") },
    { feature: "Quorum", read: permissions.has("quorum:view"), write: permissions.has("quorum:edit") },
    {
      feature: "Corrections",
      read: permissions.has("corrections:view"),
      write: hasAny(permissions, ["corrections:edit", "corrections:match", "corrections:delete"]),
    },
    { feature: "Role Management", read: permissions.has("access:read"), write: permissions.has("access:write") },
  ]
}

function AccessIndicator({
  allowed,
  label,
}: {
  allowed: boolean
  label: string
}) {
  return allowed ? (
    <>
      <Check className="mx-auto h-4 w-4 text-primary" aria-hidden="true" />
      <span className="sr-only">{label}: yes</span>
    </>
  ) : (
    <>
      <span className="mx-auto inline-block h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{label}: no</span>
    </>
  )
}

function getSimulatedAppRoleName(viewAsKey: string): string {
  if (viewAsKey === "area-admin") return "Admin (View as)"
  if (viewAsKey === "chair") return "Chair (View as)"
  if (viewAsKey === "officer") return "Officer (View as)"
  return "None (View as)"
}

export default async function AdminHomePage() {
  const session = await getSession()
  if (!session?.user?.email) {
    redirect("/admin/login?callbackUrl=/admin")
  }

  const db = await getDb()
  const userId = session.user.id
  const [areaAdmin, permissions, assignment, pendingEventsCount, localViewAs] = await Promise.all([
    isEffectivelyAreaAdmin(session),
    getEffectivePermissions(session),
    userId
      ? db
          .select({
            roleKey: schema.appUserAccess.roleKey,
            displayName: schema.appRoles.displayName,
          })
          .from(schema.appUserAccess)
          .leftJoin(schema.appRoles, eq(schema.appRoles.roleKey, schema.appUserAccess.roleKey))
          .where(eq(schema.appUserAccess.userId, userId))
          .get()
      : Promise.resolve(undefined),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.events)
      .where(eq(schema.events.status, "pending"))
      .then(([result]) => result?.count ?? 0),
    getLocalViewAsProfileForSession(session),
  ])

  const districtAdminFor = Array.from(new Set(session.user.districtAdminFor)).sort((a, b) => a - b)
  const displayDistrictAdminFor = localViewAs && localViewAs.key !== "area-admin" ? [] : districtAdminFor
  const featureAccessRows = buildFeatureAccessRows(permissions)
  const assignedAppRoleName = assignment?.displayName?.trim() || (assignment?.roleKey ? formatRoleKey(assignment.roleKey) : null)
  const appRoleName = localViewAs ? getSimulatedAppRoleName(localViewAs.key) : assignedAppRoleName

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="flex items-center gap-2 font-semibold">
                <Shield className="h-5 w-5 text-primary" />
                <span>Area 36 Admin</span>
              </Link>
            </div>
            <AdminNav
              userEmail={session.user.email ?? ""}
              pendingEventsCount={pendingEventsCount}
              permissions={[...permissions]}
              initialLocalViewAs={localViewAs?.key ?? null}
              showLocalViewAs={!!localViewAs}
              signOutAction={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}
            />
          </div>
        </div>
      </header>

      <AdminMain className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <section className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-2xl font-semibold text-foreground">Admin Home</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page shows your account access and permissions.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground">Signed In As</h2>
          <p className="mt-2 text-sm text-foreground">{session.user.email}</p>
          {session.user.name ? <p className="text-sm text-muted-foreground">{session.user.name}</p> : null}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground">Roles</h2>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              <span className="font-medium text-foreground">Area Admin:</span>{" "}
              <span className="text-muted-foreground">{areaAdmin ? "Yes" : "No"}</span>
            </p>
            <p>
              <span className="font-medium text-foreground">App Role:</span>{" "}
              <span className="text-muted-foreground">{appRoleName ?? "None assigned"}</span>
            </p>
            <p>
              <span className="font-medium text-foreground">District Admin:</span>{" "}
              <span className="text-muted-foreground">
                {displayDistrictAdminFor.length > 0
                  ? displayDistrictAdminFor.map((districtNumber) => `District ${districtNumber}`).join(", ")
                  : "None assigned"}
              </span>
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground">Permissions</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left font-medium text-foreground">Feature</th>
                  <th className="py-2 text-center font-medium text-foreground">Read</th>
                  <th className="py-2 text-center font-medium text-foreground">Write</th>
                </tr>
              </thead>
              <tbody>
                {featureAccessRows.map((row) => (
                  <tr key={row.feature} className="border-b border-border/60 last:border-b-0">
                    <td className="py-2.5 text-foreground">{row.feature}</td>
                    <td className="py-2.5 text-center">
                      <AccessIndicator allowed={row.read} label={`${row.feature} read`} />
                    </td>
                    <td className="py-2.5 text-center">
                      <AccessIndicator allowed={row.write} label={`${row.feature} write`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </AdminMain>
    </div>
  )
}
