import Link from "next/link"
import { FileText, Download, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const recentDocuments = [
  {
    id: 1,
    title: "2024 Delegate Report Back Schedule Update",
    size: "103.85 KB",
    type: "PDF",
  },
  {
    id: 2,
    title: "Advisory Actions of the 74th General Service Conference",
    size: "220.37 KB",
    type: "PDF",
  },
  {
    id: 3,
    title: "2024 Area 36 Approved Budget",
    size: "77.00 KB",
    type: "PDF",
  },
  {
    id: 4,
    title: "Area 36 Inclement Weather Procedure",
    size: "46.17 KB",
    type: "PDF",
  },
]

export function DocumentsSection() {
  return (
    <section className="py-16 sm:py-24 bg-muted/30" aria-labelledby="documents-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <h2 id="documents-heading" className="text-3xl font-bold text-foreground">
              Recent Documents
            </h2>
            <p className="mt-2 text-muted-foreground">Access delegate reports, budgets, and conference materials.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/resources">
              View All Documents
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {recentDocuments.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {doc.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {doc.type} · {doc.size}
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label={`Download ${doc.title}`}>
                <Download className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
