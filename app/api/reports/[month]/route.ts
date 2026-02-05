import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { getDb } from "@/lib/db"
import { reportsMonthly } from "@/lib/db/schema"

const MONTH_RE = /^\d{4}-\d{2}$/

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ month: string }> }
) {
  const { month } = await params
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid month format. Use YYYY-MM." }, { status: 400 })
  }

  const format = request.nextUrl.searchParams.get("format") || "html"
  if (format !== "html" && format !== "json") {
    return NextResponse.json({ error: "Invalid format. Use html or json." }, { status: 400 })
  }

  const db = await getDb()
  const report = await db
    .select()
    .from(reportsMonthly)
    .where(eq(reportsMonthly.month, month))
    .get()

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 })
  }

  const key = format === "json" ? report.r2KeyJson : report.r2KeyHtml
  if (!key) {
    return NextResponse.json({ error: "Report artifact not available" }, { status: 404 })
  }

  const { env } = await getCloudflareContext({ async: true })
  const object = await env.REPORTS_BUCKET.get(key)
  if (!object) {
    return NextResponse.json({ error: "Report file missing" }, { status: 404 })
  }

  const contentType =
    object.httpMetadata?.contentType ||
    (format === "json" ? "application/json; charset=utf-8" : "text/html; charset=utf-8")

  return new NextResponse(object.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
    },
  })
}
