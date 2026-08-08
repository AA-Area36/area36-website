import type { ServicePosition } from "./constants"
import type {
  ClassifiedQuorumRow,
  QuorumCountingRow,
  VotingClassification,
} from "./types"

const ELIGIBLE_POSITIONS = new Set<ServicePosition>([
  "gsr",
  "alt_gsr",
  "dcm",
  "alt_dcm",
  "past_delegate",
  "area_officer",
  "area_committee_chair",
])

export function normalizeSeatFragment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
export function isVotingEligiblePosition(position: ServicePosition): boolean {
  return ELIGIBLE_POSITIONS.has(position)
}

export function buildQuorumSeatKey(input: {
  servicePosition: ServicePosition
  district: string
  homeGroup: string
  positionDetail: string
  email: string
}): string {
  switch (input.servicePosition) {
    case "gsr":
    case "alt_gsr":
      return `gsr:${normalizeSeatFragment(input.district)}:${normalizeSeatFragment(input.homeGroup)}`
    case "dcm":
    case "alt_dcm":
      return `dcm:${normalizeSeatFragment(input.district)}`
    case "past_delegate":
      return `past-delegate:${normalizeSeatFragment(input.email)}`
    case "area_officer":
      return `area-officer:${normalizeSeatFragment(input.positionDetail)}`
    case "area_committee_chair":
      return `area-chair:${normalizeSeatFragment(input.positionDetail)}`
    default:
      return ""
  }
}

function bySubmittedAt(a: QuorumCountingRow, b: QuorumCountingRow): number {
  return a.submittedAt.localeCompare(b.submittedAt) || a.submissionId.localeCompare(b.submissionId)
}

export function classifyQuorumRows<T extends QuorumCountingRow>(rows: T[]): {
  rows: Array<ClassifiedQuorumRow<T>>
  voting: number
  nonVoting: number
  total: number
} {
  const classification = new Map<string, VotingClassification>()
  const conflicts = new Map<string, string>()
  const countedRows = rows.filter((row) => row.counted)

  for (const row of countedRows) {
    classification.set(row.submissionId, "non_voting")
  }

  const seats = new Map<string, T[]>()
  for (const row of countedRows) {
    if (!isVotingEligiblePosition(row.servicePosition) || !row.seatKey) continue
    const existing = seats.get(row.seatKey) ?? []
    existing.push(row)
    seats.set(row.seatKey, existing)
  }

  for (const seatRows of seats.values()) {
    const ordered = [...seatRows].sort(bySubmittedAt)
    const forcedVoting = ordered.filter((row) => row.adminVotingOverride === "voting")
    const eligiblePrimary = ordered.filter(
      (row) => row.adminVotingOverride !== "non_voting" && !row.isAlternate,
    )
    const eligibleAlternate = ordered.filter(
      (row) => row.adminVotingOverride !== "non_voting" && row.isAlternate,
    )
    const winner = forcedVoting[0] ?? eligiblePrimary[0] ?? eligibleAlternate[0]

    if (winner) classification.set(winner.submissionId, "voting")

    if (ordered.length > 1) {
      const hasPrimaryAndAlternate = ordered.some((row) => !row.isAlternate) && ordered.some((row) => row.isAlternate)
      const message = hasPrimaryAndAlternate
        ? "Primary and alternate are checked in for the same voting seat."
        : "Multiple attendees are checked in for the same voting seat."
      for (const row of ordered) conflicts.set(row.submissionId, message)
    }

    if (forcedVoting.length > 1) {
      for (const row of forcedVoting) {
        conflicts.set(row.submissionId, "Multiple admin-selected voting representatives exist for this seat.")
      }
    }
  }

  const classifiedRows = rows.map((row) => ({
    ...row,
    effectiveClassification: row.counted
      ? classification.get(row.submissionId) ?? "non_voting"
      : "non_voting",
    conflict: conflicts.get(row.submissionId) ?? null,
  }))
  const voting = classifiedRows.filter(
    (row) => row.counted && row.effectiveClassification === "voting",
  ).length
  const total = countedRows.length

  return {
    rows: classifiedRows,
    voting,
    nonVoting: total - voting,
    total,
  }
}
