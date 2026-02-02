"use client"

import { useConferenceMaterials } from "@/lib/hooks/use-gdrive-files"
import { GdriveLoader, GdriveError } from "@/components/gdrive-loader"
import { ConferenceMaterialsContent } from "./conference-materials-content"
import { FinalReportsContent } from "./final-reports-content"

/**
 * Lazy loads conference materials from the API
 */
export function ConferenceMaterialsLoader() {
  const { data, isLoading, error, refetch } = useConferenceMaterials()

  if (isLoading) {
    return <GdriveLoader message="Loading conference materials..." />
  }

  if (error) {
    return <GdriveError error={error} onRetry={refetch} />
  }

  return <ConferenceMaterialsContent materials={data?.materials || []} />
}

/**
 * Lazy loads old conference reports from the API
 */
export function FinalReportsLoader() {
  const { data, isLoading, error, refetch } = useConferenceMaterials()

  if (isLoading) {
    return <GdriveLoader message="Loading final reports..." />
  }

  if (error) {
    return <GdriveError error={error} onRetry={refetch} />
  }

  return <FinalReportsContent oldReports={data?.oldReports || []} />
}
