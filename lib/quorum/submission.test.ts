// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createSqliteD1 } from "@/tests/helpers/sqlite-d1"

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }))
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }))
vi.mock("@/lib/google/delegated-auth", () => ({
  getGoogleServiceAccountAccessToken: async () => "synthetic-token",
  clearGoogleServiceAccountToken: vi.fn(),
}))
import { appendQuorumSubmission } from "./google"
import { QUORUM_SUBMISSIONS_TAB } from "./constants"

type SheetCell = string | number | boolean | null
const input: Parameters<typeof appendQuorumSubmission>[0] = {
  event: {
    eventKey: "event123456789", spreadsheetId: "synthetic-sheet", title: "Fixture event",
    eventDate: "2026-09-20", quorumTarget: 10, status: "open", featured: false,
  },
  submissionId: "attempt12345678901", submittedAt: "2026-09-20T12:00:00Z",
  registration: {
    name: "Synthetic Attendee", district: "3", homeGroup: "Fixture Group",
    servicePosition: "gsr", positionDetail: "", representation: "primary",
    email: "fixture@example.test", phone: "202-555-0100", streetAddress: "123 Fixture St",
    city: "Fixture", state: "MN", zip: "55000", newsletterDelivery: "neither",
    recaptchaToken: "synthetic-captcha",
  },
  isAlternate: false, seatKey: "gsr:3:fixture-group",
}

describe("Sheets check-in reconciliation", () => {
  let database: ReturnType<typeof createSqliteD1>
  let rows: Map<number, SheetCell[]>
  let initialIdentityCount: number
  let rowCount: number
  let losePutResponse: boolean
  let operations: string[]

  beforeEach(() => {
    database = createSqliteD1()
    database.migrate()
    mocks.getDb.mockResolvedValue({ $client: database.client })
    rows = new Map([[1, ["Submission ID"]]])
    initialIdentityCount = 1
    rowCount = 1000
    losePutResponse = false
    operations = []
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
      const parsed = new URL(url)
      const path = decodeURIComponent(parsed.pathname)
      const method = init.method ?? "GET"
      if (path.endsWith(`/values/${QUORUM_SUBMISSIONS_TAB}!A:A`)) {
        const occupied = Math.max(initialIdentityCount, ...[...rows].filter(([, cells]) => cells[0]).map(([row]) => row))
        return Response.json({ values: Array.from({ length: occupied }, (_, index) => [rows.get(index + 1)?.[0] ?? "existing-id"]) })
      }
      if (parsed.searchParams.get("fields") === "sheets.properties") {
        return Response.json({ sheets: [{ properties: { sheetId: 0, title: QUORUM_SUBMISSIONS_TAB, gridProperties: { rowCount } } }] })
      }
      if (path.endsWith(":batchUpdate") && method === "POST") {
        const body = JSON.parse(String(init.body))
        const expansion = body.requests[0].appendDimension
        expect(expansion.dimension).toBe("ROWS")
        rowCount += expansion.length
        operations.push("expand")
        return Response.json({})
      }
      const range = path.match(/!A(\d+):V(\d+)$/)
      if (!range || range[1] !== range[2]) throw new Error(`Unexpected fixture request: ${method} ${path}`)
      const row = Number(range[1])
      // The fake provider rejects out-of-grid reads as the real API does.
      if (row > rowCount) return new Response("Grid limit exceeded", { status: 400 })
      operations.push(`${method}:${row}`)
      if (method === "GET") return Response.json({ values: rows.has(row) ? [rows.get(row)] : [] })
      if (method !== "PUT") throw new Error("Check-in must use a fixed-row PUT")
      expect(parsed.searchParams.get("valueInputOption")).toBe("RAW")
      rows.set(row, JSON.parse(String(init.body)).values[0])
      if (losePutResponse) {
        losePutResponse = false
        throw new Error("Response lost after committed PUT")
      }
      return Response.json({ updatedRows: 1 })
    }))
  })

  afterEach(() => {
    database.sqlite.close()
    vi.unstubAllGlobals()
  })

  it("reconciles a committed PUT with a lost response without another write or attendee row", async () => {
    losePutResponse = true
    await expect(appendQuorumSubmission(input)).rejects.toThrow("Response lost")
    rows.get(2)![15] = "voting" // Later admin correction must survive a retry.
    await appendQuorumSubmission({ ...input, submittedAt: "2026-09-20T12:05:00Z", registration: { ...input.registration, recaptchaToken: "fresh-captcha" } })
    expect(operations.filter(operation => operation.startsWith("PUT:"))).toEqual(["PUT:2"])
    expect(rows.size).toBe(2) // Header plus exactly one attendee.
    expect(rows.get(2)?.[0]).toBe(input.submissionId)
    expect(rows.get(2)?.[1]).toBe(input.submittedAt)
    expect(rows.get(2)?.[15]).toBe("voting")
    expect(database.sqlite.prepare("SELECT count(*) AS count FROM quorum_submission_reservations").get()?.count).toBe(1)
  })

  it.each([
    ["another submission ID", ["other-attendee"]],
    ["a non-ID cell", ["", "", "Manually entered fixture"]],
  ] as const)("refuses to overwrite %s in its reserved row", async (_label, occupied) => {
    // Existing reservation means even an occupied ID cannot shift this attempt to a different row.
    database.sqlite.prepare("INSERT INTO quorum_submission_reservations (event_key, submission_id, payload_hash, row_number, submitted_at) VALUES (?, ?, ?, 2, ?)")
      .run(input.event.eventKey, "unrelated-reservation", "unrelated", input.submittedAt)
    rows.set(3, [...occupied])
    // Keep the identity scan at row 1 to simulate an external edit after that scan.
    const originalFetch = globalThis.fetch
    vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => decodeURIComponent(String(url)).includes(`!A:A`)
      ? Promise.resolve(Response.json({ values: [["Submission ID"]] }))
      : originalFetch(url, init)))
    await expect(appendQuorumSubmission(input)).rejects.toThrow("Reserved check-in row was edited")
    expect(operations.some(operation => operation.startsWith("PUT:"))).toBe(false)
    expect(rows.get(3)).toEqual(occupied)
  })

  it("expands beyond 1000 rows before reading and writing the reserved range", async () => {
    initialIdentityCount = 1000
    await appendQuorumSubmission(input)
    expect(rowCount).toBe(1001)
    expect(operations).toEqual(["expand", "GET:1001", "PUT:1001"])
    expect(rows.get(1001)?.[0]).toBe(input.submissionId)
  })
})
