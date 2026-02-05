import Link from "next/link"
import { desc } from "drizzle-orm"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { getDb } from "@/lib/db"
import { reportsMonthly } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

function formatDate(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function ReportsPage() {
  const db = await getDb()
  const reports = await db.select().from(reportsMonthly).orderBy(desc(reportsMonthly.month))

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <section className="bg-gradient-to-b from-primary/5 to-background py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold text-foreground sm:text-5xl">Monthly Reports</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
              Operational summaries for Area 36 web services, published monthly.
            </p>
          </div>
        </section>

        <section className="py-8 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {reports.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No reports available yet.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {reports.map((report) => (
                  <Card key={report.month}>
                    <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-lg font-semibold text-foreground">{report.subject}</div>
                        <div className="text-sm text-muted-foreground">
                          Month: {report.month} • Generated: {formatDate(report.generatedAt)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <Link
                          className="text-primary hover:underline"
                          href={`/api/reports/${report.month}?format=html`}
                          target="_blank"
                        >
                          View HTML
                        </Link>
                        <Link
                          className="text-primary hover:underline"
                          href={`/api/reports/${report.month}?format=json`}
                          target="_blank"
                        >
                          View JSON
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
