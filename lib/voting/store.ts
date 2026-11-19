import { MOTION_CHOICES, NO_CANDIDATE, type PublicVotingRoom, type RoomAdmin, type RoomCredential, type VotingChoice } from "./types"

type RoomRow = {
  id: string
  kind: "election" | "motion"
  title: string
  quorum_key: string
  election_id: string | null
  office_index: number | null
  ballot_number: number | null
  room_code: string
  version: number
  show_code: number
  status: "open" | "closed"
  results_published: number
}
type ChoiceRow = { choice_id: string; label: string; votes: number }
type SeatRow = { ordinal: number; seat_label: string }
type Counts = { eligible: number; received: number }
type OpenInput = { id: string; title: string; quorumKey: string; actor: string; seats: string[] }
type OpenElection = OpenInput & { electionId: string; revision: number; officeIndex: number; ballotNumber: number; choices: VotingChoice[] }

export class VotingConflict extends Error {}

const encoder = new TextEncoder()
const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("").toUpperCase()
const randomHex = (size: number) => hex(crypto.getRandomValues(new Uint8Array(size)))
export const normalizeVotingCode = (code: string) => code.toUpperCase().replace(/[\s-]/g, "")
const digestCode = async (code: string) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(code))))

async function credentialKey(seed: string) {
  return crypto.subtle.importKey("raw", encoder.encode(seed), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
}
async function seatCode(key: CryptoKey, ordinal: number) {
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(String(ordinal)))).slice(0, 8))
}

async function readChoices(db: D1Database, id: string) {
  const { results } = await db.prepare("SELECT choice_id, label, votes FROM voting_choices WHERE room_id = ? ORDER BY ordinal").bind(id).all<ChoiceRow>()
  return results.map(row => ({ id: row.choice_id, label: row.label, votes: row.votes }))
}

async function openRoom(db: D1Database, input: OpenInput, election?: OpenElection) {
  if (!input.seats.length) throw new VotingConflict("There are no eligible voting seats in this quorum.")
  const seed = randomHex(32)
  const key = await credentialKey(seed)
  const args = [input.id, election ? "election" : "motion", input.title, input.quorumKey, election?.electionId ?? null, election?.officeIndex ?? null, election?.ballotNumber ?? null, randomHex(4), seed, new Date().toISOString(), input.actor]
  const create = db.prepare(`
    INSERT INTO voting_rooms (id, kind, title, quorum_key, election_id, office_index, ballot_number, room_code, credential_seed, created_at, created_by)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    ${election ? "WHERE EXISTS (SELECT 1 FROM elections WHERE id = ? AND revision = ?)" : "WHERE TRUE"}
    ON CONFLICT DO NOTHING RETURNING id
  `).bind(...args, ...(election ? [election.electionId, election.revision] : []))

  // Match the seed so retries or a concurrent open cannot change an existing roster.
  const choiceInsert = db.prepare(`
    INSERT INTO voting_choices (room_id, choice_id, label, ordinal)
    SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM voting_rooms WHERE id = ? AND credential_seed = ?)
  `)
  const seatInsert = db.prepare(`
    INSERT INTO voting_credentials (room_id, ordinal, seat_label, code_hash)
    SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM voting_rooms WHERE id = ? AND credential_seed = ?)
  `)
  const choices = election?.choices ?? MOTION_CHOICES
  const seats = await Promise.all(input.seats.map(async (label, ordinal) => seatInsert.bind(input.id, ordinal, label, await digestCode(await seatCode(key, ordinal)), input.id, seed)))
  const [created] = await db.batch([create, ...choices.map((choice, ordinal) => choiceInsert.bind(input.id, choice.id, choice.label, ordinal, input.id, seed)), ...seats])
  const existing = await getRoomAdmin(db, input.id)
  if (!existing || (!created.results.length && (
    existing.kind !== (election ? "election" : "motion") || existing.title !== input.title || existing.quorumKey !== input.quorumKey ||
    (election && (existing.officeIndex !== election.officeIndex || existing.ballotNumber !== election.ballotNumber ||
      !(await db.prepare("SELECT id FROM voting_rooms WHERE id = ? AND election_id = ?").bind(input.id, election.electionId).first()))
  )))) throw new VotingConflict("The ballot changed, or a voting room is already open. Refresh the workspace and try again.")
  return existing
}

