"use server"

import { auth } from "@/lib/auth"
import { getDb, schema } from "@/lib/db"
import type { ContentDoc, Scope } from "@/lib/content/schema"
import type { Locale } from "@/lib/i18n/locales"
import { and, eq } from "drizzle-orm"
import { sql } from "drizzle-orm"

export type ContentDocRow = {
  scope: Scope
  locale: Locale
  draftJson: string | null
  publishedJson: string | null
  createdAt: string
  draftUpdatedAt: string
  publishedAt: string | null
  updatedBy: string | null
}

export async function loadContentDocs(scope: Scope): Promise<ContentDocRow[]> {
  const db = await getDb()
  return db
    .select({
      scope: schema.contentDocuments.scope,
      locale: schema.contentDocuments.locale,
      draftJson: schema.contentDocuments.draftJson,
      publishedJson: schema.contentDocuments.publishedJson,
      createdAt: schema.contentDocuments.createdAt,
      draftUpdatedAt: schema.contentDocuments.draftUpdatedAt,
      publishedAt: schema.contentDocuments.publishedAt,
      updatedBy: schema.contentDocuments.updatedBy,
    })
    .from(schema.contentDocuments)
    .where(eq(schema.contentDocuments.scope, scope))
    .all() as unknown as ContentDocRow[]
}

export async function saveContentDraft({
  scope,
  locale,
  doc,
}: {
  scope: Scope
  locale: Locale
  doc: ContentDoc
}) {
  const session = await auth()
  if (!session?.user?.email) {
    return { ok: false as const, error: "Not authenticated" }
  }

  const db = await getDb()
  const now = sql`(datetime('now'))`
  const payload = JSON.stringify(doc)

  await db
    .insert(schema.contentDocuments)
    .values({
      scope,
      locale,
      draftJson: payload,
      draftUpdatedAt: now as any,
      updatedBy: session.user.email,
    })
    .onConflictDoUpdate({
      target: [schema.contentDocuments.scope, schema.contentDocuments.locale],
      set: {
        draftJson: payload,
        draftUpdatedAt: now as any,
        updatedBy: session.user.email,
      },
    })

  return { ok: true as const }
}

export async function publishContent({
  scope,
  locale,
}: {
  scope: Scope
  locale: Locale
}) {
  const session = await auth()
  if (!session?.user?.email) {
    return { ok: false as const, error: "Not authenticated" }
  }

  const db = await getDb()

  const row = await db
    .select({
      draftJson: schema.contentDocuments.draftJson,
    })
    .from(schema.contentDocuments)
    .where(and(eq(schema.contentDocuments.scope, scope), eq(schema.contentDocuments.locale, locale)))
    .get()

  if (!row?.draftJson) {
    return { ok: false as const, error: "No draft to publish" }
  }

  await db
    .update(schema.contentDocuments)
    .set({
      publishedJson: row.draftJson,
      publishedAt: sql`(datetime('now'))` as any,
      updatedBy: session.user.email,
    })
    .where(and(eq(schema.contentDocuments.scope, scope), eq(schema.contentDocuments.locale, locale)))

  return { ok: true as const }
}
