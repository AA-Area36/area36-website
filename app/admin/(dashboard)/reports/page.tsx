import Link from "next/link"
import { desc } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { reportsMonthly } from "@/lib/db/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Reports" }

export const dynamic = "force-dynamic"

function formatDateTime(value: string) {
  const date = new Date(value)
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default async function AdminReportsPage() {
  const db = await getDb()
  const reports = await db.select().from(reportsMonthly).orderBy(desc(reportsMonthly.month))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Monthly Reports</h1>
        <p className="text-muted-foreground mt-1">
          Review and download monthly monitoring reports.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
          <CardDescription>{reports.length} report{reports.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports generated yet.</p>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.month}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">{report.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      Month: {report.month} • Generated: {formatDateTime(report.generatedAt)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href={`/admin/reports/${report.month}`}>
                        View Report
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/api/reports/${report.month}?format=html`} target="_blank">
                        Raw HTML
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/api/reports/${report.month}?format=json`} target="_blank">
                        Raw JSON
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
