import { getR2Bucket } from "@/lib/r2"

export function enqueueObjectCleanup(db: D1Database, key: string) {
  return db.prepare("INSERT INTO object_cleanup_pending (object_key) VALUES (?) ON CONFLICT(object_key) DO NOTHING").bind(key)
}

export async function finishObjectCleanup(db: D1Database, key: string) {
  const bucket = await getR2Bucket()
  await bucket.delete(key)
  await db.prepare("DELETE FROM object_cleanup_pending WHERE object_key = ?").bind(key).run()
}

export async function processPendingObjectCleanup(env: Pick<CloudflareEnv, "DB" | "DRIVE_IMAGES">) {
  const jobs = await env.DB.prepare("SELECT object_key FROM object_cleanup_pending ORDER BY updated_at LIMIT 25").all<{ object_key: string }>()
  for (const job of jobs.results) {
    try {
      await env.DRIVE_IMAGES.delete(job.object_key)
      await env.DB.prepare("DELETE FROM object_cleanup_pending WHERE object_key = ?").bind(job.object_key).run()
    } catch {
      await env.DB.prepare("UPDATE object_cleanup_pending SET attempts = attempts + 1, updated_at = datetime('now') WHERE object_key = ?").bind(job.object_key).run()
    }
  }
}
