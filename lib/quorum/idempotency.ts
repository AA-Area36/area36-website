export async function hashQuorumPayload(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")
}

export async function reserveQuorumRow(db: D1Database, input: {
  eventKey: string; submissionId: string; payloadHash: string; occupiedRows: number; submittedAt: string
}): Promise<{ rowNumber: number; submittedAt: string }> {
  await db.prepare(`INSERT INTO quorum_submission_reservations
    (event_key, submission_id, payload_hash, row_number, submitted_at)
    SELECT ?, ?, ?, max(?, coalesce(MAX(row_number), 1)) + 1, ?
    FROM quorum_submission_reservations WHERE event_key = ?
    ON CONFLICT(event_key, submission_id) DO NOTHING`)
    .bind(input.eventKey, input.submissionId, input.payloadHash, input.occupiedRows, input.submittedAt, input.eventKey).run()
  const row = await db.prepare(`SELECT payload_hash AS payloadHash, row_number AS rowNumber, submitted_at AS submittedAt
    FROM quorum_submission_reservations WHERE event_key = ? AND submission_id = ?`)
    .bind(input.eventKey, input.submissionId).first<{ payloadHash: string; rowNumber: number; submittedAt: string }>()
  if (!row || row.payloadHash !== input.payloadHash) throw new Error("Check-in attempt does not match its original details. Contact an administrator.")
  return row
}
