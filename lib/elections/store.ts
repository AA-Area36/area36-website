import { getElectionBallotRoom, NO_CANDIDATE } from "@/lib/voting/store"
import { applyCommand, createElectionState, reviewOffice, type ElectionCommand, type ElectionRecord, type ElectionState } from "./model"

type ElectionRow = { id: string; state_json: string; revision: number; updated_at: string; spreadsheet_id: string | null; synced_revision: number; sync_error: string | null }
function parse(row: ElectionRow): ElectionRecord {
  return { id: row.id, state: JSON.parse(row.state_json) as ElectionState, revision: row.revision, updatedAt: row.updated_at, spreadsheetId: row.spreadsheet_id, syncedRevision: row.synced_revision, syncError: row.sync_error }
}
export async function getElection(db: D1Database, id: string): Promise<ElectionRecord | null> {
  const row = await db.prepare("SELECT * FROM elections WHERE id = ?").bind(id).first<ElectionRow>()
  return row ? parse(row) : null
}
export async function listElections(db: D1Database): Promise<ElectionRecord[]> {
  const rows = await db.prepare("SELECT * FROM elections ORDER BY updated_at DESC LIMIT 100").all<ElectionRow>()
  return rows.results.map(parse)
}
export async function createElection(db: D1Database, input: { id: string; title: string; date: string }, actor: string): Promise<ElectionRecord> {
  const state = createElectionState(input.title, input.date)
  const command = JSON.stringify({ type: "create", title: input.title, date: input.date })
  await db.prepare("INSERT INTO elections (id, state_json, updated_at, updated_by, command_id, command_json) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING")
    .bind(input.id, JSON.stringify(state), new Date().toISOString(), actor, input.id, command).run()
  const original = await db.prepare("SELECT command_json FROM election_revisions WHERE election_id = ? AND revision = 0").bind(input.id).first<{ command_json: string }>()
  if (original?.command_json !== command) throw new Error("This election creation attempt has different details. Reload the election list.")
  const record = await getElection(db, input.id)
  if (!record) throw new Error("Election was not saved.")
  return record
}
export class ElectionConflict extends Error {
  constructor() { super("This election changed in another tab. Reload before entering more totals.") }
}
export async function mutateElection(db: D1Database, input: { id: string; revision: number; commandId: string; command: ElectionCommand }, actor: string): Promise<ElectionRecord> {
  const commandJson = JSON.stringify(input.command)
  const prior = await db.prepare("SELECT election_id, command_json FROM election_revisions WHERE command_id = ?").bind(input.commandId).first<{ election_id: string; command_json: string }>()
  if (prior) {
    if (prior.election_id !== input.id || prior.command_json !== commandJson) throw new Error("This save attempt has different details.")
    const existing = await getElection(db, input.id)
    if (!existing) throw new Error("Election not found.")
    return existing
  }
  const record = await getElection(db, input.id)
  if (!record) throw new Error("Election not found.")
  if (record.revision !== input.revision) throw new ElectionConflict()
  const now = new Date().toISOString()
  const { officeIndex, type } = input.command
  const office = record.state.offices[officeIndex]
  const ballotNumber = office ? office.ballots.length + 1 : 0
  const checkRoom = office && ["draft", "finalize", "candidates", "correct"].includes(type)
  const room = checkRoom ? await getElectionBallotRoom(db, input.id, officeIndex, ballotNumber) : null
  let command = input.command
  if (room && (command.type === "draft" || command.type === "finalize")) {
    if (room.status === "open" && command.type === "finalize") throw new Error("Close online voting before recording this ballot.")
    command = {
      ...command,
      votes: command.votes.map(vote => ({ ...vote, online: room.counts.get(vote.candidateId) ?? 0 })),
      noCandidate: { inPerson: command.noCandidate?.inPerson ?? office.draftNoCandidate.inPerson, online: room.counts.get(NO_CANDIDATE) ?? 0 },
    }
  }
  const next = applyCommand(record.state, command, actor, now)
  if (room && (type === "candidates" || type === "correct")) {
    const after = next.offices[officeIndex]
    if (type === "candidates" || after.status !== "balloting" || JSON.stringify(after.eligibleIds) !== JSON.stringify(office.eligibleIds) || reviewOffice(after).issues.length) {
      throw new Error("Finish recording the current online ballot before changing its candidates or election outcome.")
    }
  }
  // Opening a room checks the same election revision. Guard the reverse race too:
  // a room that opens or closes during this save must be taken into account.
  const guard = checkRoom ? `AND COALESCE((SELECT id || ':' || status FROM voting_rooms
    WHERE election_id = elections.id AND office_index = ? AND ballot_number = ?), '') = ?` : ""
  const ballotGuard = checkRoom ? [officeIndex, ballotNumber, room ? `${room.id}:${room.status}` : ""] : []
  const saved = await db.prepare(`UPDATE elections SET state_json = ?, revision = revision + 1, updated_at = ?, updated_by = ?, command_id = ?, command_json = ?, sync_error = NULL WHERE id = ? AND revision = ? ${guard} RETURNING *`)
    .bind(JSON.stringify(next), now, actor, input.commandId, commandJson, input.id, input.revision, ...ballotGuard).first<ElectionRow>()
  if (!saved) {
    const retry = await db.prepare("SELECT command_json FROM election_revisions WHERE election_id = ? AND command_id = ?").bind(input.id, input.commandId).first<{ command_json: string }>()
    if (retry?.command_json === commandJson) return (await getElection(db, input.id))!
    throw new ElectionConflict()
  }
  return parse(saved)
}
