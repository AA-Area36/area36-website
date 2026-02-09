"use client"

import { useNewsletters } from "@/lib/hooks/use-gdrive-files"
import { GdriveLoader } from "@/components/gdrive-loader"
import { NewsletterViewer } from "./newsletter-viewer"
import { FileText } from "lucide-react"

/**
 * Lazy loads newsletters from the API and renders the NewsletterViewer
 * 
 * GRACEFUL DEGRADATION: If files fail to load, shows empty state message
 * instead of error. This ensures the page remains usable even if GDrive
 * is unavailable.
 */
export function NewsletterLoader() {
  const { data, isLoading, error } = useNewsletters()

  if (isLoading) {
    return <GdriveLoader message="Loading newsletters..." />
  }

  // Graceful degradation: log error but show empty state
  if (error) {
    console.error("Failed to load newsletters:", error)
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
