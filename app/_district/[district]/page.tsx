import Link from "next/link"
import { notFound } from "next/navigation"
import { getDistrictPublicEvents, getDistrictContacts, getDistrictPositions, getDistrictPublishedUpdates, getDistrictSiteConfig } from "@/lib/district/queries"

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export const dynamic = "force-dynamic"

export default async function DistrictHomePage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const site = await getDistrictSiteConfig(districtNumber)
  if (!site || !site.enabled || site.mode !== "hosted") notFound()

  const [events, contacts, positions, updates] = await Promise.all([
    getDistrictPublicEvents(districtNumber),
    getDistrictContacts(districtNumber),
    getDistrictPositions(districtNumber),
    getDistrictPublishedUpdates(districtNumber),
  ])

  const nextEvents = events.slice(0, 5)
  const openPositions = positions.filter((p) => p.status === "open").slice(0, 5)
  const officers = contacts.filter((c) => c.active && c.category === "officer").slice(0, 5)
  const latestUpdates = updates.slice(0, 3)

  const title = site.displayName?.trim() || `District ${districtNumber}`

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-8">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          District calendar, trusted servant contacts, open service positions, and committee updates.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="h-9 inline-flex items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" href="/calendar">
            View calendar
          </Link>
          <Link className="h-9 inline-flex items-center rounded-md border border-border bg-background px-4 text-sm" href="/contacts">
            Contacts
          </Link>
          <Link className="h-9 inline-flex items-center rounded-md border border-border bg-background px-4 text-sm" href="/updates">
            Updates
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">Upcoming events</h3>
            <Link href="/calendar" className="text-xs text-primary hover:underline">
              All
            </Link>
          </div>
          {nextEvents.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No events posted yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {nextEvents.map((e) => (
                <li key={e.id} className="text-sm">
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{e.date}{e.startTime ? ` • ${e.startTime}` : ""}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">Contacts</h3>
            <Link href="/contacts" className="text-xs text-primary hover:underline">
              All
            </Link>
          </div>
          {officers.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No contacts listed yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {officers.map((c) => (
                <li key={c.id} className="text-sm">
                  <div className="font-medium">{c.role}{c.name ? `: ${c.name}` : ""}</div>
                  {c.email && (
                    <div className="text-xs text-muted-foreground">
                      <a className="hover:underline" href={`mailto:${c.email}`}>{c.email}</a>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">Open positions</h3>
            <Link href="/positions" className="text-xs text-primary hover:underline">
              All
            </Link>
          </div>
          {openPositions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No open positions listed.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {openPositions.map((p) => (
                <li key={p.id} className="text-sm">
                  <div className="font-medium">{p.title}</div>
                  {p.notes && <div className="text-xs text-muted-foreground line-clamp-2">{p.notes}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Latest updates</h3>
          <Link href="/updates" className="text-xs text-primary hover:underline">
            All
          </Link>
        </div>
        {latestUpdates.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No updates published yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {latestUpdates.map((u) => (
              <article key={u.id} className="rounded-lg border border-border bg-background p-4">
                <h4 className="text-sm font-semibold">{u.title}</h4>
                {u.committee && <p className="mt-1 text-xs text-muted-foreground">{u.committee}</p>}
                <p className="mt-2 text-sm text-muted-foreground line-clamp-4 whitespace-pre-line">{u.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

