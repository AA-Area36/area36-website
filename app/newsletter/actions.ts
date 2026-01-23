"use server"

import { getGDriveCredentials } from "@/lib/gdrive/client"
import { getNewsletters, getNewsletterYears } from "@/lib/gdrive/newsletters"
import type { Newsletter } from "@/lib/gdrive/types"

export interface NewsletterData {
  newsletters: Newsletter[]
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
    GDRIVE_NEWSLETTERS_FOLDER_ID: process.env.GDRIVE_NEWSLETTERS_FOLDER_ID || "",
  }
}

/**
 * Fetch all newsletters from Google Drive
 */
export async function fetchNewsletters(): Promise<NewsletterData> {
  try {
    const env = await getEnv()

    // Check if Drive is configured
    if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_NEWSLETTERS_FOLDER_ID) {
      console.warn("Google Drive not configured for newsletters")
      return { newsletters: [], years: [] }
    }

    const credentials = getGDriveCredentials(env)
    const [newsletters, years] = await Promise.all([
      getNewsletters(credentials, env.GDRIVE_NEWSLETTERS_FOLDER_ID),
      getNewsletterYears(credentials, env.GDRIVE_NEWSLETTERS_FOLDER_ID),
    ])

    return { newsletters, years }
  } catch (error) {
    console.error("Error fetching newsletters:", error)
    return { newsletters: [], years: [] }
  }
}
