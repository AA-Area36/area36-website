import { notFound } from "next/navigation"
import { getDistrictPositions, getDistrictSiteConfig } from "@/lib/district/queries"

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export const dynamic = "force-dynamic"

export default async function DistrictPositionsPage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const site = await getDistrictSiteConfig(districtNumber)
  if (!site || !site.enabled || site.mode !== "hosted") notFound()

  const positions = await getDistrictPositions(districtNumber)
  const open = positions.filter((p) => p.status === "open")
  const filled = positions.filter((p) => p.status === "filled")

  const title = site.displayName?.trim() || `District ${districtNumber}`

  function PositionList({ items }: { items: typeof positions }) {
    if (items.length === 0) return <p className="text-sm text-muted-foreground">None listed.</p>
    return (
      <ul className="mt-3 space-y-3">
        {items.map((p) => (
          <li key={p.id} className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-sm font-semibold">{p.title}</div>
              <div className="text-xs text-muted-foreground uppercase">{p.status}</div>
            </div>
            {p.notes && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{p.notes}</p>}
            {(p.contactName || p.contactEmail) && (
              <p className="mt-3 text-sm">
                Contact:{" "}
                <span className="text-muted-foreground">
                  {p.contactName ?? "—"}{" "}
                  {p.contactEmail ? (
                    <>
                      (
                      <a className="text-primary hover:underline" href={`mailto:${p.contactEmail}`}>
                        {p.contactEmail}
                      </a>
                      )
                    </>
                  ) : null}
                </span>
              </p>
            )}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title} Positions</h2>
        <p className="mt-1 text-sm text-muted-foreground">Service opportunities and district roles.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold">Open Positions</h3>
        <PositionList items={open} />
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold">Filled Positions</h3>
        <PositionList items={filled} />
      </section>
    </div>
  )
}

