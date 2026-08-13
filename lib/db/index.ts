import { drizzle, DrizzleD1Database } from "drizzle-orm/d1"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import * as schema from "./schema"

export type AppDatabase = DrizzleD1Database<typeof schema> & {
  $client: D1Database
}

export async function getDb(): Promise<AppDatabase> {
  const { env } = await getCloudflareContext({ async: true })
  return drizzle(env.DB, { schema })
}

export { schema }
