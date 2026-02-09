import Link from "next/link"
import { cookies } from "next/headers"
import { CONTENT_SCHEMAS, type ContentDoc, type Scope } from "@/lib/content/schema"
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/locales"
import { loadContentDocs } from "./actions"
import { ContentEditor } from "./content-editor"
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
  const cookieStore = await cookies()
  const initialPreviewEnabled = cookieStore.get("a36_content_preview")?.value === "1"

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
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Content Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit and publish site copy per language. Changes go live immediately on publish.
        </p>
      </div>

      {/* Scope tabs */}
      <div className="flex items-center gap-1 border-b border-border -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        {Object.values(CONTENT_SCHEMAS).map((s) => (
          <Link
            key={s.scope}
            href={`/admin/content?scope=${encodeURIComponent(s.scope)}`}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors",
              s.scope === scope
                ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary after:rounded-full"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s.title}
          </Link>
        ))}
      </div>

      {/* Editor */}
      <ContentEditor
        key={scope}
        scope={scope}
        initialByLocale={initialByLocale}
        initialPreviewEnabled={initialPreviewEnabled}
      />
    </div>
  )
}
