import { notFound } from "next/navigation"
import { getDistrictPublicEvents, getDistrictSiteConfig } from "@/lib/district/queries"

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export const dynamic = "force-dynamic"

export default async function DistrictCalendarPage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const site = await getDistrictSiteConfig(districtNumber)
  if (!site || !site.enabled || site.mode !== "hosted") notFound()

  const events = await getDistrictPublicEvents(districtNumber)
  const title = site.displayName?.trim() || `District ${districtNumber}`

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title} Calendar</h2>
        <p className="mt-1 text-sm text-muted-foreground">Upcoming district events and activities.</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {events.length === 0 ? (
          <div className="px-6 py-10 text-sm text-muted-foreground">No events posted yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((e) => (
              <li key={e.id} className="px-6 py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <div className="font-medium">{e.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {e.date}
                    {e.startTime ? ` • ${e.startTime}` : ""}
                    {e.endTime ? `–${e.endTime}` : ""}
                  </div>
                </div>
                {e.address && <p className="mt-1 text-sm text-muted-foreground">{e.address}</p>}
                {e.description && <p className="mt-2 text-sm whitespace-pre-line">{e.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

