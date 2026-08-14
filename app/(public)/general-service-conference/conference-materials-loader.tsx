"use client"

import {
  useBackgroundMaterials,
  useConferenceMaterials,
  useServiceResources,
} from "@/lib/hooks/use-gdrive-files"
import { findFinalReportProcessResource } from "@/lib/gdrive/final-report-process"
import { GdriveError, GdriveLoader } from "@/components/gdrive-loader"
import { ConferenceMaterialsContent } from "./conference-materials-content"
import { FinalReportsContent } from "./final-reports-content"
import { BackgroundMaterialsContent } from "./background-materials-content"

/**
 * Lazy loads conference advisory actions from the API
 * 
 * Advisory actions are files tagged with "GSC Advisory Actions" category
 * in the admin files section.
 * 
 * GRACEFUL DEGRADATION: If files fail to load, shows empty content
 * instead of error. This ensures the page remains usable even if GDrive
 * is unavailable.
 */
export function ConferenceMaterialsLoader() {
  const { data, isLoading, error, refetch } = useBackgroundMaterials()

  if (isLoading) {
    return <GdriveLoader message="Loading advisory actions..." />
  }

  if (error && !data) {
    return <GdriveError resourceName="Advisory actions" onRetry={refetch} />
  }

  return <ConferenceMaterialsContent materials={data?.advisoryActions || []} />
}

/**
 * Lazy loads old conference reports from the API
 * 
 * GRACEFUL DEGRADATION: If files fail to load, shows empty content
 * instead of error. This ensures the page remains usable even if GDrive
 * is unavailable.
 */
export function FinalReportsLoader() {
  const { data, isLoading, error, refetch } = useConferenceMaterials()
  const { data: serviceResources, error: serviceResourcesError } = useServiceResources()

  if (isLoading) {
    return <GdriveLoader message="Loading final reports..." />
  }

  if (error && !data) {
    return <GdriveError resourceName="Final reports" onRetry={refetch} />
  }
  if (serviceResourcesError) {
    console.error("Failed to load the Final Report ordering guide:", serviceResourcesError)
  }

  return (
    <FinalReportsContent
      oldReports={data?.oldReports || []}
      orderingGuide={findFinalReportProcessResource(serviceResources || [])}
    />
  )
}

/**
 * Lazy loads background materials (GSC pre-conference files) from the API
 * 
 * GRACEFUL DEGRADATION: If files fail to load, shows empty content
 * instead of error. This ensures the page remains usable even if GDrive
 * is unavailable.
 */
export function BackgroundMaterialsLoader() {
  const { data, isLoading, error, refetch } = useBackgroundMaterials()

  if (isLoading) {
    return <GdriveLoader message="Loading background materials..." />
  }

  if (error && !data) {
    return <GdriveError resourceName="Background materials" onRetry={refetch} />
  }

  return (
    <BackgroundMaterialsContent
      agendaItems={data?.agendaItems || []}
      backgroundMaterials={data?.backgroundMaterials || []}
      miscFiles={data?.miscFiles || []}
    />
  )
}
