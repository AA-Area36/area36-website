import { NextRequest, NextResponse } from "next/server"
import { getFlyer } from "@/lib/r2"
import { sanitizeFilenameForHeader } from "@/lib/security/filename"
import { getDb } from "@/lib/db"
import { events, eventFlyers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireAreaAdminSession } from "@/lib/auth/guards"

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

  const db = await getDb()
  const [linked] = await db.select({ status: events.status }).from(eventFlyers)
    .innerJoin(events, eq(events.id, eventFlyers.eventId))
    .where(eq(eventFlyers.fileKey, flyerKey)).limit(1)
  if (!linked || (linked.status !== "approved" && !(await requireAreaAdminSession()))) {
    return NextResponse.json({ error: "Flyer not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } })
  }
  const flyer = await getFlyer(flyerKey)

  if (!flyer) {
    return NextResponse.json({ error: "Flyer not found" }, { status: 404 })
  }

  const contentType = flyer.httpMetadata?.contentType || "application/octet-stream"
  const headers = new Headers()
  headers.set("Content-Type", contentType)
  
  // Recheck approval on every read, including previously approved/now denied files.
  headers.set("Cache-Control", "private, no-store")
  headers.set("X-Content-Type-Options", "nosniff")
  
  // For PDFs, set content disposition to inline (view in browser)
  if (contentType === "application/pdf") {
    // Get original filename from custom metadata if available
    const originalName = flyer.customMetadata?.originalName || "flyer.pdf"
    const safeName = sanitizeFilenameForHeader(originalName, "flyer.pdf")
    headers.set("Content-Disposition", `inline; filename="${safeName}"`)
  }

  return new NextResponse(flyer.body, {
    status: 200,
    headers,
  })
}
