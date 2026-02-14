import type { DrizzleD1Database } from "drizzle-orm/d1"
import { schema } from "@/lib/db"

export async function ensureDistrictSiteExists(
  db: DrizzleD1Database<typeof schema>,
  districtNumber: number
) {
  // Use base columns only so local DBs that have not run newer migrations still work.
  await (db as any).$client
    .prepare(
      `INSERT INTO district_sites (
        district_number,
        subdomain,
        display_name,
        enabled,
        mode,
        redirect_url,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, 0, 'hosted', NULL, datetime('now'), datetime('now'))
      ON CONFLICT(district_number) DO NOTHING`
    )
    .bind(districtNumber, `d${districtNumber}`, `District ${districtNumber}`)
    .run()
}
