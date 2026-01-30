// Google Drive API client for Cloudflare Workers

import { getAccessToken, clearTokenCache } from "./auth"
import type { DriveFile, DriveListResponse, GDriveCredentials } from "./types"

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3"

export interface ListFilesOptions {
  mimeType?: string
  orderBy?: string
  pageSize?: number
  pageToken?: string
  fields?: string
}

/**
 * Get Google Drive credentials from Cloudflare environment
 */
export function getGDriveCredentials(env: {
  GDRIVE_SERVICE_ACCOUNT_EMAIL: string
  GDRIVE_PRIVATE_KEY: string
  GDRIVE_PRIVATE_KEY_ID: string
}): GDriveCredentials {
  return {
    clientEmail: env.GDRIVE_SERVICE_ACCOUNT_EMAIL,
    privateKey: env.GDRIVE_PRIVATE_KEY,
    privateKeyId: env.GDRIVE_PRIVATE_KEY_ID,
  }
}

/**
 * Make an authenticated request to the Google Drive API
 */
async function driveRequest<T>(
  credentials: GDriveCredentials,
  endpoint: string,
  retryOn401 = true
): Promise<T> {
  const accessToken = await getAccessToken(credentials)

  const response = await fetch(`${DRIVE_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  // Handle 401 by clearing cache and retrying once
  if (response.status === 401 && retryOn401) {
    await clearTokenCache()
    return driveRequest(credentials, endpoint, false)
  }

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Drive API error: ${response.status} - ${error}`)
  }

  return response.json() as Promise<T>
}

/**
 * List files in a specific folder
 */
export async function listFiles(
  credentials: GDriveCredentials,
  folderId: string,
  options: ListFilesOptions = {}
): Promise<DriveListResponse> {
  const {
    mimeType,
    orderBy = "modifiedTime desc",
    pageSize = 100,
    pageToken,
    fields = "files(id,name,mimeType,description,createdTime,modifiedTime,size,webContentLink,webViewLink,thumbnailLink,parents),nextPageToken",
  } = options

  // Build query
  const queryParts: string[] = [`'${folderId}' in parents`, "trashed = false"]
  if (mimeType) {
    queryParts.push(`mimeType = '${mimeType}'`)
  }
  const q = queryParts.join(" and ")

  // Build URL params
  const params = new URLSearchParams({
    q,
    orderBy,
    pageSize: pageSize.toString(),
    fields,
  })
  if (pageToken) {
    params.set("pageToken", pageToken)
  }

  return driveRequest<DriveListResponse>(credentials, `/files?${params.toString()}`)
}

/**
 * List all files in a folder (handles pagination)
 */
export async function listAllFiles(
  credentials: GDriveCredentials,
  folderId: string,
  options: Omit<ListFilesOptions, "pageToken"> = {}
): Promise<DriveFile[]> {
  const allFiles: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const response = await listFiles(credentials, folderId, { ...options, pageToken })
    allFiles.push(...response.files)
    pageToken = response.nextPageToken
  } while (pageToken)

  return allFiles
}

/**
 * List subfolders in a folder
 */
export async function listFolders(
  credentials: GDriveCredentials,
  parentId: string
): Promise<DriveFile[]> {
  return listAllFiles(credentials, parentId, {
    mimeType: "application/vnd.google-apps.folder",
    orderBy: "name",
  })
}

/**
 * Get metadata for a single file
 */
export async function getFileMetadata(
  credentials: GDriveCredentials,
  fileId: string
): Promise<DriveFile> {
  const fields = "id,name,mimeType,description,createdTime,modifiedTime,size,webContentLink,webViewLink,thumbnailLink,parents"
  return driveRequest<DriveFile>(credentials, `/files/${fileId}?fields=${fields}`)
}

/**
 * List files recursively from a folder and its subfolders
 */
export async function listFilesRecursive(
  credentials: GDriveCredentials,
  folderId: string,
  options: Omit<ListFilesOptions, "pageToken" | "mimeType"> = {}
): Promise<{ files: DriveFile[]; folderMap: Map<string, string> }> {
  const allFiles: DriveFile[] = []
  const folderMap = new Map<string, string>() // folderId -> folderName

  async function processFolder(currentFolderId: string, folderName?: string): Promise<void> {
    if (folderName) {
      folderMap.set(currentFolderId, folderName)
    }

    // Get subfolders
    const subfolders = await listFolders(credentials, currentFolderId)
    for (const subfolder of subfolders) {
      await processFolder(subfolder.id, subfolder.name)
    }

    // Get files (exclude folders)
    const files = await listAllFiles(credentials, currentFolderId, {
      ...options,
    })
    const nonFolderFiles = files.filter((f) => f.mimeType !== "application/vnd.google-apps.folder")
    allFiles.push(...nonFolderFiles)
  }

  await processFolder(folderId)
  return { files: allFiles, folderMap }
}

/**
 * Generate Google Drive preview URL for viewing PDFs
 */
export function getPreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`
}

/**
 * Generate Google Drive download URL
 */
export function getDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}

/**
 * Generate direct streaming URL for audio files
 */
export function getStreamUrl(fileId: string): string {
  // For audio streaming, we use webContentLink which allows direct access
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}