export function openMotionRoom(db: D1Database, input: OpenInput) {
  return openRoom(db, input)
}

export function openElectionRoom(db: D1Database, input: OpenElection) {
  return openRoom(db, input, input)
}

async function toAdmin(db: D1Database, room: RoomRow): Promise<RoomAdmin> {
  const [counts, results] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS eligible, COUNT(receipt) AS received FROM voting_credentials WHERE room_id = ?").bind(room.id).first<Counts>(),
    room.status === "closed" ? readChoices(db, room.id) : null,
  ])
  return {
    id: room.id, kind: room.kind, title: room.title, version: room.version, quorumKey: room.quorum_key, officeIndex: room.office_index,
    status: room.status, ballotNumber: room.ballot_number, roomCode: room.room_code, showCode: Boolean(room.show_code),
    resultsPublished: Boolean(room.results_published), eligible: counts?.eligible ?? 0, received: counts?.received ?? 0,
    results,
  }
}

export async function getRoomAdmin(db: D1Database, id: string) {
  const room = await db.prepare("SELECT * FROM voting_rooms WHERE id = ?").bind(id).first<RoomRow>()
  return room ? toAdmin(db, room) : null
}

export async function getElectionRooms(db: D1Database, electionId: string) {
  const { results } = await db.prepare(`
    SELECT * FROM voting_rooms AS r WHERE election_id = ? AND ballot_number = (
      SELECT MAX(ballot_number) FROM voting_rooms WHERE election_id = r.election_id AND office_index = r.office_index
    )
  `).bind(electionId).all<RoomRow>()
  return Promise.all(results.map(room => toAdmin(db, room)))
}

export async function listMotionRooms(db: D1Database) {
  const { results } = await db.prepare("SELECT * FROM voting_rooms WHERE kind = 'motion' ORDER BY created_at DESC LIMIT 100").all<RoomRow>()
  return results.map(room => ({ id: room.id, title: room.title, status: room.status, resultsPublished: Boolean(room.results_published) }))
}

export async function getPublicRoom(db: D1Database, pageId: string): Promise<PublicVotingRoom | null> {
  const room = await db.prepare(`
    SELECT * FROM voting_rooms WHERE id = ? OR election_id = ?
    ORDER BY status = 'open' DESC, created_at DESC LIMIT 1
  `).bind(pageId, pageId).first<RoomRow>()
  if (!room) return null
  const results = room.status === "open" || room.results_published ? await readChoices(db, room.id) : []
  return {
    id: room.id, title: room.title, kind: room.kind, status: room.status, ballotNumber: room.ballot_number,
    roomCode: room.status === "open" && room.show_code ? room.room_code : null,
    choices: room.status === "open" ? results.map(({ id, label }) => ({ id, label })) : [],
    results: room.status === "closed" && room.kind === "motion" && room.results_published ? results : null,
  }
}

export async function findRoomByCode(db: D1Database, code: string) {
  return db.prepare("SELECT COALESCE(election_id, id) AS pageId, id AS roomId FROM voting_rooms WHERE status = 'open' AND room_code = ?")
    .bind(code).first<{ pageId: string; roomId: string }>()
}

