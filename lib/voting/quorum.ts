import { classifyQuorumRows } from "@/lib/quorum/classification"
import { SERVICE_POSITION_OPTIONS } from "@/lib/quorum/constants"
import { getQuorumAdminRows, getQuorumEventByKey } from "@/lib/quorum/google"
import { VotingConflict } from "./store"

export async function loadEligibleSeats(eventKey: string) {
  const event = await getQuorumEventByKey(eventKey)
  if (!event) throw new VotingConflict("Choose an available quorum.")
  const { rows } = classifyQuorumRows(await getQuorumAdminRows(event.spreadsheetId))
  const labels = new Map<string, string>(SERVICE_POSITION_OPTIONS.map(position => [position.value, position.label]))
  return rows.filter(row => row.effectiveClassification === "voting").map(row => [
    row.name, labels.get(row.servicePosition), row.positionDetail || row.homeGroup || (row.district ? `District ${row.district}` : ""),
  ].filter(Boolean).join(" · "))
}
