import Link from "next/link"
import { getDb, schema } from "@/lib/db"
import { desc } from "drizzle-orm"
import { districtNumbers } from "@/lib/constants/districts"

export const dynamic = "force-dynamic"

export default async function DistrictSitesPage() {
  const db = await getDb()
  const rows = await db
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
    .orderBy(desc(schema.districtSites.updatedAt))
    .all()
  const byNumber = new Map<number, (typeof rows)[number]>()
  for (const r of rows) byNumber.set(r.districtNumber, r)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">District Sites</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure each district subdomain (<span className="font-mono">d#.area36.org</span>) as hosted in this app or as an external redirect.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-5 gap-0 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
          <div>District</div>
          <div>Status</div>
          <div>Mode</div>
          <div>Redirect</div>
          <div className="text-right">Manage</div>
        </div>

        {districtNumbers.map((n) => {
          const row = byNumber.get(n)
          const enabled = row?.enabled ?? false
          const mode = row?.mode ?? "hosted"
          const redirect = row?.redirectUrl ?? ""
          return (
            <div key={n} className="grid grid-cols-5 gap-0 px-4 py-3 border-b border-border last:border-b-0 text-sm">
              <div className="font-medium">District {n}</div>
              <div>
                {enabled ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100">
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Disabled
                  </span>
                )}
              </div>
              <div className="capitalize">{mode.replace("_", " ")}</div>
              <div className="truncate text-muted-foreground">
                {mode === "external_redirect" ? redirect || "Missing" : "—"}
              </div>
              <div className="text-right">
                <Link href={`/admin/district-sites/${n}`} className="text-primary hover:underline">
                  Manage
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
