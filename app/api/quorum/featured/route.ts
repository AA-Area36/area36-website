import { NextResponse } from "next/server"
import { withEdgeCache } from "@/lib/cache/edge-cache"
import { getFeaturedQuorumEvent } from "@/lib/quorum/google"

export async function GET() {
  try {
    const result = await withEdgeCache(
      "quorum:featured",
      async () => {
        const event = await getFeaturedQuorumEvent()
        return event ? { eventKey: event.eventKey, title: event.title, eventDate: event.eventDate } : null
      },
      { ttl: 30, staleWhileRevalidate: false },
    )
    return NextResponse.json(result.data, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=30" },
    })
  } catch {
    return NextResponse.json(null, { headers: { "Cache-Control": "public, max-age=0, s-maxage=10" } })
  }
}
