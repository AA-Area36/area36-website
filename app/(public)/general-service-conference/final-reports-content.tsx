"use client"

import * as React from "react"
import Link from "next/link"
import { FileText, ExternalLink, Download, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PDFViewer } from "@/components/pdf-viewer"
import type { Resource } from "@/lib/gdrive/types"

interface FinalReportsContentProps {
  oldReports: Resource[]
}

// Helper to extract year from report title/filename
function extractYear(title: string): number | null {
  const match = title.match(/20(2[0-9])/)
  return match ? parseInt(`20${match[1]}`, 10) : null
}

// Helper to detect language from title
function detectLanguage(title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes("espanol") || lower.includes("español") || lower.includes("spanish")) {
    return "Spanish"
  }
  if (lower.includes("francais") || lower.includes("français") || lower.includes("french")) {
    return "French"
  }
  return "English"
}

// External link component (for aa.org links)
function ExternalReportLink({
  href,
  title,
  source = "AA.org",
}: {
  href: string
  title: string
  source?: string
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
          {title}
        </h4>
        <p className="text-sm text-muted-foreground">{source}</p>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground" aria-label="(opens in new tab)" />
    </Link>
  )
}

// Drive file component (for local reports with view/download)
function DriveReportItem({
  report,
  onView,
}: {
  report: Resource
  onView: (report: Resource) => void
}) {
  const language = detectLanguage(report.title)
  const year = extractYear(report.title)
  const displayTitle = `${year} Final Report (${language})`

  return (
    <div className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
          {displayTitle}
        </h4>
        <p className="text-sm text-muted-foreground">
          {report.size || "Area 36 Archive"}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onView(report)}
          aria-label={`View ${displayTitle}`}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          asChild
          aria-label={`Download ${displayTitle}`}
        >
          <a href={report.downloadUrl} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </div>
  )
}

export function FinalReportsContent({ oldReports }: FinalReportsContentProps) {
  const [viewerOpen, setViewerOpen] = React.useState(false)
  const [selectedReport, setSelectedReport] = React.useState<Resource | null>(null)

  const handleView = (report: Resource) => {
    setSelectedReport(report)
    setViewerOpen(true)
  }

  // Group old reports by year, with English files first
  const reportsByYear = React.useMemo(() => {
    const grouped: Record<number, Resource[]> = {}
    for (const report of oldReports) {
      const year = extractYear(report.title)
      if (year) {
        if (!grouped[year]) grouped[year] = []
        grouped[year].push(report)
      }
    }
    // Sort each year's reports: English first, then Spanish, then French
    const languageOrder = ["English", "Spanish", "French"]
    for (const year of Object.keys(grouped)) {
      grouped[parseInt(year)].sort((a, b) => {
        const langA = detectLanguage(a.title)
        const langB = detectLanguage(b.title)
        return languageOrder.indexOf(langA) - languageOrder.indexOf(langB)
      })
    }
    return grouped
  }, [oldReports])

  const reports2022 = reportsByYear[2022] || []
  const reports2021 = reportsByYear[2021] || []

  return (
    <>
      <div className="space-y-8">
        {/* 2024 Reports - aa.org */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">2024</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ExternalReportLink
              href="https://www.aa.org/2024-general-service-conference-final-report"
              title="2024 Final Report (English)"
            />
          </div>
        </div>

        {/* 2023 Reports - aa.org */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">2023</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ExternalReportLink
              href="https://www.aa.org/2023-general-service-conference-final-report"
              title="2023 Final Report (English)"
            />
            <ExternalReportLink
              href="https://www.aa.org/es/informe-final-de-la-conferencia-de-servicios-generales-de-2023"
              title="2023 Informe Final (Espanol)"
            />
          </div>
        </div>

        {/* 2022 Reports - from Google Drive if available, otherwise aa.org fallback */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">2022</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports2022.length > 0 ? (
              reports2022.map((report) => (
                <DriveReportItem key={report.id} report={report} onView={handleView} />
              ))
            ) : (
              <>
                <ExternalReportLink
                  href="https://www.aa.org/2022-general-service-conference-final-report"
                  title="2022 Final Report (English)"
                />
                <ExternalReportLink
                  href="https://www.aa.org/es/informe-final-de-la-conferencia-de-servicios-generales-de-2022"
                  title="2022 Informe Final (Espanol)"
                />
                <ExternalReportLink
                  href="https://www.aa.org/fr/rapport-final-de-la-conference-des-services-generaux-de-2022"
                  title="2022 Rapport Final (Francais)"
                />
              </>
            )}
          </div>
        </div>

        {/* 2021 Reports - from Google Drive if available, otherwise aa.org fallback */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">2021</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports2021.length > 0 ? (
              reports2021.map((report) => (
                <DriveReportItem key={report.id} report={report} onView={handleView} />
              ))
            ) : (
              <>
                <ExternalReportLink
                  href="https://www.aa.org/2021-general-service-conference-final-report"
                  title="2021 Final Report (English)"
                />
                <ExternalReportLink
                  href="https://www.aa.org/es/informe-final-de-la-conferencia-de-servicios-generales-de-2021"
                  title="2021 Informe Final (Espanol)"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Link to AA.org for more reports */}
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-muted-foreground">
          For earlier reports and additional materials, visit{" "}
          <Link
            href="https://www.aa.org/general-service-conference"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            AA.org General Service Conference
            <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
          </Link>
        </p>
      </div>

      {/* PDF Viewer */}
      {viewerOpen && selectedReport && (
        <PDFViewer
          previewUrl={selectedReport.previewUrl}
          title={selectedReport.title}
          subtitle={selectedReport.size}
          downloadUrl={selectedReport.downloadUrl}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  )
}
