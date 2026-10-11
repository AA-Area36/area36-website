// @vitest-environment node
import { readFileSync } from "node:fs"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import { createSqliteD1 } from "@/tests/helpers/sqlite-d1"
import { createElection, getElection, mutateElection } from "./store"
import { officeFormatting, officeRows, syncElection } from "./google"

vi.mock("@/lib/google/user-drive-auth", () => ({ getQuorumDriveOwnerAccessToken: vi.fn(async () => "test-token") }))
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } })

describe("background election Sheets sync", () => {
  let database: ReturnType<typeof createSqliteD1>
  let env: CloudflareEnv
  const input = { id: "991d17cd-2c69-4825-bd38-e44c61783f04", title: "Election", date: "2026-10-10" }
  beforeEach(async () => {
    database = createSqliteD1()
    database.sqlite.exec(readFileSync(new URL("../db/migrations/0032_third_legacy_elections.sql", import.meta.url), "utf8"))
    env = { DB: database.client, GDRIVE_ELECTIONS_FOLDER_ID: "election-folder" } as CloudflareEnv
    await createElection(database.client, input, "teller")
  })
  afterEach(() => { database.sqlite.close(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
  it("creates a private marked sheet, writes typed formulas, and acknowledges the exact saved revision", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ files: [] }))
      .mockResolvedValueOnce(json({ id: "sheet-id" }))
      .mockResolvedValueOnce(json({ sheets: [{ properties: { sheetId: 0, title: "Sheet1" } }] }))
      .mockResolvedValueOnce(json({ replies: [] }))
    vi.stubGlobal("fetch", fetchMock)
    await syncElection(env, input.id)
    expect(await getElection(database.client, input.id)).toMatchObject({ spreadsheetId: "sheet-id", syncedRevision: 0, syncError: null })
    const createBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(createBody).toMatchObject({ parents: ["election-folder"], appProperties: { area36ElectionId: input.id } })
    expect(createBody.permissions).toBeUndefined()
    const requests = JSON.parse(fetchMock.mock.calls[3][1].body).requests
    expect(requests.filter((request: { addSheet?: unknown }) => request.addSheet)).toHaveLength(8)
    expect(requests).toContainEqual({ deleteSheet: { sheetId: 0 } })
    expect(requests.filter((request: { updateCells?: unknown }) => request.updateCells)).toHaveLength(8)
  })
  it("keeps names as literal strings and reproduces combined totals and shares as auditable formulas", async () => {
    const election = await mutateElection(database.client, { id: input.id, revision: 0, commandId: "names", command: { type: "candidates", officeIndex: 0, names: ["=IMPORTXML(\"bad\")", "Blair"] } }, "teller")
    const rows = officeRows(election.state.offices[0])
    expect(rows[2].values[0]).toEqual({ userEnteredValue: { stringValue: '=IMPORTXML("bad")' } })
    expect(rows[2].values[3]).toEqual({ userEnteredValue: { formulaValue: '=IF(COUNT(B3:C3)=0,"",SUM(B3:C3))' } })
    expect(rows[2].values[4]).toEqual({ userEnteredValue: { formulaValue: '=IF(D$43>0,D3/D$43,0)' } })
    expect(rows[46].values[3]).toEqual({ userEnteredValue: { formulaValue: '=IF(D43>0,ROUNDUP(D43*2/3,0),"")' } })
  })
  it("separates ballots with merged headers and stronger dividers, without repeated merges", () => {
    const first = officeFormatting(101, 4) as Array<{ mergeCells?: { range: { startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number } }; updateBorders?: { innerHorizontal?: { style: string }; left?: { style: string } } }>
    expect(first.filter(request => request.mergeCells)).toHaveLength(5)
    expect(first.some(request => request.updateBorders?.innerHorizontal?.style === "SOLID")).toBe(true)
    expect(first.some(request => request.updateBorders?.left?.style === "SOLID_MEDIUM")).toBe(true)
    const merged = first.flatMap(request => request.mergeCells ? [request.mergeCells.range] : [])
    const second = officeFormatting(101, 4, merged) as Array<{ mergeCells?: unknown }>
    expect(second.some(request => request.mergeCells)).toBe(false)
  })
  it("includes X in the sheet percentage denominator and exposes expected count reconciliation", async () => {
    const election = await mutateElection(database.client, { id: input.id, revision: 0, commandId: "metrics", command: { type: "candidates", officeIndex: 0, names: ["Alex", "Blair"] } }, "teller")
    election.state.offices[0].expectedVotes = 100
    election.state.offices[0].draftNoCandidate = { inPerson: 5, online: 5 }
    const rows = officeRows(election.state.offices[0])
    expect(rows[42].values[3]).toEqual({ userEnteredValue: { formulaValue: "=SUM(D3:D42)+D44" } })
    expect(rows[43].values[1]).toEqual({ userEnteredValue: { numberValue: 5 } })
    expect(rows[43].values[4]).toEqual({ userEnteredValue: { formulaValue: "=IF(D$43>0,D44/D$43,0)" } })
    expect(rows[44].values[3]).toEqual({ userEnteredValue: { numberValue: 100 } })
    expect(rows[45].values[3]).toEqual({ userEnteredValue: { formulaValue: '=IF(ISNUMBER(D45),D43-D45,"")' } })
  })
  it("preserves pending work during a Google outage and never acknowledges a newer unsynced edit", async () => {
    database.sqlite.prepare("UPDATE elections SET spreadsheet_id = 'existing'").run()
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ sheets: [{ properties: { sheetId: 100, title: "Summary" } }] })).mockImplementationOnce(async () => {
      await mutateElection(database.client, { id: input.id, revision: 0, commandId: "during-sync", command: { type: "candidates", officeIndex: 0, names: ["Alex", "Blair"] } }, "teller")
      return json({ replies: [] })
    })
    vi.stubGlobal("fetch", fetchMock)
    await syncElection(env, input.id)
    expect(await getElection(database.client, input.id)).toMatchObject({ revision: 1, syncedRevision: 0 })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 503)))
    await syncElection(env, input.id)
    expect(await getElection(database.client, input.id)).toMatchObject({ revision: 1, syncedRevision: 0, syncError: expect.stringContaining("Your votes are saved") })
    expect(database.sqlite.prepare("SELECT sync_lease_until FROM elections").get()?.sync_lease_until).toBe(0)
  })
  it("reconciles a lost create response without creating a duplicate sheet", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ files: [] })).mockRejectedValueOnce(new TypeError("network interrupted"))
    vi.stubGlobal("fetch", fetchMock)
    await syncElection(env, input.id)
    expect(database.sqlite.prepare("SELECT drive_creation_attempted FROM elections").get()?.drive_creation_attempted).toBe(1)
    fetchMock.mockResolvedValueOnce(json({ files: [{ id: "created-but-response-lost" }] })).mockResolvedValueOnce(json({ sheets: [{ properties: { sheetId: 0, title: "Sheet1" } }] })).mockResolvedValueOnce(json({ replies: [] }))
    await syncElection(env, input.id)
    expect(await getElection(database.client, input.id)).toMatchObject({ spreadsheetId: "created-but-response-lost", syncedRevision: 0 })
    expect(fetchMock.mock.calls.filter(call => String(call[0]).includes("drive/v3/files?") && call[1]?.method === "POST")).toHaveLength(1)
  })
  it("does not repeat an unresolved create and serializes concurrent syncs", async () => {
    database.sqlite.prepare("UPDATE elections SET drive_creation_attempted = 1").run()
    const fetchMock = vi.fn().mockResolvedValue(json({ files: [] }))
    vi.stubGlobal("fetch", fetchMock)
    await Promise.all([syncElection(env, input.id), syncElection(env, input.id)])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await getElection(database.client, input.id)).toMatchObject({ syncedRevision: -1, syncError: expect.stringContaining("reconcile Drive") })
  })
})
