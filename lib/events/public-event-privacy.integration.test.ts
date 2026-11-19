// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { drizzle } from "drizzle-orm/d1"
import * as schema from "@/lib/db/schema"
import type { DisplayEvent } from "@/lib/types/recurrence"
import { createSqliteD1 } from "../../tests/helpers/sqlite-d1"

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }))
vi.mock("@/lib/db", async () => ({ getDb, schema: await import("@/lib/db/schema") }))
vi.mock("@/lib/monitoring/errors", () => ({ recordError: vi.fn() }))
vi.mock("@/lib/cache/single-flight", () => ({
  runSharedSingleFlight: async (_key: string, _read: unknown, work: () => Promise<unknown>) => work(),
  registerBackgroundWork: async () => false,
}))
vi.mock("@/lib/logger", () => ({ createRequestLogger: () => ({
  info: vi.fn(), warn: vi.fn(), error: vi.fn(), requestId: "privacy-test",
  tracker: {
    time: async <T>(_name: string, operation: () => Promise<T>) => operation(),
    startOperation: () => vi.fn(), finish: vi.fn(),
  },
}) }))

import { GET as upcoming } from "../../app/api/events/route"
import { GET as past } from "../../app/api/events/past/route"
import { getDistrictPublicEvents } from "@/lib/district/queries"
import { invalidateEventCaches } from "@/lib/utils/event-cache"
import { fetchUpcomingEvents } from "@/components/events-preview-actions"

let database: ReturnType<typeof createSqliteD1>
let entries: Map<string, Response>
const privateContact = "synthetic-contact@example.test"

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-11-19T12:00:00Z"))
  database = createSqliteD1()
  database.migrate()
  database.sqlite.exec("DELETE FROM events")
  getDb.mockResolvedValue(drizzle(database.client, { schema }))
  entries = new Map()
  const key = (request: RequestInfo | URL) => request instanceof Request ? request.url : String(request)
  vi.stubGlobal("caches", { open: async () => ({
    match: async (request: RequestInfo | URL) => entries.get(key(request))?.clone(),
    put: async (request: RequestInfo | URL, response: Response) => { entries.set(key(request), response.clone()) },
    delete: async (request: RequestInfo | URL) => entries.delete(key(request)),
  }) })
  for (const [id, date, recurring] of [
    ["future-single", "2026-11-20", false], ["future-series", "2026-11-20", true],
    ["past-single", "2026-11-17", false], ["past-series", "2026-11-17", true],
  ] as const) {
    database.sqlite.prepare(`INSERT INTO events
      (id,title,date,start_time,end_time,timezone,location_type,description,status,
       submitter_email,district_number,type,is_recurring,recurrence_type,recurrence_pattern,recur_until)
      VALUES (?,?,?,'19:00','20:00','America/Chicago','online','Synthetic meeting',
       'approved',?,24,'District',?,'weekly',?,?)`).run(
      id, id, date, privateContact, recurring ? 1 : 0,
      JSON.stringify([recurring && date.endsWith("20") ? 5 : 2]), date,
    )
  }
})
afterEach(() => {
  database.sqlite.close()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function expectPublic(rows: DisplayEvent[]) {
  expect(rows).toHaveLength(2)
  expect(rows.map(row => row.isRecurringInstance).sort()).toEqual([false, true])
  for (const row of rows) {
    for (const field of ["submitterEmail", "submissionKey", "reviewedBy", "reviewedAt", "denialReason"]) {
      expect(row).not.toHaveProperty(field)
    }
  }
  expect(JSON.stringify(rows)).not.toContain(privateContact)
}

describe("public event privacy", () => {
  it("returns only public presentation data from the homepage Server Action", async () => {
    database.sqlite.exec("UPDATE events SET type='Assembly' WHERE id='future-single'")
    const rows = await fetchUpcomingEvents()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: "future-single", title: "future-single", date: "2026-11-20", type: "Assembly" })
    for (const field of ["submitterEmail", "submissionKey", "reviewedBy", "reviewedAt", "denialReason"]) {
      expect(rows[0]).not.toHaveProperty(field)
    }
    expect(JSON.stringify(rows)).not.toContain(privateContact)
  })

  it.each([null, 24])("excludes contact data on cold and cached upcoming feeds (district %s)", async district => {
    const url = `https://example.test/api/events${district ? `?district=${district}` : ""}`
    const legacyKey = `events:approved${district ? `:district:${district}` : ""}`
    for (const suffix of ["", ":stale"]) {
      entries.set(`https://cache.internal/edge:${legacyKey}${suffix}`, Response.json([{ submitterEmail: privateContact }]))
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await upcoming(new Request(url))
      expect(response.status).toBe(200)
      expect(response.headers.get("cloudflare-cdn-cache-control")).toBe("no-store")
      expectPublic(await response.json() as DisplayEvent[])
    }
  })

  it("excludes contact data from past events and district server props while retaining the private DB field", async () => {
    const response = await past(new Request("https://example.test/api/events/past?from=2026-11-17&to=2026-11-18"))
    expect(response.status).toBe(200)
    const body = await response.json() as { events: DisplayEvent[] }
    expectPublic(body.events)
    expectPublic(await getDistrictPublicEvents(24))
    expect(database.sqlite.prepare("SELECT submitter_email FROM events WHERE id='future-single'").get())
      .toMatchObject({ submitter_email: privateContact })
  })

  it("invalidates both global and district public cache entries after an event edit", async () => {
    const requests = ["https://example.test/api/events", "https://example.test/api/events?district=24"].map(url => new Request(url))
    for (const request of requests) expectPublic(await (await upcoming(request)).json() as DisplayEvent[])
    database.sqlite.exec("UPDATE events SET title='Updated public title' WHERE id='future-single'")
    await invalidateEventCaches(24)
    for (const request of requests) {
      const rows = await (await upcoming(request)).json() as DisplayEvent[]
      expect(rows.find(row => row.id === "future-single")?.title).toBe("Updated public title")
      expectPublic(rows)
    }
  })
})
