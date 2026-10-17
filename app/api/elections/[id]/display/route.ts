import { getCloudflareContext } from "@opennextjs/cloudflare"
import { NextResponse } from "next/server"
import { createApiErrorResponse, createApiRequestId, getRedactedErrorMetadata } from "@/lib/api/error-response"
import { getPublicElection } from "@/lib/elections/public"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = createApiRequestId()
  try {
    const { id } = await params
    const { env } = await getCloudflareContext({ async: true })
    const election = await getPublicElection(env.DB, id)
    if (!election) return createApiErrorResponse({ message: "Election display is not available.", requestId, status: 404 })
    return NextResponse.json(election, { headers: {
      "Cache-Control": "no-store, max-age=0", "CDN-Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow", "X-Request-Id": requestId,
    } })
  } catch (error) {
    console.error("Public election display failed", { requestId, ...getRedactedErrorMetadata(error) })
    return createApiErrorResponse({ message: "Election totals are temporarily unavailable.", requestId })
  }
}
