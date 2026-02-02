"use server"

import { getGDriveCredentials } from "@/lib/gdrive/client"
import { getServiceResources, type ServiceResource } from "@/lib/gdrive/service-resources"
import { getFileMetadataByDriveIds } from "@/lib/files/metadata"

/**
 * Get environment variables from Cloudflare context or process.env
 */
async function getEnv() {
  // Try Cloudflare context first (for deployed environment)
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare")
    const { env } = await getCloudflareContext({ async: true })
    if (env.GDRIVE_SERVICE_ACCOUNT_EMAIL) {
      return env
    }
  } catch {
    // Not in Cloudflare environment
  }

  // Fall back to process.env (for local development)
  return {
    GDRIVE_SERVICE_ACCOUNT_EMAIL: process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL || "",
    GDRIVE_PRIVATE_KEY: process.env.GDRIVE_PRIVATE_KEY || "",
    GDRIVE_PRIVATE_KEY_ID: process.env.GDRIVE_PRIVATE_KEY_ID || "",
    GDRIVE_SERVICE_RESOURCES_FOLDER_ID: process.env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID || "",
  }
}

/**
 * Enrich service resources with metadata from database
 */
async function enrichServiceResourcesWithMetadata(
  resources: ServiceResource[]
): Promise<ServiceResource[]> {
  if (resources.length === 0) return resources

  const driveIds = resources.map((r) => r.id)
  const metadataMap = await getFileMetadataByDriveIds(driveIds)

  return resources.map((resource) => {
    const meta = metadataMap.get(resource.id)
    if (!meta) return resource

    return {
      ...resource,
      name: meta.displayName,
      isProtected: !!meta.password,
      category: meta.category,
    }
  })
}

/**
 * Fetch all service resources from Google Drive
 * Enriches files with custom display names, password protection, and categories from database
 */
export async function fetchServiceResources(): Promise<ServiceResource[]> {
  try {
    const env = await getEnv()

    // Check if Drive is configured
    if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID) {
      console.warn("Google Drive not configured for service resources")
      return []
    }

    const credentials = getGDriveCredentials(env)
    const resources = await getServiceResources(credentials, env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID)

    // Enrich resources with metadata from database
    return enrichServiceResourcesWithMetadata(resources)
  } catch (error) {
    console.error("Error fetching service resources:", error)
    return []
  }
}
