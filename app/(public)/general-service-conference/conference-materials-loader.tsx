"use client"

import {
  useBackgroundMaterials,
  useConferenceMaterials,
  useServiceResources,
} from "@/lib/hooks/use-gdrive-files"
import { findFinalReportProcessResource } from "@/lib/gdrive/final-report-process"
import { GdriveLoader } from "@/components/gdrive-loader"
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
  const { data, isLoading, error } = useBackgroundMaterials()

  if (isLoading) {
    return <GdriveLoader message="Loading advisory actions..." />
  }

  // Graceful degradation: log error but show empty content
  if (error) {
    console.error("Failed to load advisory actions:", error)
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
  const { data, isLoading, error } = useConferenceMaterials()
  const { data: serviceResources, error: serviceResourcesError } = useServiceResources()

  if (isLoading) {
    return <GdriveLoader message="Loading final reports..." />
  }

  // Graceful degradation: log error but show empty content
  if (error) {
    console.error("Failed to load final reports:", error)
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
  const { data, isLoading, error } = useBackgroundMaterials()

  if (isLoading) {
    return <GdriveLoader message="Loading background materials..." />
  }

  // Graceful degradation: log error but show empty content
  if (error) {
    console.error("Failed to load background materials:", error)
  }

  return (
    <BackgroundMaterialsContent
      agendaItems={data?.agendaItems || []}
      backgroundMaterials={data?.backgroundMaterials || []}
      miscFiles={data?.miscFiles || []}
    />
  )
}
