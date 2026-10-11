import { getQuorumDriveOwnerAccessToken } from "@/lib/google/user-drive-auth"
import { OFFICE_NAMES, PROCEDURE_URL, MAX_CANDIDATES, type ElectionRecord, type Office } from "./model"
import { getElection } from "./store"

const DRIVE = "https://www.googleapis.com/drive/v3"
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets"
const TOTAL_ROW = MAX_CANDIDATES + 3
const TABS = ["Summary", ...OFFICE_NAMES, "History"]
type Cell = { userEnteredValue?: { stringValue?: string; numberValue?: number; formulaValue?: string } }
type Sheet = { properties: { sheetId: number; title: string }; merges?: { startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number }[] }
class GoogleError extends Error {
  constructor(readonly status: number) { super(`Google request failed (${status})`) }
}
async function request<T>(env: CloudflareEnv, url: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = await getQuorumDriveOwnerAccessToken(!retry, env)
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(12_000),
  })
  if (response.status === 401 && retry) return request<T>(env, url, init, false)
  if (!response.ok) throw new GoogleError(response.status)
  return response.json() as Promise<T>
}
function text(value: string): Cell { return { userEnteredValue: { stringValue: value } } }
function number(value: number): Cell { return { userEnteredValue: { numberValue: value } } }
function formula(value: string): Cell { return { userEnteredValue: { formulaValue: value } } }
function row(values: Array<string | number>) { return { values: values.map(value => typeof value === "number" ? number(value) : text(value)) } }

async function ensureSpreadsheet(env: CloudflareEnv, election: ElectionRecord, attempted: boolean): Promise<string> {
  const params = new URLSearchParams({
    q: `trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet' and appProperties has { key='area36ElectionId' and value='${election.id}' }`,
    fields: "files(id)", pageSize: "2", supportsAllDrives: "true", includeItemsFromAllDrives: "true",
  })
  const found = await request<{ files: { id: string }[] }>(env, `${DRIVE}/files?${params}`)
  if (found.files.length > 1) throw new Error("More than one election sheet was found. An administrator must reconcile Drive.")
  if (found.files[0]) return found.files[0].id
  if (attempted) throw new Error("Sheet creation is awaiting confirmation. An administrator must reconcile Drive before another sheet is created.")
  await env.DB.prepare("UPDATE elections SET drive_creation_attempted = 1 WHERE id = ?").bind(election.id).run()
  try {
    const file = await request<{ id: string }>(env, `${DRIVE}/files?fields=id&supportsAllDrives=true`, {
      method: "POST", body: JSON.stringify({
        name: `${election.state.date} — ${election.state.title} — Third Legacy`,
        mimeType: "application/vnd.google-apps.spreadsheet",
        ...(env.GDRIVE_ELECTIONS_FOLDER_ID ? { parents: [env.GDRIVE_ELECTIONS_FOLDER_ID] } : {}),
        appProperties: { area36ElectionId: election.id, area36Feature: "third-legacy-v1" },
      }),
    })
    return file.id
  } catch (error) {
    // Do not repeat creates with an unknown outcome. The next sync finds the
    // marked file; definitive upstream rejections permit a new attempt.
    if (error instanceof GoogleError && [400, 401, 403, 404, 429].includes(error.status)) {
      await env.DB.prepare("UPDATE elections SET drive_creation_attempted = 0 WHERE id = ?").bind(election.id).run()
    }
    throw error
  }
}

