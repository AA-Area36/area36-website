import type { DrizzleD1Database } from "drizzle-orm/d1"
import { eq, sql } from "drizzle-orm"
import * as schema from "@/lib/db/schema"
import { deleteFlyersByEventId, deleteObjectsByPrefix } from "@/lib/r2"

type Database = DrizzleD1Database<typeof schema>

export function enqueueEventFlyerCleanup(db: Database, eventId: string) {
  return db
    .insert(schema.eventFlyerCleanupPending)
    .values({
      eventId,
      attempts: 0,
      updatedAt: sql`datetime('now')`,
    })
    .onConflictDoUpdate({
      target: schema.eventFlyerCleanupPending.eventId,
      set: {
        attempts: 0,
        updatedAt: sql`datetime('now')`,
      },
    })
}

export async function completeEventFlyerCleanup(db: Database, eventId: string): Promise<number> {
  const deletedCount = await deleteFlyersByEventId(eventId)
  await db
    .delete(schema.eventFlyerCleanupPending)
    .where(eq(schema.eventFlyerCleanupPending.eventId, eventId))
  return deletedCount
}

export async function processPendingEventFlyerCleanup(
  env: Pick<CloudflareEnv, "DB" | "DRIVE_IMAGES">,
  limit = 25
): Promise<{ cleaned: number; failed: number }> {
  const boundedLimit = Math.min(Math.max(1, Math.trunc(limit)), 100)
  const pending = await env.DB.prepare(
    `SELECT event_id AS eventId
     FROM event_flyer_cleanup_pending
     ORDER BY updated_at ASC
     LIMIT ?`
  )
    .bind(boundedLimit)
    .all<{ eventId: string }>()

  let cleaned = 0
  let failed = 0

  for (const job of pending.results) {
    try {
      await deleteObjectsByPrefix(env.DRIVE_IMAGES, `flyers/${job.eventId}/`)
      await env.DB.prepare(
        "DELETE FROM event_flyer_cleanup_pending WHERE event_id = ?"
      )
        .bind(job.eventId)
        .run()
      cleaned++
    } catch (error) {
      failed++
      console.error("Deferred event flyer cleanup failed", {
        eventId: job.eventId,
        error: error instanceof Error ? error.message : "Unknown cleanup error",
      })
      await env.DB.prepare(
        `UPDATE event_flyer_cleanup_pending
         SET attempts = attempts + 1, updated_at = datetime('now')
         WHERE event_id = ?`
      )
        .bind(job.eventId)
        .run()
    }
  }

  return { cleaned, failed }
}
