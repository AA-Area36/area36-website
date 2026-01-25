import { NextRequest, NextResponse } from "next/server"
import { getFlyer } from "@/lib/r2"

// Public route - no authentication required since event flyers are publicly displayed
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params
  const flyerKey = key.join("/")

  if (!flyerKey) {
    return NextResponse.json({ error: "No flyer key provided" }, { status: 400 })
  }

  // Security: Only allow keys that start with "flyers/" to prevent path traversal
  if (!flyerKey.startsWith("flyers/")) {
    return NextResponse.json({ error: "Invalid flyer key" }, { status: 400 })
  }

  const flyer = await getFlyer(flyerKey)

  if (!flyer) {
    return NextResponse.json({ error: "Flyer not found" }, { status: 404 })
  }

  const contentType = flyer.httpMetadata?.contentType || "application/octet-stream"
  const headers = new Headers()
  headers.set("Content-Type", contentType)
  
  // Cache publicly for 1 hour, allow CDN caching
  headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400")
  
  // For PDFs, set content disposition to inline (view in browser)
  if (contentType === "application/pdf") {
    // Get original filename from custom metadata if available
    const originalName = flyer.customMetadata?.originalName || "flyer.pdf"
    headers.set("Content-Disposition", `inline; filename="${originalName}"`)
  }

  return new NextResponse(flyer.body, {
    status: 200,
    headers,
  })
}
