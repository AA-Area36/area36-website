import type { NewsletterDelivery, ServicePosition } from "./constants"

export type QuorumEventStatus = "open" | "closed"
export type VotingClassification = "voting" | "non_voting"
export type VotingOverride = VotingClassification | ""

export type QuorumEvent = {
  eventKey: string
  spreadsheetId: string
  title: string
  eventDate: string
  quorumTarget: number
  status: QuorumEventStatus
  featured: boolean
  webViewLink?: string
  modifiedTime?: string
}

export type PublicQuorumEvent = Pick<
  QuorumEvent,
  "eventKey" | "title" | "eventDate" | "status"
>

export function toPublicQuorumEvent(event: QuorumEvent): PublicQuorumEvent {
  return {
    eventKey: event.eventKey,
    title: event.title,
    eventDate: event.eventDate,
    status: event.status,
  }
}

export type QuorumCountingRow = {
  submissionId: string
  submittedAt: string
  servicePosition: ServicePosition
  positionDetail: string
  isAlternate: boolean
  seatKey: string
  adminVotingOverride: VotingOverride
  counted: boolean
}

export type QuorumAdminRow = QuorumCountingRow & {
  sheetRowNumber: number
  name: string
  district: string
  homeGroup: string
  email: string
  phone: string
  streetAddress: string
  city: string
  state: string
  zip: string
  correctionReason: string
  correctedBy: string
  correctedAt: string
  source: string
  newsletterDelivery: NewsletterDelivery
}

export type ClassifiedQuorumRow<T extends QuorumCountingRow = QuorumCountingRow> = T & {
  effectiveClassification: VotingClassification
  conflict: string | null
}

export type QuorumSummary = {
  voting: number
  nonVoting: number
  total: number
  target: number
  quorumMet: boolean
  status: QuorumEventStatus
  updatedAt: string
}
