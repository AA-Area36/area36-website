import type { Metadata } from "next"
import { Mail, Phone, UsersRound } from "lucide-react"
import { notFound } from "next/navigation"
import { getDistrictContacts } from "@/lib/district/queries"
import { coerceDistrict, resolveDistrictSiteForRender } from "../district-utils"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Contacts",
  description: "District trusted servants and committee chairs.",
}

export default async function DistrictContactsPage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const site = await resolveDistrictSiteForRender(districtNumber)
  if (!site) notFound()

  const contacts = (await getDistrictContacts(districtNumber)).filter((contact) => contact.active)
  const chairs = contacts.filter((contact) => contact.category === "chair")
  const officers = contacts.filter((contact) => contact.category === "officer")
  const others = contacts.filter((contact) => contact.category === "other")

  const { title } = site

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-surface-accent p-6 shadow-sm lg:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/[0.03]" />
        <div className="absolute right-0 top-0 h-12 w-12 bg-gradient-to-bl from-primary/5 to-transparent" />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Directory</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight [font-family:var(--font-district-display)]">
            {title} Chairs & Contacts
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Contact information for district trusted servants and committee chairs.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <UsersRound className="h-3.5 w-3.5 text-primary" />
            {contacts.length} active contact{contacts.length !== 1 ? "s" : ""}
          </div>
        </div>
      </section>

      {/* Contact Sections */}
      <ContactSection
        heading="Active Chairpersons"
        description="Committee chairs serving the district"
        items={chairs}
        emptyMessage="No active chair contacts listed."
      />
      <ContactSection
        heading="DCM & Officers"
        description="District officers and leadership"
        items={officers}
        emptyMessage="No officer contacts listed."
      />
      {others.length > 0 && (
        <ContactSection
          heading="Other Contacts"
          description="Additional district contacts"
          items={others}
          emptyMessage="No additional contacts listed."
        />
      )}
    </div>
  )
}

// Contact type for type safety
type Contact = {
  id: string
  role: string
  name: string | null
  email: string | null
  phone: string | null
}

function ContactSection({
  heading,
  description,
  items,
  emptyMessage,
}: {
  heading: string
  description: string
  items: Contact[]
  emptyMessage: string
}) {
  return (
    <section className="rounded-xl border border-border/50 bg-card shadow-sm">
      <div className="border-b border-border/50 px-5 py-4">
        <h2 className="text-lg font-semibold [font-family:var(--font-district-display)]">{heading}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>

      {items.length === 0 ? (
        <div className="p-5">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((contact, index) => (
            <li
              key={contact.id}
              className="group rounded-xl border border-border/50 bg-background p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-start gap-3">
                {/* Avatar with initials */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-semibold text-primary transition-transform duration-200 group-hover:scale-105">
                  {contact.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{contact.role}</p>
                  {contact.name && (
                    <p className="text-sm text-muted-foreground">{contact.name}</p>
                  )}
                </div>
              </div>

              {/* Contact actions */}
              {(contact.email || contact.phone) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      <Mail className="h-3 w-3" />
                      Email
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone.replace(/\D/g, "")}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
                    >
                      <Phone className="h-3 w-3" />
                      {contact.phone}
                    </a>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