export function officeRows(office: Office) {
  const rows = Array.from({ length: 55 }, () => ({ values: [] as Cell[] }))
  rows[0].values = [text(office.name)]
  rows[1].values = [text("Candidate")]
  for (let ballot = 0; ballot < 5; ballot++) {
    rows[0].values.push(text(`Ballot ${ballot + 1}`), text(""), text(""), text(""))
    rows[1].values.push(text("In person"), text("Online"), text("Total votes"), text("Share"))
  }
  rows[1].values.push(text("Status"))
  const sources = Array.from({ length: 5 }, (_, ballot) => office.ballots[ballot] ?? (office.status === "balloting" && ballot === office.ballots.length ? { votes: office.draft, noCandidate: office.draftNoCandidate, expectedVotes: office.expectedVotes } : null))
  office.candidates.forEach((candidate, index) => {
    const cellRow = index + 3
    rows[index + 2].values = [text(candidate.name)]
    sources.forEach((source, ballot) => {
      const vote = source?.votes.find(vote => vote.candidateId === candidate.id)
      const inPersonCol = String.fromCharCode(66 + ballot * 4)
      const onlineCol = String.fromCharCode(67 + ballot * 4)
      const totalCol = String.fromCharCode(68 + ballot * 4)
      rows[index + 2].values.push(vote ? number(vote.inPerson) : text(""), vote ? number(vote.online) : text(""),
        formula(`=IF(COUNT(${inPersonCol}${cellRow}:${onlineCol}${cellRow})=0,"",SUM(${inPersonCol}${cellRow}:${onlineCol}${cellRow}))`),
        formula(`=IF(${totalCol}$${TOTAL_ROW}>0,${totalCol}${cellRow}/${totalCol}$${TOTAL_ROW},0)`))
    })
    rows[index + 2].values.push(text(office.winnerId === candidate.id ? `Elected by ${office.electionMethod}` : office.eligibleIds.includes(candidate.id) ? "Remaining" : "Withdrawn"))
  })
  const labels = ["Total votes", "X / no candidate", "Expected votes", "Difference", "Two-thirds needed", "Reconciliation"]
  labels.forEach((label, offset) => { rows[TOTAL_ROW - 1 + offset].values = [text(label)] })
  sources.forEach((source, ballot) => {
    const first = String.fromCharCode(66 + ballot * 4)
    const second = String.fromCharCode(67 + ballot * 4)
    const total = String.fromCharCode(68 + ballot * 4)
    for (let offset = 0; offset < 4; offset++) {
      const column = String.fromCharCode(66 + ballot * 4 + offset)
      rows[42].values.push(formula(`=SUM(${column}3:${column}42)+${column}44`))
      rows[43].values.push(offset === 0 ? source ? number(source.noCandidate.inPerson) : text("") : offset === 1 ? source ? number(source.noCandidate.online) : text("") : offset === 2 ? formula(`=SUM(${first}44:${second}44)`) : formula(`=IF(${total}$43>0,${total}44/${total}$43,0)`))
      rows[44].values.push(offset === 2 && source?.expectedVotes != null ? number(source.expectedVotes) : text(""))
      rows[45].values.push(offset === 2 ? formula(`=IF(ISNUMBER(${total}45),${total}43-${total}45,"")`) : text(""))
      rows[46].values.push(offset === 2 ? formula(`=IF(${total}43>0,ROUNDUP(${total}43*2/3,0),"")`) : text(""))
      rows[47].values.push(offset === 2 && source ? formula(`=IF(ISNUMBER(${total}45),IF(${total}46=0,"Aligned","Review count"),"Expected not set")`) : text(""))
    }
  })
  rows[49] = row(["Result", office.winnerId ? office.candidates.find(candidate => candidate.id === office.winnerId)?.name ?? "" : "Not yet elected", office.status])
  rows[50] = row(["Fifth ballot", office.fifthBallotApproved === null ? "Not decided" : office.fifthBallotApproved ? "Motion carried" : "Motion defeated"])
  return rows
}

