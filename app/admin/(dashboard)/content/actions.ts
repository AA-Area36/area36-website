"use server"

import { auth } from "@/lib/auth"
import { getDb, schema } from "@/lib/db"
import type { ContentDoc, Scope } from "@/lib/content/schema"
import type { Locale } from "@/lib/i18n/locales"
import { cookies } from "next/headers"
import { and, eq } from "drizzle-orm"
import { sql } from "drizzle-orm"

const CONTENT_PREVIEW_COOKIE = "a36_content_preview"

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

function isMissingContentDocumentsTableError(err: unknown): boolean {
  const msg = String((err as any)?.cause?.message ?? (err as any)?.message ?? err)
  return msg.includes("no such table: content_documents")
}

function missingTableErrorMessage(): string {
  return [
    "Content database is not migrated (missing table: content_documents).",
    "Run: pnpm wrangler d1 migrations apply area36-website --local",
  ].join(" ")
}

export async function setContentPreviewEnabled(enabled: boolean) {
  const session = await auth()
  if (!session?.user?.email) {
    return { ok: false as const, error: "Not authenticated" }
  }

  const cookieStore = await cookies()
  if (!enabled) {
    cookieStore.delete(CONTENT_PREVIEW_COOKIE)
    return { ok: true as const }
  }

  cookieStore.set(CONTENT_PREVIEW_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  })
  return { ok: true as const }
}

export async function loadContentDocs(scope: Scope): Promise<ContentDocRow[]> {
  try {
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
  } catch (err) {
    // Local dev or fresh environments may not have migrations applied yet.
    if (isMissingContentDocumentsTableError(err)) return []
    throw err
  }
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

  try {
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
  } catch (err) {
    if (isMissingContentDocumentsTableError(err)) {
      return { ok: false as const, error: missingTableErrorMessage() }
    }
    throw err
  }

  const row = await db
    .select({
      draftUpdatedAt: schema.contentDocuments.draftUpdatedAt,
      updatedBy: schema.contentDocuments.updatedBy,
    })
    .from(schema.contentDocuments)
    .where(and(eq(schema.contentDocuments.scope, scope), eq(schema.contentDocuments.locale, locale)))
    .get()

  return {
    ok: true as const,
    draftUpdatedAt: row?.draftUpdatedAt ?? null,
    updatedBy: row?.updatedBy ?? null,
  }
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

  let row: { draftJson: string | null } | undefined
  try {
    row = await db
      .select({
        draftJson: schema.contentDocuments.draftJson,
      })
      .from(schema.contentDocuments)
      .where(and(eq(schema.contentDocuments.scope, scope), eq(schema.contentDocuments.locale, locale)))
      .get()
  } catch (err) {
    if (isMissingContentDocumentsTableError(err)) {
      return { ok: false as const, error: missingTableErrorMessage() }
    }
    throw err
  }

  if (!row?.draftJson) {
    return { ok: false as const, error: "No draft to publish" }
  }

  try {
    await db
      .update(schema.contentDocuments)
      .set({
        publishedJson: row.draftJson,
        publishedAt: sql`(datetime('now'))` as any,
        updatedBy: session.user.email,
      })
      .where(and(eq(schema.contentDocuments.scope, scope), eq(schema.contentDocuments.locale, locale)))
  } catch (err) {
    if (isMissingContentDocumentsTableError(err)) {
      return { ok: false as const, error: missingTableErrorMessage() }
    }
    throw err
  }

  const published = await db
    .select({
      publishedAt: schema.contentDocuments.publishedAt,
      updatedBy: schema.contentDocuments.updatedBy,
      publishedJson: schema.contentDocuments.publishedJson,
    })
    .from(schema.contentDocuments)
    .where(and(eq(schema.contentDocuments.scope, scope), eq(schema.contentDocuments.locale, locale)))
    .get()

  return {
    ok: true as const,
    publishedAt: published?.publishedAt ?? null,
    updatedBy: published?.updatedBy ?? null,
    publishedJson: published?.publishedJson ?? null,
  }
}
