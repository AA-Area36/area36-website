// Service resources fetching from Google Drive

import { listAllFiles, getGDriveCredentials } from "./client"
import { withCache } from "./cache"
import type { DriveFile, GDriveCredentials } from "./types"

export interface ServiceResource {
  id: string
  /** Original filename from Drive, retained when an admin display name is applied. */
  fileName?: string
  name: string
  description?: string
  previewUrl: string
  downloadUrl: string
  size?: string
  mimeType: string
  isProtected?: boolean
  category?: string | null
}

// Format file size for display
function formatFileSize(bytes?: string): string | undefined {
  if (!bytes) return undefined
  const size = parseInt(bytes, 10)
  if (isNaN(size)) return undefined
  
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

// Map Drive file to ServiceResource
function mapDriveFileToServiceResource(file: DriveFile): ServiceResource {
  return {
    id: file.id,
    fileName: file.name,
    name: file.name.replace(/\.(pdf|doc|docx|xls|xlsx)$/i, ""), // Remove file extension from display name
    description: file.description,
    previewUrl: `/api/files/preview/${file.id}`,
    downloadUrl: `/api/files/download/${file.id}`,
    size: formatFileSize(file.size),
    mimeType: file.mimeType,
  }
}

/**
 * Fetch all service resources from the service resources folder
 */
export async function getServiceResources(
  credentials: GDriveCredentials,
  folderId: string
): Promise<ServiceResource[]> {
  const cacheKey = `service-resources-${folderId}`

  return withCache(cacheKey, async () => {
    try {
      const files = await listAllFiles(credentials, folderId, {
        orderBy: "name",
      })

      const documentFiles = files.filter(
        (f) =>
          f.mimeType === "application/pdf" ||
          f.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          f.mimeType === "application/msword" ||
          f.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          f.mimeType === "application/vnd.ms-excel"
      )

      return documentFiles.map(mapDriveFileToServiceResource)
    } catch (error) {
      console.error("Error fetching service resources:", error)
      return []
    }
  }, { ttl: 300 })
}

/**
 * Get service resources using environment credentials
 */
export async function fetchServiceResources(env: {
  GDRIVE_SERVICE_ACCOUNT_EMAIL: string
  GDRIVE_PRIVATE_KEY: string
  GDRIVE_PRIVATE_KEY_ID: string
  GDRIVE_SERVICE_RESOURCES_FOLDER_ID?: string
}): Promise<ServiceResource[]> {
  const folderId = env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID
  if (!folderId) {
    return []
  }

  const credentials = getGDriveCredentials(env)
  return getServiceResources(credentials, folderId)
}