export async function getUnusedCredentials(db: D1Database, id: string): Promise<RoomCredential[]> {
  const [room, seats] = await db.batch<{ credential_seed: string } | SeatRow>([
    db.prepare("SELECT credential_seed FROM voting_rooms WHERE id = ? AND status = 'open'").bind(id),
    db.prepare("SELECT ordinal, seat_label FROM voting_credentials WHERE room_id = ? AND receipt IS NULL ORDER BY ordinal").bind(id),
  ])
  const seed = (room.results[0] as { credential_seed: string } | undefined)?.credential_seed
  if (!seed) throw new VotingConflict("This room is closed.")
  const key = await credentialKey(seed)
  return Promise.all((seats.results as SeatRow[]).map(async seat => {
    const code = await seatCode(key, seat.ordinal)
    return { label: seat.seat_label, code: code.match(/.{4}/g)!.join("-") }
  }))
}

export async function manageRoom(db: D1Database, id: string, operation: "rotate" | "show" | "hide" | "close" | "publish" | "unpublish", actor: string) {
  switch (operation) {
    case "rotate":
      await db.prepare("UPDATE voting_rooms SET room_code = ?, version = version + 1 WHERE id = ? AND status = 'open'").bind(randomHex(4), id).run()
      break
    case "show":
    case "hide":
      await db.prepare("UPDATE voting_rooms SET show_code = ?, version = version + 1 WHERE id = ? AND status = 'open'").bind(Number(operation === "show"), id).run()
      break
    case "close":
      await db.prepare("UPDATE voting_rooms SET status = 'closed', closed_at = ?, closed_by = ?, show_code = 0, version = version + 1 WHERE id = ? AND status = 'open'")
        .bind(new Date().toISOString(), actor, id).run()
      break
    case "publish":
    case "unpublish":
      await db.prepare("UPDATE voting_rooms SET results_published = ?, version = version + 1 WHERE id = ? AND kind = 'motion' AND status = 'closed'")
        .bind(Number(operation === "publish"), id).run()
      break
  }
  const room = await getRoomAdmin(db, id)
  if (!room) throw new VotingConflict("Voting room not found.")
  return room
}

export async function castVote(db: D1Database, input: { id: string; roomCode: string; voterCode: string; choiceId: string; receipt: string }) {
  const hash = await digestCode(input.voterCode)
  const [, check] = await db.batch<{ receipt: string }>([
    db.prepare(`
      INSERT INTO voting_cast_input (room_id, code_hash, choice_id, receipt)
      SELECT r.id, cr.code_hash, c.choice_id, ? FROM voting_rooms r
      JOIN voting_credentials cr ON cr.room_id = r.id AND cr.code_hash = ? AND cr.receipt IS NULL
      JOIN voting_choices c ON c.room_id = r.id AND c.choice_id = ?
      WHERE r.id = ? AND r.status = 'open' AND r.room_code = ?
    `).bind(input.receipt, hash, input.choiceId, input.id, input.roomCode),
    db.prepare("SELECT receipt FROM voting_credentials WHERE room_id = ? AND code_hash = ? AND receipt = ?")
      .bind(input.id, hash, input.receipt),
  ])
  return check.results.length === 1
}

export async function getElectionBallotRoom(db: D1Database, electionId: string, officeIndex: number, ballotNumber: number) {
  const room = await db.prepare(`
    SELECT id, status FROM voting_rooms WHERE election_id = ? AND office_index = ? AND ballot_number = ?
  `).bind(electionId, officeIndex, ballotNumber).first<Pick<RoomRow, "id" | "status">>()
  if (!room) return null
  return { ...room, counts: room.status === "closed" ? new Map((await readChoices(db, room.id)).map(choice => [choice.id, choice.votes])) : new Map<string, number>() }
}

export async function publicElectionRoom(db: D1Database, electionId: string) {
  const room = await db.prepare("SELECT room_code, show_code FROM voting_rooms WHERE election_id = ? AND status = 'open'").bind(electionId).first<Pick<RoomRow, "room_code" | "show_code">>()
  return room ? { code: room.show_code ? room.room_code : null } : null
}

export { NO_CANDIDATE }
