// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestHarness, type TestHarness } from "wrangler"
import {
  MAX_PUBLIC_EVENT_FLYER_BYTES,
  releasePublicEventFlyerReservation,
  reservePublicEventFlyerUpload,
} from "./flyer-upload-budget"

interface TestEnv {
  DB: D1Database
}

let harness: TestHarness
let db: D1Database

beforeAll(async () => {
  harness = createTestHarness({
    root: process.cwd(),
    workers: [{ configPath: "workers/monthly-report/wrangler.jsonc" }],
  })
  await harness.listen()
  db = (await harness.getWorker<TestEnv>().getEnv()).DB

  await db.prepare("CREATE TABLE events (id TEXT PRIMARY KEY)").run()
  await db.prepare(`CREATE TABLE event_flyers (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    file_size INTEGER NOT NULL
  )`).run()
  await db.prepare(`CREATE TABLE event_flyer_upload_reservations (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    token_id TEXT NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size >= 0),
    state TEXT NOT NULL CHECK (state IN ('reserved', 'committed')),
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`).run()
  await db.batch([
    db.prepare("INSERT INTO events (id) VALUES (?)").bind("event-count"),
    db.prepare("INSERT INTO events (id) VALUES (?)").bind("event-bytes"),
    db.prepare(
      "INSERT INTO event_flyers (id, event_id, file_size) VALUES (?, ?, ?)"
    ).bind("large-existing", "event-bytes", MAX_PUBLIC_EVENT_FLYER_BYTES - 1024),
  ])
}, 30_000)

afterAll(async () => {
  await harness?.close()
})

describe("public event flyer upload budget", () => {
  it("atomically accepts only five concurrent uses of one event token", async () => {
    const now = Date.now()
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        reservePublicEventFlyerUpload(
          db,
          {
            id: `reservation-${index}`,
            eventId: "event-count",
            tokenId: "token-count",
            fileSize: 1024,
            expiresAt: now + 60_000,
          },
          now
        )
      )
    )

    expect(results.filter(Boolean)).toHaveLength(5)
    expect(results.filter((accepted) => !accepted)).toHaveLength(1)
  })

  it("allows a retry after a failed upload releases its reservation", async () => {
    await releasePublicEventFlyerReservation(db, "reservation-0")

    await expect(
      reservePublicEventFlyerUpload(db, {
        id: "reservation-retry",
        eventId: "event-count",
        tokenId: "token-count",
        fileSize: 1024,
        expiresAt: Date.now() + 60_000,
      })
    ).resolves.toBe(true)
  })

  it("rejects an upload that would exceed the aggregate byte budget", async () => {
    await expect(
      reservePublicEventFlyerUpload(db, {
        id: "reservation-too-large",
        eventId: "event-bytes",
        tokenId: "token-bytes",
        fileSize: 2048,
        expiresAt: Date.now() + 60_000,
      })
    ).resolves.toBe(false)
  })
})
