// @vitest-environment node

import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"

const publicTables = [
  "content_documents", "events", "event_to_types", "event_flyers", "event_exceptions",
  "district_sites", "district_contacts", "district_positions", "district_updates",
  "subscription_drives", "drive_submissions", "recording_folders", "file_metadata", "reports_monthly",
]

describe("public HTML revision migration", () => {
  it("atomically invalidates on inserts, updates/unpublishing and deletes for all public tables", () => {
    const db = new DatabaseSync(":memory:")
    try {
      for (const table of publicTables) db.exec(`CREATE TABLE ${table} (id INTEGER PRIMARY KEY, published INTEGER)`)
      const migration = readFileSync(new URL("../db/migrations/0030_public_html_revision.sql", import.meta.url), "utf8")
      db.exec(migration)
      db.exec(migration) // replay must preserve the revision and avoid duplicate triggers
      const revision = () => db.prepare("SELECT revision FROM public_html_revision WHERE id = 1").get()?.revision
      let expected = 0
      expect(revision()).toBe(expected)
      for (const table of publicTables) {
        db.exec(`INSERT INTO ${table} (id, published) VALUES (1, 1)`)
        expect(revision()).toBe(++expected)
        db.exec(`UPDATE ${table} SET published = 0 WHERE id = 1`)
        expect(revision()).toBe(++expected)
        db.exec(`DELETE FROM ${table} WHERE id = 1`)
        expect(revision()).toBe(++expected)
      }
      db.exec("BEGIN; INSERT INTO content_documents (id, published) VALUES (2, 1); ROLLBACK;")
      expect(revision()).toBe(expected)
    } finally {
      db.close()
    }
  })
})
