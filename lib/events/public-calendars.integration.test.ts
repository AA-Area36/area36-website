// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { drizzle } from "drizzle-orm/d1"
import * as schema from "@/lib/db/schema"
import { createSqliteD1 } from "../../tests/helpers/sqlite-d1"
const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }))
vi.mock("@/lib/db", async () => ({ getDb, schema: await import("@/lib/db/schema") }))
vi.mock("@/lib/cache/edge-cache", () => ({ withEdgeCache: async (_key: string, fetcher: () => Promise<string>) => ({ data: await fetcher(), status: "miss" }) }))
vi.mock("@/lib/monitoring/errors", () => ({ recordError: vi.fn() }))
vi.mock("@/lib/logger", () => ({ createRequestLogger: () => ({
  info: vi.fn(), warn: vi.fn(), error: vi.fn(), requestId: "test",
  tracker: { time: async <T>(_name: string, operation: () => Promise<T>) => operation(), finish: vi.fn() },
}) }))
import { GET } from "../../app/api/calendar/route"
import { getDistrictPublicEvents } from "@/lib/district/queries"

let database: ReturnType<typeof createSqliteD1>
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-09-06T12:00:00Z"))
  database = createSqliteD1()
  database.migrate()
  database.sqlite.exec("DELETE FROM events")
  getDb.mockResolvedValue(drizzle(database.client, { schema }))
})
afterEach(() => { database.sqlite.close(); vi.useRealTimers(); vi.clearAllMocks() })
function seedEvent(id: string, timezone = "America/Chicago") {
  database.sqlite.prepare(`INSERT INTO events
    (id,title,date,end_date,start_time,end_time,timezone,location_type,description,status,submitter_email,district_number,type,is_recurring,recurrence_type,recurrence_pattern,recur_until)
    VALUES (?,?, '2026-09-05','2026-09-08','19:00','20:00',?,'online','Synthetic fixture','approved','review@example.test',24,'Meeting',1,'weekly','[6]','2026-09-05')`).run(id, `Meeting ${id}`, timezone)
}
function seedException(id: string, endDate = "2026-09-09", occurrenceDate = "2026-09-05") {
  database.sqlite.prepare(`INSERT INTO event_exceptions (id,event_id,occurrence_date,exception_type,end_date,title) VALUES (?,?,?,'modified',?,?)`).run(`exception-${id}`, id, occurrenceDate, endDate, `Edited ${id}`)
}
async function feed() {
  const response = await GET(new Request("https://example.test/api/calendar"))
  expect(response.status).toBe(200)
  return response.text()
}

describe("public calendar SQL integration", () => {
  it.each([100, 101, 201])("loads all %i district events and feed exceptions within D1 limits", async (count) => {
    for (let i = 0; i < count; i++) {
      seedEvent(String(i))
      seedException(String(i))
      database.sqlite.prepare("INSERT INTO event_to_types (event_id,type) VALUES (?, 'District')").run(String(i))
    }
    const district = await getDistrictPublicEvents(24)
    expect(district).toHaveLength(count)
    expect(district.every((event) => event.types[0] === "District" && event.endDate === "2026-09-09")).toBe(true)
    const calendar = await feed()
    expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(count * 2)
    expect(calendar).toContain(`SUMMARY:Edited ${count - 1}`)
    expect(Math.max(...database.parameterCounts)).toBeLessThanOrEqual(100)
  })

  it("keeps an ongoing final occurrence until its end and then removes it", async () => {
    seedEvent("ongoing")
    expect(await feed()).toContain("SUMMARY:Meeting ongoing")
    vi.setSystemTime(new Date("2026-09-09T12:00:00Z"))
    expect(await feed()).not.toContain("SUMMARY:Meeting ongoing")
  })

  it("keeps a final occurrence extended by a valid exception", async () => {
    seedEvent("extended")
    seedException("extended", "2026-09-12")
    vi.setSystemTime(new Date("2026-09-10T12:00:00Z"))
    expect(await feed()).toContain("SUMMARY:Edited extended")
  })

  it("omits malformed legacy time zones without losing valid events", async () => {
    seedEvent("invalid", "No/SuchZone")
    seedEvent("valid")
    const calendar = await feed()
    expect(calendar).toContain("SUMMARY:Meeting valid")
    expect(calendar).not.toContain("SUMMARY:Meeting invalid")
    expect(calendar).not.toContain("No/SuchZone")
  })

  it("does not export an orphan exception after the weekly pattern changes", async () => {
    seedEvent("changed")
    seedException("changed")
    database.sqlite.exec("UPDATE events SET recurrence_pattern='[0]', recur_until='2026-09-30'")
    const calendar = await feed()
    expect(calendar).toContain("SUMMARY:Meeting changed")
    expect(calendar).not.toContain("SUMMARY:Edited changed")
    expect(calendar).not.toContain("RECURRENCE-ID")
  })
})
