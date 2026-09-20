import { beforeEach, expect, it, vi } from "vitest"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
const mocks = vi.hoisted(() => ({ db: vi.fn() }))
vi.mock("@/lib/db", () => ({ getDb: mocks.db }))
import { getFileMetadataByDriveIds } from "./metadata"
const queries: { sql: string; params: unknown[] }[] = []
beforeEach(() => {
  queries.length = 0
  mocks.db.mockResolvedValue({ select: () => ({ from: () => ({ where: async (condition: Parameters<SQLiteSyncDialect["sqlToQuery"]>[0]) => {
    const query = new SQLiteSyncDialect().sqlToQuery(condition)
    queries.push(query)
    return query.params.map(driveId => ({ driveId, displayName: "Fixture", password: null, category: null }))
  } }) }) })
})
it.each([0, 1, 100, 101, 1001])("uses indexed bounded batches for %i requested IDs", async count => {
  const ids = Array.from({ length: count }, (_, i) => `fixture-${i}`)
  const result = await getFileMetadataByDriveIds([...ids, ...ids])
  expect(result.size).toBe(count)
  expect(queries).toHaveLength(Math.ceil(count / 100))
  for (const query of queries) {
    expect(query.sql).toContain('"file_metadata"."drive_id" in')
    expect(query.params.length).toBeLessThanOrEqual(100)
  }
})
