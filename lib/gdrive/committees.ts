// Committee files fetching from Google Drive

import { listFolders, listAllFiles, getPreviewUrl, getDownloadUrl, getGDriveCredentials } from "./client"
import { getFromCache, setInCache } from "./cache"
import type { DriveFile, GDriveCredentials } from "./types"

export interface CommitteeFile {
  id: string
  name: string
  description?: string
  previewUrl: string
  downloadUrl: string
  size?: string
  mimeType: string
  isProtected?: boolean
}

export interface CommitteeFiles {
  [committeeSlug: string]: CommitteeFile[]
}

// Slugify committee name to match folder names (case-insensitive)
function slugifyCommitteeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
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

// Map Drive file to CommitteeFile
function mapDriveFileToCommitteeFile(file: DriveFile): CommitteeFile {
  return {
    id: file.id,
    name: file.name.replace(/\.(pdf|doc|docx|xls|xlsx)$/i, ""), // Remove file extension from display name
    description: file.description,
    previewUrl: getPreviewUrl(file.id),
    downloadUrl: getDownloadUrl(file.id),
    size: formatFileSize(file.size),
    mimeType: file.mimeType,
  }
}

/**
 * Fetch all committee files from subfolders within the committees folder
 */
export async function getCommitteeFiles(
  credentials: GDriveCredentials,
  committeesFolderId: string
): Promise<CommitteeFiles> {
  const cacheKey = `committee-files-${committeesFolderId}`
  
  // Try cache first
  const cached = await getFromCache<CommitteeFiles>(cacheKey)
  if (cached) {
    return cached
  }

  const result: CommitteeFiles = {}

  try {
    // Get all subfolders (each represents a committee)
    const folders = await listFolders(credentials, committeesFolderId)

    // Fetch files from each folder in parallel
    await Promise.all(
      folders.map(async (folder) => {
        const slug = slugifyCommitteeName(folder.name)
        const files = await listAllFiles(credentials, folder.id, {
          orderBy: "name",
        })
        
        // Filter to only include PDF and document files
        const documentFiles = files.filter(
          (f) =>
            f.mimeType === "application/pdf" ||
            f.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            f.mimeType === "application/msword" ||
            f.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            f.mimeType === "application/vnd.ms-excel"
        )

        result[slug] = documentFiles.map(mapDriveFileToCommitteeFile)
      })
    )

    // Cache for 5 minutes
    await setInCache(cacheKey, result, { ttl: 300 })
  } catch (error) {
    console.error("Error fetching committee files:", error)
    // Return empty result on error
  }

  return result
}

/**
 * Fetch files for a specific committee
 */
export async function getCommitteeFilesBySlug(
  credentials: GDriveCredentials,
  committeesFolderId: string,
  committeeSlug: string
): Promise<CommitteeFile[]> {
  const allFiles = await getCommitteeFiles(credentials, committeesFolderId)
  return allFiles[committeeSlug] || []
}

/**
 * Get committee files using environment credentials
 */
export async function fetchCommitteeFiles(env: {
  GDRIVE_SERVICE_ACCOUNT_EMAIL: string
  GDRIVE_PRIVATE_KEY: string
  GDRIVE_PRIVATE_KEY_ID: string
  GDRIVE_COMMITTEES_FOLDER_ID?: string
}): Promise<CommitteeFiles> {
  const folderId = env.GDRIVE_COMMITTEES_FOLDER_ID
  if (!folderId) {
    return {}
  }

  const credentials = getGDriveCredentials(env)
  return getCommitteeFiles(credentials, folderId)
}
