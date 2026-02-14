import { ExternalLink, FileText } from "lucide-react"
import { notFound } from "next/navigation"
import { getDistrictPublishedUpdates } from "@/lib/district/queries"
import { coerceDistrict, formatDistrictPublished, getAgendaDocumentLink, resolveDistrictSiteForRender } from "../district-utils"

export const dynamic = "force-dynamic"

export default async function DistrictUpdatesPage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const site = await resolveDistrictSiteForRender(districtNumber)
  if (!site) notFound()

  const updates = await getDistrictPublishedUpdates(districtNumber)
  const { title } = site

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 lg:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Committee Communications</p>
        <h1 className="mt-2 text-3xl font-semibold [font-family:var(--font-district-display)]">{title} Agenda Notes</h1>
        <p className="mt-2 text-sm text-muted-foreground">Published notes are linked as external documents.</p>
      </section>

      {updates.length === 0 ? (
        <section className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">No agenda notes published yet.</p>
        </section>
      ) : (
        <section className="space-y-3">
          {updates.map((update) => {
            const documentLink = getAgendaDocumentLink(update.body)
            return (
              <article key={update.id} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-semibold [font-family:var(--font-district-display)]">{update.title}</h2>
                    {update.committee && <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{update.committee}</p>}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDistrictPublished(update.publishedAt)}</p>
                </div>

                <div className="mt-4">
                  {documentLink ? (
                    <a
                      href={documentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-primary hover:bg-muted"
                    >
                      <FileText className="h-4 w-4" />
                      Open agenda document
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">Document link not provided.</p>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
