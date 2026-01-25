"use server"

import { getGDriveCredentials } from "@/lib/gdrive/client"
import { getRecordings, getRecordingYears } from "@/lib/gdrive/recordings"
import type { RecordingsData, CategoryInfo, Recording } from "@/lib/gdrive/types"
import { getDb } from "@/lib/db"
import { recordingFolders } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { setUnlockedFolder } from "@/lib/recordings/session"

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

/**
 * Get registered folder IDs from database
 */
export async function getRegisteredFolderIds(): Promise<string[]> {
  try {
    const db = await getDb()
    const folders = await db.select({ driveId: recordingFolders.driveId }).from(recordingFolders)
    return folders.map(f => f.driveId)
  } catch (error) {
    console.error("Error fetching registered folders:", error)
    return []
  }
}

/**
 * Get folder info from database for display
 */
export async function getRegisteredFolders(): Promise<{ driveId: string; folderName: string }[]> {
  try {
    const db = await getDb()
    const folders = await db.select({ 
      driveId: recordingFolders.driveId, 
      folderName: recordingFolders.folderName 
    }).from(recordingFolders)
    return folders
  } catch (error) {
    console.error("Error fetching registered folders:", error)
    return []
  }
}

/**
 * Verify password for a recording folder
 */
export async function verifyFolderPassword(
  driveId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb()
    const [folder] = await db
      .select()
      .from(recordingFolders)
      .where(eq(recordingFolders.driveId, driveId))
    
    if (!folder) {
      return { success: false, error: "Folder not found" }
    }
    
    if (folder.password !== password) {
      return { success: false, error: "Incorrect password" }
    }
    
    await setUnlockedFolder(driveId)
    return { success: true }
  } catch (error) {
    console.error("Error verifying folder password:", error)
    return { success: false, error: "Verification failed" }
  }
}