export function officeFormatting(sheetId: number, candidateCount: number, merges: Sheet["merges"] = []) {
  const thin = { style: "SOLID", color: { red: 0.79, green: 0.83, blue: 0.88 } }
  const divider = { style: "SOLID_MEDIUM", color: { red: 0.39, green: 0.49, blue: 0.61 } }
  const requests: unknown[] = [
    { updateBorders: { range: { sheetId, startRowIndex: 1, endRowIndex: candidateCount + 2, startColumnIndex: 0, endColumnIndex: 22 }, top: thin, bottom: thin, left: thin, right: thin, innerHorizontal: thin, innerVertical: thin } },
    { updateBorders: { range: { sheetId, startRowIndex: 42, endRowIndex: 48, startColumnIndex: 0, endColumnIndex: 21 }, top: divider, bottom: thin, innerHorizontal: thin, innerVertical: thin } },
    { updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: 2, endIndex: 42 }, properties: { hiddenByUser: false }, fields: "hiddenByUser" } },
  ]
  if (candidateCount < MAX_CANDIDATES) requests.push({ updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: candidateCount + 2, endIndex: 42 }, properties: { hiddenByUser: true }, fields: "hiddenByUser" } })
  for (let ballot = 0; ballot < 5; ballot++) {
    const start = 1 + ballot * 4
    const range = { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: start, endColumnIndex: start + 4 }
    if (!merges?.some(merge => (merge.startRowIndex ?? 0) === 0 && merge.endRowIndex === 1 && merge.startColumnIndex === start && merge.endColumnIndex === start + 4)) requests.push({ mergeCells: { range, mergeType: "MERGE_ALL" } })
    requests.push(
      { repeatCell: { range, cell: { userEnteredFormat: { horizontalAlignment: "CENTER", backgroundColor: { red: 0.08, green: 0.22, blue: 0.36 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: "userEnteredFormat" } },
      { repeatCell: { range: { ...range, startRowIndex: 1, endRowIndex: 2 }, cell: { userEnteredFormat: { horizontalAlignment: "CENTER", wrapStrategy: "WRAP", backgroundColor: { red: 0.92, green: 0.95, blue: 0.98 }, textFormat: { bold: true, foregroundColor: { red: 0.08, green: 0.22, blue: 0.36 } } } }, fields: "userEnteredFormat" } },
      { repeatCell: { range: { sheetId, startRowIndex: 2, endRowIndex: 44, startColumnIndex: start + 3, endColumnIndex: start + 4 }, cell: { userEnteredFormat: { numberFormat: { type: "PERCENT", pattern: "0.0%" } } }, fields: "userEnteredFormat.numberFormat" } },
      { updateBorders: { range: { sheetId, startRowIndex: 0, endRowIndex: 48, startColumnIndex: start, endColumnIndex: start + 4 }, left: divider, right: divider } },
    )
  }
  return requests
}

async function writeSnapshot(env: CloudflareEnv, election: ElectionRecord, spreadsheetId: string) {
  const metadata = await request<{ sheets: Sheet[] }>(env, `${SHEETS}/${spreadsheetId}?fields=sheets(properties(sheetId,title),merges)`)
  const requests: unknown[] = []
  const ids = new Map(metadata.sheets.map(sheet => [sheet.properties.title, sheet.properties.sheetId]))
  const occupied = new Set(ids.values())
  for (const title of TABS) {
    if (ids.has(title)) continue
    let sheetId = 100 + TABS.indexOf(title)
    while (occupied.has(sheetId)) sheetId++
    ids.set(title, sheetId)
    occupied.add(sheetId)
    requests.push({ addSheet: { properties: { sheetId, title, gridProperties: { rowCount: title === "History" ? 202 : 60, columnCount: 22, frozenRowCount: title === "Summary" ? 0 : 2, frozenColumnCount: title === "Summary" ? 0 : 1, hideGridlines: true } } } })
    requests.push({ repeatCell: { range: { sheetId, startRowIndex: title === "Summary" ? 0 : 1, endRowIndex: 2 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.08, green: 0.22, blue: 0.36 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, wrapStrategy: "WRAP" } }, fields: "userEnteredFormat" } })
    requests.push({ updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 210 }, fields: "pixelSize" } })
    requests.push({ updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 22 }, properties: { pixelSize: title === "Summary" || title === "History" ? 200 : 95 }, fields: "pixelSize" } })
    if (OFFICE_NAMES.some(name => name === title)) {
      for (let ballot = 0; ballot < 5; ballot++) {
        requests.push({ repeatCell: { range: { sheetId, startRowIndex: 2, endRowIndex: TOTAL_ROW, startColumnIndex: 4 + ballot * 4, endColumnIndex: 5 + ballot * 4 }, cell: { userEnteredFormat: { numberFormat: { type: "PERCENT", pattern: "0.0%" } } }, fields: "userEnteredFormat.numberFormat" } })
        requests.push({ addConditionalFormatRule: { index: 0, rule: { ranges: [{ sheetId, startRowIndex: 2, endRowIndex: TOTAL_ROW - 1, startColumnIndex: 4 + ballot * 4, endColumnIndex: 5 + ballot * 4 }], booleanRule: { condition: { type: "NUMBER_GREATER_THAN_EQ", values: [{ userEnteredValue: "=2/3" }] }, format: { backgroundColor: { red: 0.82, green: 0.94, blue: 0.87 } } } } } })
      }
    }
  }
  if (metadata.sheets.length === 1 && metadata.sheets[0].properties.title === "Sheet1") requests.push({ deleteSheet: { sheetId: metadata.sheets[0].properties.sheetId } })
  const update = (title: string, rows: { values: Cell[] }[], rowCount: number) => requests.push({ updateCells: { range: { sheetId: ids.get(title), startRowIndex: 0, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: 22 }, rows, fields: "userEnteredValue" } })
  update("Summary", [
    row([election.state.title]), row(["Third Legacy elections", election.state.date]), row(["Revision", election.revision]), row(["Saved at", election.updatedAt]),
    row(["Office", "Result", "Method", "Recorded ballots", "Status"]),
    ...election.state.offices.map(office => row([office.name, office.candidates.find(candidate => candidate.id === office.winnerId)?.name ?? "", office.electionMethod ?? "", office.ballots.length, office.status])),
    row(["Expected votes", election.state.expectedVotes ?? "Not set"]), row(["Procedure source", PROCEDURE_URL]), row(["Reference workbook", "Election_Template.xlsx"]), row(["Editing", "Use the election page to record votes. Sheet cells are refreshed from the saved election."]),
  ], 20)
  election.state.offices.forEach(office => {
    update(office.name, officeRows(office), 55)
    const sheetId = ids.get(office.name)!
    requests.push(...officeFormatting(sheetId, office.candidates.length, metadata.sheets.find(sheet => sheet.properties.sheetId === sheetId)?.merges))
  })
  const history = await env.DB.prepare("SELECT revision, command_json, saved_at, saved_by FROM election_revisions WHERE election_id = ? AND revision <= ? ORDER BY revision DESC LIMIT 200").bind(election.id, election.revision).all<{ revision: number; command_json: string; saved_at: string; saved_by: string }>()
  update("History", [row(["Latest 200 saved changes"]), row(["Revision", "Saved at", "Saved by", "Action", "Office", "Ballot", "Correction reason"]), ...history.results.toReversed().map(change => {
    const command = JSON.parse(change.command_json)
    return row([change.revision, change.saved_at, change.saved_by, command.type, OFFICE_NAMES[command.officeIndex] ?? "", command.ballotNumber ?? "", command.reason ?? ""])
  })], 202)
  await request(env, `${SHEETS}/${spreadsheetId}:batchUpdate`, { method: "POST", body: JSON.stringify({ requests }) })
}

