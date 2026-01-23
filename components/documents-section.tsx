import Link from "next/link"
import { FileText, Download, ArrowRight, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchRecentDocuments } from "./documents-section-actions"
import type { Resource } from "@/lib/gdrive/types"

export async function DocumentsSection() {
  const documents = await fetchRecentDocuments()

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

        {documents.length === 0 ? (
          <div className="text-center py-12 rounded-lg border border-border bg-card">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No documents available at this time.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {documents.map((doc) => (
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
                    PDF{doc.size ? ` · ${doc.size}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Download ${doc.title}`}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
