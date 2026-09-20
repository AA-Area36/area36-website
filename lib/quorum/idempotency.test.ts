// @vitest-environment node
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { readFileSync } from "node:fs"
import { describe, it, expect } from "vitest"
import { hashQuorumPayload, reserveQuorumRow } from "./idempotency"

describe("durable quorum row allocation", () => {
  it("allocates distinct rows atomically and reuses a response-loss attempt without accepting changed payloads", async () => {
    const sqlite = new DatabaseSync(":memory:")
    sqlite.exec("CREATE TABLE file_metadata (category TEXT)")
    sqlite.exec(readFileSync(new URL("../db/migrations/0031_audit_consistency.sql", import.meta.url), "utf8"))
    const db = { prepare(query: string) {
      return { bind(...values: SQLInputValue[]) {
        return {
          async run() { return sqlite.prepare(query).run(...values) },
          async first() { return sqlite.prepare(query).get(...values) ?? null },
        }
      } }
    } } as unknown as D1Database
    try {
      const base = { eventKey: "event", submissionId: "attempt-a", payloadHash: await hashQuorumPayload({ name: "Fixture" }), occupiedRows: 12, submittedAt: "2026-09-20T00:00:00Z" }
      const rows = await Promise.all([reserveQuorumRow(db, base), reserveQuorumRow(db, { ...base, submissionId: "attempt-b" })])
      expect(rows.map(row => row.rowNumber)).toEqual([13, 14])
      expect(await reserveQuorumRow(db, { ...base, occupiedRows: 30, submittedAt: "later" })).toEqual(rows[0])
      await expect(reserveQuorumRow(db, { ...base, payloadHash: "changed" })).rejects.toThrow("original details")
      expect(sqlite.prepare("SELECT count(*) AS count FROM quorum_submission_reservations").get()?.count).toBe(2)
    } finally { sqlite.close() }
  })
})
