import { notFound } from "next/navigation"
import { eq } from "drizzle-orm"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { getDb } from "@/lib/db"
import { reportsMonthly } from "@/lib/db/schema"
import { ReportContent } from "./report-content"
import type { ReportData } from "./types"

const MONTH_RE = /^\d{4}-\d{2}$/

interface Props {
  params: Promise<{ report: string }>
}

export async function generateMetadata({ params }: Props) {
  const { report: month } = await params

  if (!MONTH_RE.test(month)) {
    return { title: "Report Not Found" }
  }

  const [year, monthNum] = month.split("-")
  const date = new Date(Number(year), Number(monthNum) - 1, 1)
  const monthName = date.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  return {
    title: `${monthName} Report - Area 36`,
    description: `Monthly operational report for Area 36 web services - ${monthName}`,
  }
}

export default async function ReportPage({ params }: Props) {
  const { report: month } = await params

  if (!MONTH_RE.test(month)) {
    notFound()
  }

  const db = await getDb()
  const report = await db
    .select()
    .from(reportsMonthly)
    .where(eq(reportsMonthly.month, month))
    .get()

  if (!report?.r2KeyJson) {
    notFound()
  }

  const { env } = await getCloudflareContext({ async: true })
  const object = await env.REPORTS_BUCKET.get(report.r2KeyJson)

  if (!object) {
    notFound()
  }

  const data = (await object.json()) as ReportData

  return <ReportContent data={data} month={month} generatedAt={report.generatedAt} />
}
