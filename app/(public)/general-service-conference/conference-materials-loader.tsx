"use client"

import { useConferenceMaterials } from "@/lib/hooks/use-gdrive-files"
import { GdriveLoader } from "@/components/gdrive-loader"
import { ConferenceMaterialsContent } from "./conference-materials-content"
import { FinalReportsContent } from "./final-reports-content"

/**
 * Lazy loads conference materials from the API
 * 
 * GRACEFUL DEGRADATION: If files fail to load, shows empty content
 * instead of error. This ensures the page remains usable even if GDrive
 * is unavailable.
 */
export function ConferenceMaterialsLoader() {
  const { data, isLoading, error } = useConferenceMaterials()

  if (isLoading) {
    return <GdriveLoader message="Loading conference materials..." />
  }

  // Graceful degradation: log error but show empty content
  if (error) {
    console.error("Failed to load conference materials:", error)
  }

  return <ConferenceMaterialsContent materials={data?.materials || []} />
}

/**
 * Lazy loads old conference reports from the API
 * 
 * GRACEFUL DEGRADATION: If files fail to load, shows empty content
 * instead of error. This ensures the page remains usable even if GDrive
 * is unavailable.
 */
export function FinalReportsLoader() {
  const { data, isLoading, error } = useConferenceMaterials()

  if (isLoading) {
    return <GdriveLoader message="Loading final reports..." />
  }

  // Graceful degradation: log error but show empty content
  if (error) {
    console.error("Failed to load final reports:", error)
  }

  return <FinalReportsContent oldReports={data?.oldReports || []} />
}
