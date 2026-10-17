import { beforeEach, expect, it, vi } from "vitest"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
const mocks = vi.hoisted(() => ({ db: vi.fn() }))
vi.mock("@/lib/db", () => ({ getDb: mocks.db }))
import { enrichResourcesWithMetadata, getFileMetadataByDriveIds } from "./metadata"
import type { Resource } from "@/lib/gdrive/types"
const queries: { sql: string; params: unknown[] }[] = []
beforeEach(() => {
  queries.length = 0
  mocks.db.mockResolvedValue({ select: () => ({ from: () => ({ where: async (condition: Parameters<SQLiteSyncDialect["sqlToQuery"]>[0]) => {
    const query = new SQLiteSyncDialect().sqlToQuery(condition)
    queries.push(query)
    return query.params.map(driveId => ({ driveId, displayName: "Fixture", password: null, category: null }))
  } }) }) })
})

it("passes an assigned topic through without replacing the resource section or access controls", async () => {
  const resource: Resource = {
    id: "fixture",
    driveId: "fixture",
    title: "Original title",
    category: "area-documents",
    mimeType: "application/pdf",
    previewUrl: "/api/files/preview/fixture",
    isRestricted: true,
  }
  const [enriched] = await enrichResourcesWithMetadata([resource], new Map([
    ["fixture", { driveId: "fixture", displayName: "Updated title", password: "fixture-password", category: "Bylaws" }],
  ]))
  expect(enriched).toMatchObject({
    title: "Updated title",
    category: "area-documents",
    documentCategory: "Bylaws",
    isProtected: true,
    isRestricted: true,
    previewUrl: resource.previewUrl,
  })
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
