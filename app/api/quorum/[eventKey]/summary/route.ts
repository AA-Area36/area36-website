import { NextResponse } from "next/server"
import { createApiErrorResponse, createApiRequestId, getRedactedErrorMetadata } from "@/lib/api/error-response"
import { withEdgeCache } from "@/lib/cache/edge-cache"
import { getQuorumEventByKey } from "@/lib/quorum/google"
import { buildQuorumSummary } from "@/lib/quorum/summary"
import { quorumEventKeySchema } from "@/lib/schemas/quorum"

type RouteContext = { params: Promise<{ eventKey: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const requestId = createApiRequestId()
  const { eventKey } = await params
  const parsedEventKey = quorumEventKeySchema.safeParse(eventKey)
  if (!parsedEventKey.success) {
    return createApiErrorResponse({ message: "Quorum event not found.", requestId, status: 404 })
  }
  try {
    const result = await withEdgeCache(
      `quorum:summary:${parsedEventKey.data}`,
      async () => {
        const event = await getQuorumEventByKey(parsedEventKey.data)
        if (!event) return null
        return buildQuorumSummary(event)
      },
      { ttl: 4, staleWhileRevalidate: false },
    )
    if (!result.data) {
      return createApiErrorResponse({ message: "Quorum event not found.", requestId, status: 404 })
    }
    return NextResponse.json(result.data, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=4, stale-while-revalidate=4",
        "X-Request-Id": requestId,
      },
    })
  } catch (error) {
    console.error("Quorum summary failed", { requestId, ...getRedactedErrorMetadata(error) })
    return createApiErrorResponse({ message: "Quorum totals are temporarily unavailable.", requestId })
  }
}
