import type { Metadata } from "next"
import { BriefcaseBusiness, CheckCircle2, CircleDot, Mail, User } from "lucide-react"
import { notFound } from "next/navigation"
import { getDistrictPositions } from "@/lib/district/queries"
import { coerceDistrict, resolveDistrictSiteForRender } from "../district-utils"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Service Positions",
  description: "Open and filled district service roles.",
}

export default async function DistrictPositionsPage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const site = await resolveDistrictSiteForRender(districtNumber)
  if (!site) notFound()

  const positions = await getDistrictPositions(districtNumber)
  const open = positions.filter((position) => position.status === "open")
  const filled = positions.filter((position) => position.status === "filled")

  const { title } = site

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-surface-accent p-6 shadow-sm lg:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/[0.03]" />
        <div className="absolute right-0 top-0 h-12 w-12 bg-gradient-to-bl from-primary/5 to-transparent" />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Service Opportunities</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight [font-family:var(--font-district-display)]">
            {title} Service Positions
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Open and filled district service roles. Get involved in district service.
          </p>
          
          {/* Stats badges */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
              <CircleDot className="h-3.5 w-3.5" />
              {open.length} open position{open.length !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {filled.length} filled
            </span>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="rounded-xl border border-border/50 bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15 text-success">
            <BriefcaseBusiness className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold [font-family:var(--font-district-display)]">Open Positions</h2>
            <p className="text-xs text-muted-foreground">Available service opportunities</p>
          </div>
        </div>

        {open.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={BriefcaseBusiness}
              title="All positions filled"
              description="There are no open service positions at this time. Check back later or contact the district for other ways to get involved."
            />
          </div>
        ) : (
          <ul className="grid gap-3 p-4 sm:grid-cols-2">
            {open.map((position, index) => (
              <li
                key={position.id}
                className="group relative overflow-hidden rounded-xl border border-success/30 bg-gradient-to-br from-success/5 to-card p-4 transition-all duration-200 hover:border-success/50 hover:shadow-md"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Open badge */}
                <div className="absolute right-3 top-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                    <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-success" />
                    Open
                  </span>
                </div>

                <h3 className="pr-16 font-semibold text-foreground">{position.title}</h3>

                {position.notes && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {position.notes}
                  </p>
                )}

                {(position.contactName || position.contactEmail) && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                    <span className="text-xs text-muted-foreground">Contact:</span>
                    {position.contactName && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                        <User className="h-3 w-3" />
                        {position.contactName}
                      </span>
                    )}
                    {position.contactEmail && (
                      <a
                        href={`mailto:${position.contactEmail}`}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        <Mail className="h-3 w-3" />
                        Email
                      </a>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Filled Positions */}
      <section className="rounded-xl border border-border/50 bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold [font-family:var(--font-district-display)]">Filled Positions</h2>
            <p className="text-xs text-muted-foreground">Currently serving trusted servants</p>
          </div>
        </div>

        {filled.length === 0 ? (
          <div className="p-5">
            <p className="text-sm text-muted-foreground">No filled positions listed.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {filled.map((position, index) => (
              <li
                key={position.id}
                className="group flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/30"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar placeholder */}
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {position.contactName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{position.title}</p>
                    {position.contactName && (
                      <p className="text-sm text-muted-foreground">{position.contactName}</p>
                    )}
                  </div>
                </div>

                {position.contactEmail && (
                  <a
                    href={`mailto:${position.contactEmail}`}
                    className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <Mail className="mr-1 inline-block h-3 w-3" />
                    Contact
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// Empty State Component
function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
