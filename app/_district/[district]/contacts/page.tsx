import { notFound } from "next/navigation"
import { getDistrictContacts, getDistrictSiteConfig } from "@/lib/district/queries"

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export const dynamic = "force-dynamic"

export default async function DistrictContactsPage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const site = await getDistrictSiteConfig(districtNumber)
  if (!site || !site.enabled || site.mode !== "hosted") notFound()

  const contacts = (await getDistrictContacts(districtNumber)).filter((c) => c.active)
  const officers = contacts.filter((c) => c.category === "officer")
  const chairs = contacts.filter((c) => c.category === "chair")
  const others = contacts.filter((c) => c.category === "other")

  const title = site.displayName?.trim() || `District ${districtNumber}`

  function ContactList({ items }: { items: typeof contacts }) {
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground">None listed.</p>
    }
    return (
      <ul className="mt-3 space-y-3">
        {items.map((c) => (
          <li key={c.id} className="rounded-lg border border-border bg-background p-4">
            <div className="text-sm font-semibold">{c.role}</div>
            {c.name && <div className="text-sm text-muted-foreground">{c.name}</div>}
            <div className="mt-2 flex flex-col gap-1 text-sm">
              {c.email && (
                <a className="text-primary hover:underline" href={`mailto:${c.email}`}>
                  {c.email}
                </a>
              )}
              {c.phone && <span className="text-muted-foreground">{c.phone}</span>}
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title} Contacts</h2>
        <p className="mt-1 text-sm text-muted-foreground">DCM, officers, chairpersons, and district contacts.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold">DCM & Officers</h3>
        <ContactList items={officers} />
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold">Active Chairpersons</h3>
        <ContactList items={chairs} />
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold">Other Contacts</h3>
        <ContactList items={others} />
      </section>
    </div>
  )
}

