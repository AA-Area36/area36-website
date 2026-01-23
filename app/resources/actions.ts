"use server"

import { getGDriveCredentials } from "@/lib/gdrive/client"
import { getResources } from "@/lib/gdrive/resources"
import type { ResourcesByCategory } from "@/lib/gdrive/types"

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
    GDRIVE_RESOURCES_FOLDER_ID: process.env.GDRIVE_RESOURCES_FOLDER_ID || "",
  }
}

/**
 * Fetch all resources from Google Drive organized by category
 */
export async function fetchResources(): Promise<ResourcesByCategory> {
  try {
    const env = await getEnv()

    // Check if Drive is configured
    if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_RESOURCES_FOLDER_ID) {
      console.warn("Google Drive not configured for resources")
      return {
        delegateReports: [],
        areaDocuments: [],
        forms: [],
        conferenceMaterials: [],
      }
    }

    const credentials = getGDriveCredentials(env)
    return getResources(credentials, env.GDRIVE_RESOURCES_FOLDER_ID)
  } catch (error) {
    console.error("Error fetching resources:", error)
    return {
      delegateReports: [],
      areaDocuments: [],
      forms: [],
      conferenceMaterials: [],
    }
  }
}
