import { NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"

export async function GET() {
  const timestamp = new Date().toISOString()
  let db = false

  try {
    const { env } = await getCloudflareContext({ async: true })
    await env.DB.prepare("SELECT 1").first()
    db = true
  } catch {
    db = false
  }

  return NextResponse.json(
    { ok: true, db, timestamp },
    { headers: { "Cache-Control": "no-store" } }
  )
}
