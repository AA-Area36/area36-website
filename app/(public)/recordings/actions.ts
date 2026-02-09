"use server"

import { getDb } from "@/lib/db"
import { recordingFolders } from "@/lib/db/schema"

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
