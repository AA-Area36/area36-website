import { classifyQuorumRows } from "./classification"
import { getQuorumCountingRows } from "./google"
import type { QuorumEvent, QuorumSummary } from "./types"

export async function buildQuorumSummary(event: QuorumEvent): Promise<QuorumSummary> {
  const rows = await getQuorumCountingRows(event.spreadsheetId)
  const counts = classifyQuorumRows(rows)
  return {
    voting: counts.voting,
    nonVoting: counts.nonVoting,
    total: counts.total,
    target: event.quorumTarget,
    quorumMet: counts.voting >= event.quorumTarget,
    status: event.status,
    updatedAt: new Date().toISOString(),
  }
}
