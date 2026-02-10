import { notFound } from "next/navigation"
import { getDistrictPublishedUpdates, getDistrictSiteConfig } from "@/lib/district/queries"

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export const dynamic = "force-dynamic"

export default async function DistrictUpdatesPage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const site = await getDistrictSiteConfig(districtNumber)
  if (!site || !site.enabled || site.mode !== "hosted") notFound()

  const updates = await getDistrictPublishedUpdates(districtNumber)
  const title = site.displayName?.trim() || `District ${districtNumber}`

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title} Updates</h2>
        <p className="mt-1 text-sm text-muted-foreground">Committee activity and district news.</p>
      </div>

      {updates.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
          No updates published yet.
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((u) => (
            <article key={u.id} className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="text-lg font-semibold">{u.title}</h3>
                <div className="text-xs text-muted-foreground">{u.publishedAt ?? ""}</div>
              </div>
              {u.committee && <p className="mt-1 text-sm text-muted-foreground">{u.committee}</p>}
              <div className="mt-4 whitespace-pre-line text-sm">{u.body}</div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