/** A durable pending revision and a per-election lease survive request failures. */
export async function syncElection(env: CloudflareEnv, id: string): Promise<void> {
  const lease = Date.now() + 180_000
  const claimed = await env.DB.prepare("UPDATE elections SET sync_lease_until = ? WHERE id = ? AND sync_lease_until < ? AND synced_revision < revision RETURNING drive_creation_attempted")
    .bind(lease, id, Date.now()).first<{ drive_creation_attempted: number }>()
  if (!claimed) return
  try {
    const election = await getElection(env.DB, id)
    if (!election) return
    const spreadsheetId = election.spreadsheetId ?? await ensureSpreadsheet(env, election, !!claimed.drive_creation_attempted)
    await env.DB.prepare("UPDATE elections SET spreadsheet_id = ? WHERE id = ?").bind(spreadsheetId, id).run()
    await writeSnapshot(env, election, spreadsheetId)
    await env.DB.prepare("UPDATE elections SET synced_revision = ?, sync_error = NULL WHERE id = ? AND sync_lease_until = ?").bind(election.revision, id, lease).run()
  } catch (error) {
    const needsAuthorization = error instanceof Error && (error.message.includes("has not connected Google Drive") || error.message.includes("Failed to refresh Quorum Drive owner token"))
    const message = error instanceof GoogleError ? "Google Drive is unavailable. Your votes are saved; retry the Drive sync." : error instanceof Error && error.message.includes("reconcile Drive") ? error.message : needsAuthorization ? "Reconnect the Area Google Drive account. Your votes are saved here." : "Connect the Area Google Drive account or retry syncing. Your votes are saved."
    await env.DB.prepare("UPDATE elections SET sync_error = ? WHERE id = ? AND sync_lease_until = ?").bind(message, id, lease).run()
    console.error("Election Drive sync failed", { electionId: id, status: error instanceof GoogleError ? error.status : needsAuthorization ? "authorization" : "unavailable" })
  } finally {
    await env.DB.prepare("UPDATE elections SET sync_lease_until = 0 WHERE id = ? AND sync_lease_until = ?").bind(id, lease).run()
  }
}
export async function processPendingElectionSync(env: CloudflareEnv): Promise<void> {
  const pending = await env.DB.prepare("SELECT id FROM elections WHERE synced_revision < revision AND sync_lease_until < ? ORDER BY updated_at ASC LIMIT 10").bind(Date.now()).all<{ id: string }>()
  for (const election of pending.results) await syncElection(env, election.id)
}
