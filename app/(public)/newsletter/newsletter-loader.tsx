"use client"

import { useNewsletters } from "@/lib/hooks/use-gdrive-files"
import { GdriveError, GdriveLoader } from "@/components/gdrive-loader"
import { NewsletterViewer } from "./newsletter-viewer"
import { FileText } from "lucide-react"

/**
 * Lazy loads newsletters from the API and renders the NewsletterViewer
 * 
 * Keeps a service outage distinct from a legitimate empty archive.
 */
export function NewsletterLoader() {
  const { data, isLoading, error, refetch } = useNewsletters()

  if (isLoading) {
    return <GdriveLoader message="Loading newsletters..." />
  }

  if (error && !data) {
    return <GdriveError resourceName="Newsletters" onRetry={refetch} />
  }

  if (!data || data.newsletters.length === 0) {
    return <EmptyState />
  }

  return <NewsletterViewer newsletters={data.newsletters} years={data.years} />
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-foreground mb-2">
        No Newsletters Available
      </h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Newsletter archives are being prepared. Please check back soon or contact
        the Newsletter Chair for more information.
      </p>
    </div>
  )
}
