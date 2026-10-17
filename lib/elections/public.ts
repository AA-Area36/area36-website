import { z } from "zod"
import { assessBallot, reviewOffice, type ElectionRecord, type Office, type Vote, type VoteChannels } from "./model"
import { getElection } from "./store"

export type PublicBallot = {
  number: number
  phase: "counting" | "recorded" | "archived"
  recorded: number
  expected: number | null
  difference: number | null
  threshold: number
  noCandidate: { inPerson: number; online: number; total: number; share: number }
  candidates: { id: string; name: string; inPerson: number; online: number; total: number; share: number }[]
}
export type PublicOffice = {
  name: string
  status: Office["status"]
  needsReview: boolean
  winner: string | null
  electionMethod: Office["electionMethod"]
  ballots: PublicBallot[]
}
export type PublicElection = {
  id: string
  title: string
  date: string
  revision: number
  updatedAt: string
  officeIndex: number
  offices: PublicOffice[]
}

function ballotDisplay(office: Office, number: number, votes: Vote[], noCandidate: VoteChannels, expected: number | null, phase: PublicBallot["phase"]): PublicBallot {
  const result = assessBallot(number, votes, noCandidate, expected)
  return {
    number, phase, recorded: result.recorded, expected, difference: result.difference, threshold: result.threshold,
    noCandidate: { inPerson: noCandidate.inPerson, online: noCandidate.online, total: result.noCandidateTotal, share: result.noCandidateShare },
    candidates: result.rows.map(candidate => ({
      id: candidate.candidateId,
      name: office.candidates.find(item => item.id === candidate.candidateId)?.name ?? "Candidate",
      inPerson: candidate.inPerson, online: candidate.online, total: candidate.total, share: candidate.share,
    })),
  }
}

/** Explicit allowlist: public viewers never receive audit actors or Drive details. */
export function toPublicElection(election: ElectionRecord): PublicElection | null {
  if (election.state.publicDisplay?.enabled !== true) return null
  return {
    id: election.id, title: election.state.title, date: election.state.date,
    revision: election.revision, updatedAt: election.updatedAt,
    officeIndex: election.state.publicDisplay.officeIndex,
    offices: election.state.offices.map(office => {
      const review = reviewOffice(office)
      const ballots = office.ballots.map(ballot => ballotDisplay(office, ballot.number, ballot.votes, ballot.noCandidate, ballot.expectedVotes, review.archivedBallots.includes(ballot.number) ? "archived" : "recorded"))
      if (office.status === "balloting" && !review.issues.length) {
        ballots.push(ballotDisplay(office, office.ballots.length + 1, office.draft, office.draftNoCandidate, office.expectedVotes, "counting"))
      }
      return {
        name: office.name, status: office.status, needsReview: review.issues.length > 0,
        winner: review.issues.length ? null : office.candidates.find(candidate => candidate.id === office.winnerId)?.name ?? null,
        electionMethod: review.issues.length ? null : office.electionMethod,
        ballots,
      }
    }),
  }
}

export async function getPublicElection(db: D1Database, id: string): Promise<PublicElection | null> {
  if (!z.string().uuid().safeParse(id).success) return null
  const election = await getElection(db, id)
  return election ? toPublicElection(election) : null
}
