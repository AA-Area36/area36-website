import { and, eq, inArray } from "drizzle-orm"
import { unstable_noStore as noStore } from "next/cache"
import { cookies } from "next/headers"
import { getDb, schema } from "@/lib/db"
import { CONTENT_SCHEMAS, type ContentDoc, type Scope } from "@/lib/content/schema"
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales"
import { auth } from "@/lib/auth"

const CONTENT_PREVIEW_COOKIE = "a36_content_preview"

async function shouldUseDraftContent(): Promise<boolean> {
  // Only allow draft preview for authenticated admins.
  const cookieStore = await cookies()
  const enabled = cookieStore.get(CONTENT_PREVIEW_COOKIE)?.value === "1"
  if (!enabled) return false
  return !!(await auth())
}

function safeJsonParse(value: string | null | undefined): ContentDoc | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as ContentDoc
    return null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function deepMerge(base: ContentDoc, override: ContentDoc): ContentDoc {
  const out: ContentDoc = structuredClone(base) as ContentDoc
  for (const [k, v] of Object.entries(override)) {
    const existing = out[k]
    if (isRecord(existing) && isRecord(v)) {
      out[k] = deepMerge(existing, v)
    } else {
      out[k] = v
    }
  }
  return out
}

async function getPublishedDoc(scope: Scope, locale: Locale): Promise<ContentDoc | null> {
  try {
    const useDraft = await shouldUseDraftContent()
    const db = await getDb()
    const row = await db
      .select({
        draftJson: schema.contentDocuments.draftJson,
        publishedJson: schema.contentDocuments.publishedJson,
      })
      .from(schema.contentDocuments)
      .where(and(eq(schema.contentDocuments.scope, scope), eq(schema.contentDocuments.locale, locale)))
      .get()

    const preferred = useDraft ? row?.draftJson ?? row?.publishedJson : row?.publishedJson
    return safeJsonParse(preferred)
  } catch {
    // Local dev or fresh environments may not have migrations applied yet.
    return null
  }
}

/**
 * Returns a fully-merged content doc for a scope and locale:
 * - English defaults (code) are the base for all locales
 * - Published English overrides apply next
 * - Published locale overrides apply last
 */
export async function getContent(scope: Scope, locale: Locale): Promise<ContentDoc> {
  noStore() // Must update immediately after admin edits (no redeploy).

  const schemaForScope = CONTENT_SCHEMAS[scope]
  const baseEn = schemaForScope.defaultsEn

  const [publishedEn, publishedLocale] = await Promise.all([
    getPublishedDoc(scope, DEFAULT_LOCALE),
    locale === DEFAULT_LOCALE ? Promise.resolve(null) : getPublishedDoc(scope, locale),
  ])

  let merged = deepMerge(baseEn, publishedEn ?? {})
  if (publishedLocale) merged = deepMerge(merged, publishedLocale)
  return merged
}

export async function getContentMany(scopes: Scope[], locale: Locale): Promise<Record<Scope, ContentDoc>> {
  noStore()

  let rows: Array<{ scope: string; locale: string; publishedJson: string | null }> = []
  try {
    const useDraft = await shouldUseDraftContent()
    const db = await getDb()
    rows = await db
      .select({
        scope: schema.contentDocuments.scope,
        locale: schema.contentDocuments.locale,
        publishedJson: useDraft ? schema.contentDocuments.draftJson : schema.contentDocuments.publishedJson,
      })
      .from(schema.contentDocuments)
      .where(
        and(inArray(schema.contentDocuments.scope, scopes), inArray(schema.contentDocuments.locale, [DEFAULT_LOCALE, locale])),
      )
      .all()
  } catch {
    rows = []
  }

  const byScopeLocale = new Map<string, ContentDoc>()
  for (const r of rows) {
    const parsed = safeJsonParse(r.publishedJson)
    if (parsed) byScopeLocale.set(`${r.scope}:${r.locale}`, parsed)
  }

  const out: Record<string, ContentDoc> = {}
  for (const scope of scopes) {
    const baseEn = CONTENT_SCHEMAS[scope].defaultsEn
    const publishedEn = byScopeLocale.get(`${scope}:${DEFAULT_LOCALE}`) ?? {}
    const publishedLocale = locale === DEFAULT_LOCALE ? null : byScopeLocale.get(`${scope}:${locale}`)
    let merged = deepMerge(baseEn, publishedEn)
    if (publishedLocale) merged = deepMerge(merged, publishedLocale)
    out[scope] = merged
  }

  return out as Record<Scope, ContentDoc>
}
