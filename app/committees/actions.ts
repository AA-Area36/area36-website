"use server"

import { getGDriveCredentials } from "@/lib/gdrive/client"
import { getCommitteeFiles, type CommitteeFiles } from "@/lib/gdrive/committees"
import { enrichCommitteeFilesWithMetadata } from "@/lib/files/metadata"

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
    GDRIVE_COMMITTEES_FOLDER_ID: process.env.GDRIVE_COMMITTEES_FOLDER_ID || "",
  }
}

/**
 * Fetch all committee files from Google Drive organized by committee slug
 * Enriches files with custom display names and password protection from database
 */
export async function fetchCommitteeFiles(): Promise<CommitteeFiles> {
  try {
    const env = await getEnv()

    // Check if Drive is configured
    if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_COMMITTEES_FOLDER_ID) {
      console.warn("Google Drive not configured for committee files")
      return {}
    }

    const credentials = getGDriveCredentials(env)
    const files = await getCommitteeFiles(credentials, env.GDRIVE_COMMITTEES_FOLDER_ID)

    // Enrich files for each committee with metadata from database
    const enrichedFiles: CommitteeFiles = {}
    for (const [slug, committeeFiles] of Object.entries(files)) {
      enrichedFiles[slug] = await enrichCommitteeFilesWithMetadata(committeeFiles)
    }

    return enrichedFiles
  } catch (error) {
    console.error("Error fetching committee files:", error)
    return {}
  }
}
