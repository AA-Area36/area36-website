// @vitest-environment node
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { readFileSync } from "node:fs"
import { expect, it } from "vitest"
import { saveOccurrence } from "./save-occurrence"
import { startsBeforeHorizon } from "./recurring-window"
import type { Event } from "@/lib/db/schema"

it("validates recurrence and rejects a concurrently shortened series inside the write transaction", async () => {
  const sqlite = new DatabaseSync(":memory:")
  sqlite.exec(`CREATE TABLE events (id TEXT PRIMARY KEY, date TEXT, is_recurring INTEGER, recurrence_type TEXT, recurrence_pattern TEXT, monthly_pattern_type TEXT, monthly_pattern_value TEXT, recur_until TEXT);
    INSERT INTO events VALUES ('event', '2026-09-01', 1, 'weekly', '[1]', NULL, NULL, '2026-10-31');`)
  sqlite.exec(readFileSync(new URL("../db/migrations/0010_recurring_events.sql", import.meta.url), "utf8").split("-- Create event_exceptions table")[1]?.replace(/^.*?CREATE TABLE/s, "CREATE TABLE") ?? "")
  const db = {
    prepare(query: string) { return { bind(...values: SQLInputValue[]) { return { query, values } } } },
    async batch(statements: { query: string; values: SQLInputValue[] }[]) {
      sqlite.exec("BEGIN")
      try {
        const results = statements.map(({ query, values }) => ({ meta: { changes: Number(sqlite.prepare(query).run(...values).changes) } }))
        sqlite.exec("COMMIT")
        return results
      } catch (error) { sqlite.exec("ROLLBACK"); throw error }
    },
  } as unknown as D1Database
  const parent = { id: "event", date: "2026-09-01", isRecurring: true, recurrenceType: "weekly", recurrencePattern: "[1]", monthlyPatternType: null, monthlyPatternValue: null, recurUntil: "2026-10-31" } as Event
  try {
    await expect(saveOccurrence(db, parent, "2026-09-22", {}, "fixture@example.test")).rejects.toThrow("outside")
    await saveOccurrence(db, parent, "2026-09-21", { exceptionType: "cancelled" }, "fixture@example.test")
    expect(sqlite.prepare("SELECT count(*) AS n FROM event_exceptions").get()?.n).toBe(1)
    sqlite.exec("UPDATE events SET recur_until = '2026-09-14'")
    await expect(saveOccurrence(db, parent, "2026-09-21", { exceptionType: "modified" }, "fixture@example.test")).rejects.toThrow("changed")
    expect(sqlite.prepare("SELECT exception_type FROM event_exceptions").get()?.exception_type).toBe("cancelled")
  } finally { sqlite.close() }
})

it("bounds upcoming candidates while preserving multiday and stored modified exceptions", () => {
  const sqlite = new DatabaseSync(":memory:")
  try {
    sqlite.exec(`CREATE TABLE events (id TEXT PRIMARY KEY, date TEXT);
      CREATE TABLE event_exceptions (event_id TEXT, occurrence_date TEXT, exception_type TEXT);
      INSERT INTO events VALUES ('near', '2026-10-01'), ('multiday', '2026-09-01'), ('far', '2035-01-01'), ('modified', '2035-01-01');
      INSERT INTO event_exceptions VALUES ('modified', '2026-10-01', 'modified');`)
    const predicate = new SQLiteSyncDialect().sqlToQuery(startsBeforeHorizon("2027-09-20"))
    const rows = sqlite.prepare(`SELECT id FROM events WHERE ${predicate.sql} ORDER BY id`).all(...predicate.params as SQLInputValue[])
    expect(rows.map(row => row.id)).toEqual(["modified", "multiday", "near"])
  } finally { sqlite.close() }
})
