"use client"

import { useResources } from "@/lib/hooks/use-gdrive-files"
import { GdriveLoader } from "@/components/gdrive-loader"
import { ResourcesContent } from "./resources-content"
import { FolderOpen } from "lucide-react"

/**
 * Lazy loads resources from the API and renders the ResourcesContent
 * 
 * GRACEFUL DEGRADATION: If files fail to load, shows empty state message
 * instead of error. This ensures the page remains usable even if GDrive
 * is unavailable.
 */
export function ResourcesLoader() {
  const { data, isLoading, error } = useResources()

  if (isLoading) {
    return <GdriveLoader message="Loading resources..." />
  }

  // Graceful degradation: log error but show empty state
  if (error) {
    console.error("Failed to load resources:", error)
  }

  if (!data) {
    return <EmptyState />
  }

  // Check if all categories are empty
  const isEmpty = 
    data.delegateReports.length === 0 &&
    data.areaDocuments.length === 0 &&
    data.forms.length === 0 &&
    data.conferenceMaterials.length === 0

  if (isEmpty) {
    return <EmptyState />
  }

  return <ResourcesContent resources={data} />
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-foreground mb-2">
        No Resources Available
      </h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Resources are being prepared. Please check back soon.
      </p>
    </div>
  )
}
