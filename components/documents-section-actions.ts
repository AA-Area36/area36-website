"use server"

import { getGDriveCredentials } from "@/lib/gdrive/client"
import { getResources } from "@/lib/gdrive/resources"
import type { Resource } from "@/lib/gdrive/types"

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
 * Fetch the 4 most recent documents from Area Documents and Forms folders combined
 */
export async function fetchRecentDocuments(): Promise<Resource[]> {
  try {
    const env = await getEnv()

    // Check if Drive is configured
    if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_RESOURCES_FOLDER_ID) {
      console.warn("Google Drive not configured for resources")
      return []
    }

    const credentials = getGDriveCredentials(env)
    const resources = await getResources(credentials, env.GDRIVE_RESOURCES_FOLDER_ID)

    // Combine area documents and forms
    const combined = [...resources.areaDocuments, ...resources.forms]

    // Sort by date (newest first) - the date field contains year or "Month Year"
    // Since files are already sorted by modifiedTime desc from the API, we can rely on that order
    // Just take the first 4
    return combined.slice(0, 4)
  } catch (error) {
    console.error("Error fetching recent documents:", error)
    return []
  }
}
