"use client"

import { useServiceResources } from "@/lib/hooks/use-gdrive-files"
import { GdriveError, GdriveLoader } from "@/components/gdrive-loader"
import { ServiceResources } from "./service-resources"

/**
 * Lazy loads service resources from the API and renders the ServiceResources
 * 
 * GRACEFUL DEGRADATION: If files fail to load, shows empty state message
 * instead of error. This ensures the page remains usable even if GDrive
 * is unavailable.
 */
export function ServiceResourcesLoader() {
  const { data, isLoading, error, refetch } = useServiceResources()

  if (isLoading) {
    return <GdriveLoader message="Loading service resources..." />
  }

  if (error && !data) {
    return <GdriveError resourceName="Service resources" onRetry={refetch} />
  }

  return <ServiceResources resources={data || []} />
}
