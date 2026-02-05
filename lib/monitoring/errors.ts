import { getCloudflareContext } from "@opennextjs/cloudflare"

export type ErrorKind =
  | "D1_QUERY_FAILED"
  | "R2_GET_FAILED"
  | "FETCH_FAILED"
  | "UNCAUGHT_EXCEPTION"

interface RecordErrorParams {
  kind: ErrorKind
  route: string
  error?: unknown
  messageOverride?: string
}

function getTopStackLine(error: unknown): string {
  if (!error || !(error instanceof Error) || !error.stack) return ""
  const lines = error.stack.split("\n").map((line) => line.trim())
  return lines.length > 1 ? lines[1] : lines[0] || ""
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest("SHA-256", data)
  const bytes = new Uint8Array(digest)
  let hex = ""
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0")
  }
  return hex
}

export async function recordError(params: RecordErrorParams): Promise<void> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const day = new Date().toISOString().slice(0, 10)
    const lastSeenAt = new Date().toISOString()
    const message =
      params.messageOverride ?? (params.error instanceof Error ? params.error.message : String(params.error ?? ""))
    const topStackLine = getTopStackLine(params.error)
    const fingerprintSource = `${params.kind}|${params.route}|${params.error instanceof Error ? params.error.name : ""}|${topStackLine}`
    const fingerprint = await sha256Hex(fingerprintSource)

    await env.DB.prepare(
      `INSERT INTO errors_daily (
        day, error_kind, fingerprint, count, sample_message, sample_route, last_seen_at
      ) VALUES (?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(day, error_kind, fingerprint) DO UPDATE SET
        count = count + 1,
        sample_message = excluded.sample_message,
        sample_route = excluded.sample_route,
        last_seen_at = excluded.last_seen_at`
    )
      .bind(day, params.kind, fingerprint, message, params.route, lastSeenAt)
      .run()
  } catch {
    // Never allow error logging to throw
  }
}
