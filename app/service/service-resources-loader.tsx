"use client"

import { useServiceResources } from "@/lib/hooks/use-gdrive-files"
import { GdriveLoader, GdriveError } from "@/components/gdrive-loader"
import { ServiceResources } from "./service-resources"

/**
 * Lazy loads service resources from the API and renders the ServiceResources
 */
export function ServiceResourcesLoader() {
  const { data, isLoading, error, refetch } = useServiceResources()

  if (isLoading) {
    return <GdriveLoader message="Loading service resources..." />
  }

  if (error) {
    return <GdriveError error={error} onRetry={refetch} />
  }

  return <ServiceResources resources={data || []} />
}
