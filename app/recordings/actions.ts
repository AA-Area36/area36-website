"use server"

import { getGDriveCredentials } from "@/lib/gdrive/client"
import { getRecordings, getRecordingYears } from "@/lib/gdrive/recordings"
import type { RecordingsData, CategoryInfo, Recording } from "@/lib/gdrive/types"

export interface FetchRecordingsResult {
  categories: CategoryInfo[]
  recordings: Record<string, Recording[]>
  years: number[]
}

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
    GDRIVE_RECORDINGS_FOLDER_ID: process.env.GDRIVE_RECORDINGS_FOLDER_ID || "",
  }
}

/**
 * Fetch all recordings from Google Drive organized by category
 */
export async function fetchRecordings(): Promise<FetchRecordingsResult> {
  try {
    const env = await getEnv()

    // Check if Drive is configured
    if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_RECORDINGS_FOLDER_ID) {
      console.warn("Google Drive not configured for recordings")
      return {
        categories: [],
        recordings: {},
        years: [],
      }
    }

    const credentials = getGDriveCredentials(env)
    const [data, years] = await Promise.all([
      getRecordings(credentials, env.GDRIVE_RECORDINGS_FOLDER_ID),
      getRecordingYears(credentials, env.GDRIVE_RECORDINGS_FOLDER_ID),
    ])

    return {
      categories: data.categories,
      recordings: data.recordings,
      years,
    }
  } catch (error) {
    console.error("Error fetching recordings:", error)
    return {
      categories: [],
      recordings: {},
      years: [],
    }
  }
}
