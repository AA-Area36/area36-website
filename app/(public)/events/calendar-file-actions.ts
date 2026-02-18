"use server"

import { getFilesByCategory } from "@/lib/files/metadata"
import { getGDriveCredentials, getFileMetadata } from "@/lib/gdrive/client"

export interface CalendarFile {
  id: string
  name: string
  displayName: string
  previewUrl: string
  downloadUrl: string
  size?: string
  mimeType: string
  isProtected: boolean
}

/**
 * Get Google Drive environment variables
 */
async function getGDriveEnv() {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare")
    const { env } = await getCloudflareContext({ async: true })
    if (env.GDRIVE_SERVICE_ACCOUNT_EMAIL) {
      return {
        GDRIVE_SERVICE_ACCOUNT_EMAIL: env.GDRIVE_SERVICE_ACCOUNT_EMAIL,
        GDRIVE_PRIVATE_KEY: env.GDRIVE_PRIVATE_KEY,
        GDRIVE_PRIVATE_KEY_ID: env.GDRIVE_PRIVATE_KEY_ID,
      }
    }
  } catch {
    // Not in Cloudflare environment
  }

  return {
    GDRIVE_SERVICE_ACCOUNT_EMAIL: process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL || "",
    GDRIVE_PRIVATE_KEY: process.env.GDRIVE_PRIVATE_KEY || "",
    GDRIVE_PRIVATE_KEY_ID: process.env.GDRIVE_PRIVATE_KEY_ID || "",
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes?: string): string | undefined {
  if (!bytes) return undefined
  const size = parseInt(bytes, 10)
  if (isNaN(size)) return undefined
  
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Fetch files tagged with "Annual Calendar" category
 */
export async function getAnnualCalendarFiles(): Promise<CalendarFile[]> {
  try {
    // Get file metadata records with "Annual Calendar" category
    const metadataRecords = await getFilesByCategory("Annual Calendar")
    
    if (metadataRecords.length === 0) {
      return []
    }

    // Get Google Drive credentials
    const env = await getGDriveEnv()
    if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_PRIVATE_KEY) {
      console.error("Google Drive credentials not configured")
      return []
    }

    const credentials = getGDriveCredentials(env)

    // Fetch file details from Google Drive for each metadata record
    const files: CalendarFile[] = []
    
    for (const record of metadataRecords) {
      try {
        const driveFile = await getFileMetadata(credentials, record.driveId)
        
        const fileIsProtected = !!record.password
        files.push({
          id: driveFile.id,
          name: driveFile.name,
          displayName: record.displayName,
          previewUrl: `/api/files/preview/${driveFile.id}`,
          downloadUrl: `/api/files/download/${driveFile.id}`,
          size: formatFileSize(driveFile.size),
          mimeType: driveFile.mimeType,
          isProtected: fileIsProtected,
        })
      } catch (error) {
        // File may have been deleted from Google Drive
        console.warn(`Failed to fetch file ${record.driveId}:`, error)
      }
    }

    return files
  } catch (error) {
    console.error("Error fetching annual calendar files:", error)
    return []
  }
}
