import Link from "next/link"
import { CONTENT_SCHEMAS, type ContentDoc, type Scope, SUPPORTED_LOCALE_LABELS } from "@/lib/content/schema"
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/locales"
import { loadContentDocs } from "./actions"
import { ContentEditor } from "./content-editor"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function safeParse(value: string | null): ContentDoc | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as ContentDoc
    return null
  } catch {
    return null
  }
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}
  const scopeParam = typeof sp.scope === "string" ? sp.scope : undefined
  const scope: Scope = scopeParam && scopeParam in CONTENT_SCHEMAS ? (scopeParam as Scope) : "global"

  const rows = await loadContentDocs(scope)
  const byLocale = new Map<string, (typeof rows)[number]>()
  for (const r of rows) byLocale.set(r.locale, r)

  const defaultsEn = CONTENT_SCHEMAS[scope].defaultsEn

  const initialByLocale = Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => {
      const row = byLocale.get(locale)
      const draftDoc = safeParse(row?.draftJson ?? null)
      const publishedDoc = safeParse(row?.publishedJson ?? null)
      const doc = draftDoc ?? publishedDoc ?? (locale === "en" ? structuredClone(defaultsEn) : {})
      return [
        locale,
        {
          doc,
          publishedDoc,
          draftUpdatedAt: row?.draftUpdatedAt ?? null,
          publishedAt: row?.publishedAt ?? null,
          updatedBy: row?.updatedBy ?? null,
        },
      ]
    }),
  ) as Record<Locale, any>

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-3">
        <div>
          <h1 className="text-lg font-semibold">Content Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit and publish site copy per language. Public pages read published content from D1.
          </p>
        </div>

        <Card className="p-2">
          <nav className="grid gap-1">
            {Object.values(CONTENT_SCHEMAS).map((s) => (
              <Link
                key={s.scope}
                href={`/admin/content?scope=${encodeURIComponent(s.scope)}`}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  s.scope === scope ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{s.title}</span>
                  <span className="font-mono text-[11px] opacity-70">{s.scope}</span>
                </div>
                <div className="mt-1 text-xs opacity-80">{s.description}</div>
              </Link>
            ))}
          </nav>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supported locales</div>
          <div className="mt-3 grid gap-2">
            {(Object.keys(SUPPORTED_LOCALE_LABELS) as Locale[]).map((loc) => (
              <div key={loc} className="flex items-center justify-between text-sm">
                <span className="font-medium">{SUPPORTED_LOCALE_LABELS[loc].nativeName}</span>
                <span className="font-mono text-xs text-muted-foreground">{loc}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Locale selection priority: cookie, then <span className="font-mono">Accept-Language</span>. English is the default fallback.
          </div>
        </Card>
      </aside>

      <section>
        <ContentEditor scope={scope} initialByLocale={initialByLocale} />
      </section>
    </div>
  )
}

