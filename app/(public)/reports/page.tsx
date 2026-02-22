import type { Metadata } from "next"
import Link from "next/link"
import { desc } from "drizzle-orm"
import { Card, CardContent } from "@/components/ui/card"
import { getDb } from "@/lib/db"
import { reportsMonthly } from "@/lib/db/schema"
import { PageHeader } from "@/components/page-header"
import { getContent } from "@/lib/content/repo"
import { createTranslator } from "@/lib/content/t"
import { getRequestLocale } from "@/lib/i18n/get-locale"

export const metadata: Metadata = {
  title: "Monthly Reports | Area 36",
  description:
    "Operational summaries for Area 36 web services, published monthly.",
}

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
  const locale = await getRequestLocale()
  const reportsContent = await getContent("reports", locale)
  const { t } = createTranslator(reportsContent)
  const db = await getDb()
  const reports = await db.select().from(reportsMonthly).orderBy(desc(reportsMonthly.month))

  return (
    <>
      <PageHeader
        variant="compact"
        title={t("header.title", "Monthly Reports")}
        description={t("header.description", "Operational summaries for Area 36 web services, published monthly.")}
        maxWidth="2xl"
      />

        <section className="py-8 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {reports.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t("list.empty", "No reports available yet.")}
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
                          {t("list.monthPrefix", "Month:")} {report.month} • {t("list.generatedPrefix", "Generated:")}{" "}
                          {formatDate(report.generatedAt)}
                        </div>
                      </div>
                      <Link
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
                        href={`/reports/${report.month}`}
                      >
                        {t("list.viewReportLabel", "View Report")}
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
      </section>
    </>
  )
}
