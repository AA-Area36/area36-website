import { z } from "zod"

export const OFFICE_NAMES = ["Delegate", "Alt Delegate", "Chair", "Alt Chair", "Secretary", "Treasurer"] as const
export const PROCEDURE_URL = "https://www.aa.org/sites/default/files/literature/BM-31_2024-2026_AA_Service_Manual_12-2024.pdf"
export const MAX_CANDIDATES = 40
const count = z.number().int().min(0).max(100_000)
const channelsSchema = z.object({ inPerson: count, online: count })
export const voteSchema = channelsSchema.extend({ candidateId: z.string() })
export type Vote = z.infer<typeof voteSchema>
export type VoteChannels = z.infer<typeof channelsSchema>
export const emptyChannels = (): VoteChannels => ({ inPerson: 0, online: 0 })
export type Candidate = { id: string; name: string }
export type Ballot = {
  number: number; votes: Vote[]; expectedVotes: number | null; noCandidate: VoteChannels
  savedAt: string; savedBy: string
}
export type Office = {
  name: typeof OFFICE_NAMES[number]
  candidates: Candidate[]; eligibleIds: string[]; ballots: Ballot[]; draft: Vote[]
  expectedVotes: number | null; draftNoCandidate: VoteChannels
  status: "setup" | "balloting" | "motion" | "hat" | "elected"
  winnerId: string | null; electionMethod: "ballot" | "hat" | null; fifthBallotApproved: boolean | null
}
export type ElectionState = {
  title: string; date: string; expectedVotes: number | null; offices: Office[]
  publicDisplay?: { enabled: boolean; officeIndex: number }
}
export type ElectionRecord = {
  id: string; revision: number; state: ElectionState; updatedAt: string
  spreadsheetId: string | null; syncedRevision: number; syncError: string | null
}
export const createElectionSchema = z.object({
  id: z.string().uuid(), title: z.string().trim().min(1, "Enter an election title.").max(150),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid election date.").refine(value => {
    const parsed = new Date(`${value}T12:00:00Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  }, "Enter a valid date."),
})
const officeIndex = z.number().int().min(0).max(OFFICE_NAMES.length - 1)
const votes = z.array(voteSchema).min(1).max(MAX_CANDIDATES)
const metrics = { expectedVotes: count.min(1).nullable().optional(), noCandidate: channelsSchema.optional() }
const reason = z.string().trim().min(5, "Describe the correction (at least 5 characters).").max(500)
export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("display"), officeIndex, enabled: z.boolean() }),
  z.object({ type: z.literal("candidates"), officeIndex, names: z.array(z.string().trim().min(1).max(100).refine(name => !/[\r\n]/.test(name), "Use one input for each candidate.")).min(1, "Enter at least one candidate.").max(MAX_CANDIDATES) }),
  z.object({ type: z.literal("draft"), officeIndex, votes, ...metrics }),
  z.object({ type: z.literal("finalize"), officeIndex, votes, ...metrics }),
  z.object({ type: z.literal("correct"), officeIndex, ballotNumber: z.number().int().min(1).max(5), votes, ...metrics, reason }),
  z.object({ type: z.literal("motion"), officeIndex, approved: z.boolean() }),
  z.object({ type: z.literal("hat"), officeIndex, candidateId: z.string() }),
])
export type ElectionCommand = z.infer<typeof commandSchema>
export const mutationSchema = z.object({ id: z.string().uuid(), commandId: z.string().uuid(), revision: z.number().int().min(0), command: commandSchema })

export function createElectionState(title: string, date: string): ElectionState {
  return { title, date, expectedVotes: null, offices: OFFICE_NAMES.map(name => ({ name, candidates: [], eligibleIds: [], ballots: [], draft: [], expectedVotes: null, draftNoCandidate: emptyChannels(), status: "setup", winnerId: null, electionMethod: null, fifthBallotApproved: null })) }
}

export function tally(votes: Vote[], noCandidate = emptyChannels(), expectedVotes: number | null = null) {
  const candidateTotal = votes.reduce((sum, vote) => sum + vote.inPerson + vote.online, 0)
  const noCandidateTotal = noCandidate.inPerson + noCandidate.online
  const total = candidateTotal + noCandidateTotal
  const recorded = total
  return {
    total, candidateTotal, noCandidateTotal, noCandidateShare: total ? noCandidateTotal / total : 0, recorded, expectedVotes, difference: expectedVotes === null ? null : recorded - expectedVotes,
    threshold: Math.ceil(total * 2 / 3),
    rows: votes.map(vote => ({ ...vote, total: vote.inPerson + vote.online, share: total ? (vote.inPerson + vote.online) / total : 0 })),
  }
}
function topTwo(votes: Vote[]): string[] {
  const rows = tally(votes).rows.toSorted((a, b) => b.total - a.total)
  const cutoff = rows[Math.min(1, rows.length - 1)]?.total ?? 0
  return rows.filter(row => row.total >= cutoff).map(row => row.candidateId)
}
export function assessBallot(number: number, votes: Vote[], noCandidate = emptyChannels(), expectedVotes: number | null = null) {
  const result = tally(votes, noCandidate, expectedVotes)
  const winnerId = result.total > 0 ? result.rows.find(row => row.total * 3 >= result.total * 2)?.candidateId ?? null : null
  const protectedIds = new Set(topTwo(votes))
  let remainingIds = votes.map(vote => vote.candidateId)
  if (!winnerId && result.total > 0) {
    if (number === 2 || number === 3) {
      const denominator = number === 2 ? 5 : 3
      remainingIds = result.rows.filter(row => row.total * denominator >= result.total || protectedIds.has(row.candidateId)).map(row => row.candidateId)
    } else if (number === 4) {
      const lowest = Math.min(...result.rows.map(row => row.total))
      remainingIds = result.rows.filter(row => row.total > lowest || protectedIds.has(row.candidateId)).map(row => row.candidateId)
    } else if (number === 5) remainingIds = topTwo(votes)
  }
  return { ...result, winnerId, remainingIds, withdrawnIds: votes.filter(vote => !remainingIds.includes(vote.candidateId)).map(vote => vote.candidateId) }
}
function sameIds(left: string[], right: string[]) { return left.length === right.length && left.every(id => right.includes(id)) }

/** Later records are retained; an earlier corrected election archives them. */
export function reviewOffice(office: Office) {
  let eligibleIds = office.candidates.map(candidate => candidate.id)
  let winnerId: string | null = null
  let winningBallot: number | null = null
  const issues: Array<{ ballotNumber: number; message: string }> = []
  const eligibleByBallot: Record<number, string[]> = {}
  const archivedBallots: number[] = []
  for (const ballot of office.ballots) {
    if (winnerId) { eligibleByBallot[ballot.number] = ballot.votes.map(vote => vote.candidateId); archivedBallots.push(ballot.number); continue }
    eligibleByBallot[ballot.number] = [...eligibleIds]
    if (!sameIds(eligibleIds, ballot.votes.map(vote => vote.candidateId))) issues.push({ ballotNumber: ballot.number, message: "The candidate list changed after a correction. Review this ballot’s recorded totals." })
    const result = assessBallot(ballot.number, ballot.votes, ballot.noCandidate, ballot.expectedVotes)
    eligibleIds = result.remainingIds
    if (result.winnerId) { winnerId = result.winnerId; winningBallot = ballot.number }
  }
  return { eligibleIds, eligibleByBallot, winnerId, winningBallot, issues, archivedBallots }
}
function validateIds(votes: Vote[], eligibleIds: string[]) {
  const ids = votes.map(vote => vote.candidateId)
  if (new Set(ids).size !== ids.length || !sameIds(ids, eligibleIds)) throw new Error("Enter totals for every candidate on this ballot.")
}
function requireExpectedVotes(expectedVotes: number | null) {
  if (expectedVotes === null) throw new Error("Expected votes must be entered before recording the ballot.")
}
function reconcileCorrectedOffice(office: Office) {
  const review = reviewOffice(office)
  const previousEligibleIds = office.eligibleIds
  office.eligibleIds = review.eligibleIds
  // Retain later ballots and drafts. Review notices stop inconsistent dependent
  // records from being treated as a confirmed election result.
  if (review.issues.length) {
    office.winnerId = null; office.electionMethod = null
    office.status = office.ballots.length === 5 ? "hat" : office.ballots.length === 4 && office.fifthBallotApproved === null ? "motion" : "balloting"
    return
  }
  if (review.winnerId) { office.winnerId = review.winnerId; office.electionMethod = "ballot"; office.status = "elected"; return }
  const last = office.ballots.at(-1)!
  const hatReached = last.number === 5 || (last.number === 4 && office.fifthBallotApproved === false)
  if (hatReached && office.electionMethod === "hat" && office.winnerId && review.eligibleIds.includes(office.winnerId) && sameIds(previousEligibleIds, review.eligibleIds)) return
  office.winnerId = null; office.electionMethod = null
  office.status = hatReached ? "hat" : last.number === 4 && office.fifthBallotApproved === null ? "motion" : "balloting"
}

export function applyCommand(state: ElectionState, command: ElectionCommand, actor: string, now: string): ElectionState {
  const next = structuredClone(state)
  const office = next.offices[command.officeIndex]
  if (!office) throw new Error("Office not found.")
  switch (command.type) {
    case "display":
      next.publicDisplay = { enabled: command.enabled, officeIndex: command.officeIndex }
      break
    case "candidates": {
      if (office.ballots.length || !["setup", "balloting"].includes(office.status)) throw new Error("Candidates cannot change after balloting starts.")
      if (new Set(command.names.map(name => name.toLocaleLowerCase())).size !== command.names.length) throw new Error("Candidate names must be distinct.")
      office.candidates = command.names.map((name, index) => ({ id: String(index + 1), name }))
      office.eligibleIds = office.candidates.map(candidate => candidate.id)
      office.draft = office.eligibleIds.map(candidateId => ({ candidateId, ...emptyChannels() }))
      office.expectedVotes ??= next.expectedVotes
      office.draftNoCandidate = emptyChannels(); office.status = "balloting"
      break
    }
    case "draft":
    case "finalize": {
      if (office.status !== "balloting") throw new Error("This office is not accepting ballot totals.")
      if (reviewOffice(office).issues.length) throw new Error("Review the affected recorded ballots before continuing.")
      validateIds(command.votes, office.eligibleIds)
      const expectedVotes = command.expectedVotes === undefined ? office.expectedVotes : command.expectedVotes
      const noCandidate = command.noCandidate ?? office.draftNoCandidate
      office.expectedVotes = expectedVotes; office.draftNoCandidate = noCandidate; office.draft = command.votes
      if (expectedVotes !== null) next.expectedVotes = expectedVotes
      if (command.type === "draft") break
      const number = office.ballots.length + 1
      if (number > 5) throw new Error("Only five ballots are allowed.")
      requireExpectedVotes(expectedVotes)
      const result = assessBallot(number, command.votes, noCandidate, expectedVotes)
      office.ballots.push({ number, votes: command.votes, expectedVotes, noCandidate, savedAt: now, savedBy: actor })
      office.eligibleIds = result.remainingIds
      office.draft = result.remainingIds.map(candidateId => ({ candidateId, ...emptyChannels() }))
      office.draftNoCandidate = emptyChannels()
      office.status = result.winnerId ? "elected" : number === 4 ? "motion" : number === 5 ? "hat" : "balloting"
      office.winnerId = result.winnerId; office.electionMethod = result.winnerId ? "ballot" : null
      break
    }
    case "correct": {
      const index = office.ballots.findIndex(ballot => ballot.number === command.ballotNumber)
      if (index < 0) throw new Error("Ballot not found.")
      const review = reviewOffice(office)
      validateIds(command.votes, review.eligibleByBallot[command.ballotNumber])
      const original = office.ballots[index]
      const expectedVotes = command.expectedVotes === undefined ? original.expectedVotes : command.expectedVotes
      const noCandidate = command.noCandidate ?? original.noCandidate
      requireExpectedVotes(expectedVotes)
      office.ballots[index] = { ...original, votes: command.votes, expectedVotes, noCandidate, savedAt: now, savedBy: actor }
      reconcileCorrectedOffice(office)
      break
    }
    case "motion":
      if (reviewOffice(office).issues.length) throw new Error("Review the affected recorded ballots before continuing.")
      if (office.status !== "motion" || office.ballots.length !== 4) throw new Error("The fifth-ballot motion follows ballot 4.")
      office.fifthBallotApproved = command.approved; office.status = command.approved ? "balloting" : "hat"
      break
    case "hat":
      if (reviewOffice(office).issues.length) throw new Error("Review the affected recorded ballots before continuing.")
      if (office.status !== "hat" || !office.eligibleIds.includes(command.candidateId)) throw new Error("Select a remaining candidate drawn from the hat.")
      office.winnerId = command.candidateId; office.electionMethod = "hat"; office.status = "elected"
      break
  }
  return next
}
