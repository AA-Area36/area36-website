// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestHarness, type TestHarness } from "wrangler"
import { fetchErrorSummary, fetchEventDetails, renderCommitAuthor } from "./index"

interface MonthlyReportEnv {
  DB: D1Database
}

let harness: TestHarness
let env: MonthlyReportEnv

beforeAll(async () => {
  harness = createTestHarness({
    root: process.cwd(),
    workers: [{ configPath: "workers/monthly-report/wrangler.jsonc" }],
  })
  await harness.listen()
  env = await harness.getWorker<MonthlyReportEnv>().getEnv()

  await env.DB.prepare(`CREATE TABLE events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    end_date TEXT,
    start_time TEXT,
    end_time TEXT,
    location_type TEXT NOT NULL,
    address TEXT,
    status TEXT NOT NULL,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run()
  await env.DB.prepare(`CREATE TABLE event_to_types (
    event_id TEXT NOT NULL,
    type TEXT NOT NULL
  )`).run()
  await env.DB.prepare(`CREATE TABLE errors_daily (
    day TEXT NOT NULL,
    error_kind TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    count INTEGER NOT NULL,
    sample_message TEXT,
    sample_route TEXT,
    last_seen_at TEXT,
    PRIMARY KEY (day, error_kind, fingerprint)
  )`).run()

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO events (
        id, title, date, location_type, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      "approved-updated",
      "Approved updated event",
      "2026-08-15",
      "in-person",
      "approved",
      "2026-06-15 12:00:00",
      "2026-07-15 12:00:00"
    ),
    env.DB.prepare(
      `INSERT INTO events (
        id, title, date, location_type, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      "pending-updated",
      "Pending updated event",
      "2026-08-16",
      "in-person",
      "pending",
      "2026-06-15 12:00:00",
      "2026-07-16 12:00:00"
    ),
    env.DB.prepare(
      `INSERT INTO events (
        id, title, date, location_type, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      "denied-updated",
      "Denied updated event",
      "2026-08-17",
      "in-person",
      "denied",
      "2026-06-15 12:00:00",
      "2026-07-17 12:00:00"
    ),
    env.DB.prepare(
      `INSERT INTO events (
        id, title, date, location_type, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      "approved-created",
      "Approved created event",
      "2026-08-18",
      "online",
      "approved",
      "2026-07-18 12:00:00",
      "2026-07-18 12:00:00"
    ),
    env.DB.prepare(
      `INSERT INTO errors_daily (
        day, error_kind, fingerprint, count, sample_message, sample_route
      ) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      "2026-07-20",
      "FETCH_FAILED",
      "error-fingerprint",
      3,
      "sentinel-user@example.com?token=secret-value",
      "/api/example"
    ),
  ])
}, 30_000)

afterAll(async () => {
  await harness?.close()
})

describe("monthly report HTML escaping", () => {
  it("escapes markup in commit author names", () => {
    const result = renderCommitAuthor('<img src=x onerror="alert(1)">', "2026-07-01T00:00:00Z")
    expect(result).not.toContain("<img")
    expect(result).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;")
  })
})

describe("monthly report event eligibility", () => {
  it("includes only approved created and updated events", async () => {
    const events = await fetchEventDetails(
      env,
      new Date("2026-07-01T00:00:00Z"),
      new Date("2026-08-01T00:00:00Z")
    )

    expect(events.created.map((event) => event.id)).toEqual(["approved-created"])
    expect(events.updated.map((event) => event.id)).toEqual(["approved-updated"])
    expect(events.summary).toEqual({ createdCount: 1, updatedCount: 1 })
  })
})

describe("monthly report diagnostic projection", () => {
  it("omits raw sample messages from public report data", async () => {
    const errors = await fetchErrorSummary(
      env,
      new Date("2026-07-01T00:00:00Z"),
      new Date("2026-08-01T00:00:00Z")
    )

    expect(errors.topErrors).toEqual([
      {
        errorKind: "FETCH_FAILED",
        fingerprint: "error-fingerprint",
        count: 3,
        sampleRoute: "/api/example",
      },
    ])
    expect(JSON.stringify(errors)).not.toContain("sentinel-user@example.com")
  })
})
