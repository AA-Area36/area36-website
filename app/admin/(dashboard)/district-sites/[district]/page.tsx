import Link from "next/link"
import { notFound } from "next/navigation"
import { getDb, schema } from "@/lib/db"
import { eq, asc } from "drizzle-orm"
import { upsertDistrictSite, addDistrictAdmin, removeDistrictAdmin } from "../actions"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"
const PROTECTED_SITE_ADMIN_EMAIL = "webmaster@area36.org"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ district: string }>
}): Promise<Metadata> {
  const { district } = await params
  return { title: `District ${district} Site` }
}

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export default async function DistrictSiteDetailPage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const db = await getDb()
  const site = await db
    .select({
      districtNumber: schema.districtSites.districtNumber,
      subdomain: schema.districtSites.subdomain,
      displayName: schema.districtSites.displayName,
      enabled: schema.districtSites.enabled,
      mode: schema.districtSites.mode,
      redirectUrl: schema.districtSites.redirectUrl,
      updatedAt: schema.districtSites.updatedAt,
    })
    .from(schema.districtSites)
    .where(eq(schema.districtSites.districtNumber, districtNumber))
    .get()

  const admins = await db
    .select()
    .from(schema.districtAdmins)
    .where(eq(schema.districtAdmins.districtNumber, districtNumber))
    .orderBy(asc(schema.districtAdmins.email))
    .all()

  const enabled = site?.enabled ?? false
  const mode = site?.mode ?? "hosted"
  const displayName = site?.displayName ?? `District ${districtNumber}`
  const redirectUrl = site?.redirectUrl ?? ""

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">District {districtNumber} Site</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Subdomain: <span className="font-mono">d{districtNumber}.area36.org</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/district-sites" className="text-sm text-muted-foreground hover:text-foreground">
            Back
          </Link>
          <Link href={`https://d${districtNumber}.area36.org`} className="text-sm text-primary hover:underline" target="_blank">
            Open Site
          </Link>
          {mode === "hosted" && enabled && (
            <Link href={`https://d${districtNumber}.area36.org/admin`} className="text-sm text-primary hover:underline" target="_blank">
              Open Admin
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Configuration</h2>
        <form action={upsertDistrictSite} className="mt-4 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="districtNumber" value={districtNumber} />

          <label className="flex items-center gap-3">
            <input name="enabled" type="checkbox" defaultChecked={enabled} className="h-4 w-4" />
            <span className="text-sm">Enabled</span>
          </label>

          <div>
            <label htmlFor="district-site-mode" className="block text-xs font-medium text-muted-foreground">Mode</label>
            <select
              id="district-site-mode"
              name="mode"
              defaultValue={mode}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="hosted">Hosted</option>
              <option value="external_redirect">External Redirect (everything)</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              External Redirect means <span className="font-mono">d{districtNumber}.area36.org/*</span> redirects out and nothing is managed here.
            </p>
          </div>

          <div>
            <label htmlFor="district-site-display-name" className="block text-xs font-medium text-muted-foreground">Display name</label>
            <input
              id="district-site-display-name"
              name="displayName"
              defaultValue={displayName}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              placeholder={`District ${districtNumber}`}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="district-site-redirect-url" className="block text-xs font-medium text-muted-foreground">Redirect URL (https://...)</label>
            <input
              id="district-site-redirect-url"
              name="redirectUrl"
              defaultValue={redirectUrl}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              placeholder="https://example.org"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Only required for External Redirect. Incoming path + query are preserved.
            </p>
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
              Save
            </button>
            {site && (
              <span className="text-xs text-muted-foreground">
                Updated: {site.updatedAt}
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">District Admins</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Only applies to Hosted mode. External Redirect districts are fully managed outside this system.
        </p>

        {mode !== "hosted" ? (
          <p className="mt-4 text-sm text-muted-foreground">District admins are disabled for External Redirect mode.</p>
        ) : (
          <>
            <form action={addDistrictAdmin} className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
              <input type="hidden" name="districtNumber" value={districtNumber} />
              <div className="flex-1">
                <label className="block text-xs font-medium text-muted-foreground">Email</label>
                <input
                  name="email"
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  placeholder="user@someworkspace.org"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground">Role</label>
                <select name="role" defaultValue="editor" className="mt-1 h-9 rounded-md border border-border bg-background px-3 text-sm">
                  <option value="editor">Editor</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                Add / Update
              </button>
            </form>

            <div className="mt-4 rounded-lg border border-border overflow-hidden">
              {admins.length === 0 ? (
                <div className="px-4 py-4 text-sm text-muted-foreground">No district admins configured.</div>
              ) : (
                admins.map((a) => (
                  <div key={a.email} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border last:border-b-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{a.email}</div>
                      <div className="text-xs text-muted-foreground capitalize">{a.role}</div>
                    </div>
                    {a.email.trim().toLowerCase() === PROTECTED_SITE_ADMIN_EMAIL ? (
                      <span className="text-xs text-muted-foreground">Protected</span>
                    ) : (
                      <form action={removeDistrictAdmin}>
                        <input type="hidden" name="districtNumber" value={districtNumber} />
                        <input type="hidden" name="email" value={a.email} />
                        <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
                          Remove
                        </button>
                      </form>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
