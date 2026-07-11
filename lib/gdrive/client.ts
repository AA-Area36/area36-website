// Google Drive API client for Cloudflare Workers

import { getAccessToken, clearTokenCache } from "./auth"
import type { DriveFile, DriveListResponse, GDriveCredentials } from "./types"
import { logger, PerformanceTracker } from "@/lib/logger"

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3"
const DRIVE_REQUEST_TIMEOUT_MS = 10_000

// Track API call counts for resource limit debugging
let globalApiCallCount = 0

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
 * Includes performance tracking for resource limit debugging
 */
async function driveRequest<T>(
  credentials: GDriveCredentials,
  endpoint: string,
  retryOn401 = true,
  tracker?: PerformanceTracker
): Promise<T> {
  globalApiCallCount++
  const callNum = globalApiCallCount
  const startTime = performance.now()
  
  // Extract operation type from endpoint for better tracking
  const opType = endpoint.includes("/files?") ? "list" : "get"
  
  tracker?.trackSubrequest()
  const endOp = tracker?.startOperation(`gdrive.${opType}`, { endpoint: endpoint.slice(0, 100), callNum })

  try {
    const accessToken = await getAccessToken(credentials)

    const response = await fetch(`${DRIVE_API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(DRIVE_REQUEST_TIMEOUT_MS),
    })

    // Handle 401 by clearing cache and retrying once
    if (response.status === 401 && retryOn401) {
      await clearTokenCache()
      endOp?.()
      return driveRequest(credentials, endpoint, false, tracker)
    }

    if (!response.ok) {
      const error = await response.text()
      const duration = performance.now() - startTime
      logger.error(`Drive API error after ${Math.round(duration)}ms`, new Error(`${response.status} - ${error}`), {
        endpoint: endpoint.slice(0, 100),
        callNum,
      })
      throw new Error(`Drive API error: ${response.status} - ${error}`)
    }

    const duration = performance.now() - startTime
    if (duration > 1000) {
      logger.warn("Slow Google Drive API call", {
        endpoint: endpoint.slice(0, 100),
        durationMs: Math.round(duration),
        callNum,
      })
    }

    endOp?.()
    return response.json() as Promise<T>
  } catch (error) {
    endOp?.()
    throw error
  }
}

/**
 * List files in a specific folder
 */
export async function listFiles(
  credentials: GDriveCredentials,
  folderId: string,
  options: ListFilesOptions = {},
  tracker?: PerformanceTracker
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

  return driveRequest<DriveListResponse>(credentials, `/files?${params.toString()}`, true, tracker)
}

/**
 * List all files in a folder (handles pagination)
 */
export async function listAllFiles(
  credentials: GDriveCredentials,
  folderId: string,
  options: Omit<ListFilesOptions, "pageToken"> = {},
  tracker?: PerformanceTracker
): Promise<DriveFile[]> {
  const allFiles: DriveFile[] = []
  let pageToken: string | undefined
  let pageCount = 0

  do {
    pageCount++
    const response = await listFiles(credentials, folderId, { ...options, pageToken }, tracker)
    allFiles.push(...response.files)
    pageToken = response.nextPageToken
    
    // Log progress every 5 pages to track pagination-heavy requests
    if (pageCount % 5 === 0) {
      logger.info("Pagination progress", { folderId, pageCount, filesFound: allFiles.length })
    }
  } while (pageToken)

  return allFiles
}

/**
 * List subfolders in a folder
 */
export async function listFolders(
  credentials: GDriveCredentials,
  parentId: string,
  tracker?: PerformanceTracker
): Promise<DriveFile[]> {
  return listAllFiles(credentials, parentId, {
    mimeType: "application/vnd.google-apps.folder",
    orderBy: "name",
  }, tracker)
}

/**
 * Get metadata for a single file
 */
export async function getFileMetadata(
  credentials: GDriveCredentials,
  fileId: string,
  tracker?: PerformanceTracker
): Promise<DriveFile> {
  const fields = "id,name,mimeType,description,createdTime,modifiedTime,size,webContentLink,webViewLink,thumbnailLink,parents"
  return driveRequest<DriveFile>(credentials, `/files/${fileId}?fields=${fields}`, true, tracker)
}

/**
 * List files recursively from a folder and its subfolders
 * WARNING: This function can make many API calls and may hit resource limits
 * Use the tracker parameter to monitor performance
 */
export async function listFilesRecursive(
  credentials: GDriveCredentials,
  folderId: string,
  options: Omit<ListFilesOptions, "pageToken" | "mimeType"> = {},
  tracker?: PerformanceTracker
): Promise<{ files: DriveFile[]; folderMap: Map<string, string> }> {
  const allFiles: DriveFile[] = []
  const folderMap = new Map<string, string>() // folderId -> folderName
  let folderCount = 0
  const maxFolders = 50 // Safety limit to prevent runaway recursion
  const startTime = performance.now()

  async function processFolder(currentFolderId: string, folderName?: string, depth = 0): Promise<void> {
    folderCount++
    
    // Safety check: prevent unbounded recursion
    if (folderCount > maxFolders) {
      logger.warn("listFilesRecursive: Max folder limit reached", {
        folderId,
        folderCount,
        maxFolders,
        elapsedMs: Math.round(performance.now() - startTime),
      })
      return
    }

    // Log progress periodically
    if (folderCount % 10 === 0) {
      const elapsed = performance.now() - startTime
      logger.info("listFilesRecursive progress", {
        folderCount,
        filesFound: allFiles.length,
        depth,
        elapsedMs: Math.round(elapsed),
      })
      tracker?.logProgress(`Processed ${folderCount} folders`)
    }

    if (folderName) {
      folderMap.set(currentFolderId, folderName)
    }

    // Get subfolders
    const subfolders = await listFolders(credentials, currentFolderId, tracker)
    for (const subfolder of subfolders) {
      await processFolder(subfolder.id, subfolder.name, depth + 1)
    }

    // Get files (exclude folders)
    const files = await listAllFiles(credentials, currentFolderId, {
      ...options,
    }, tracker)
    const nonFolderFiles = files.filter((f) => f.mimeType !== "application/vnd.google-apps.folder")
    allFiles.push(...nonFolderFiles)
  }

  const endOp = tracker?.startOperation("gdrive.listFilesRecursive", { folderId })
  
  try {
    await processFolder(folderId)
    
    const totalTime = performance.now() - startTime
    logger.info("listFilesRecursive completed", {
      folderId,
      totalFolders: folderCount,
      totalFiles: allFiles.length,
      durationMs: Math.round(totalTime),
    })
    
    endOp?.()
    return { files: allFiles, folderMap }
  } catch (error) {
    endOp?.()
    logger.error("listFilesRecursive failed", error, {
      folderId,
      foldersProcessed: folderCount,
      filesFound: allFiles.length,
      elapsedMs: Math.round(performance.now() - startTime),
    })
    throw error
  }
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

/**
 * Permission entry returned by the Drive API v3 permissions.list endpoint.
 */
export interface DrivePermission {
  id: string
  type: "user" | "group" | "domain" | "anyone"
  role: "owner" | "organizer" | "fileOrganizer" | "writer" | "commenter" | "reader"
  emailAddress?: string
}

/**
 * Check whether a Google Drive file/folder is publicly accessible.
 *
 * A file is considered "public" if it has a permission with `type: "anyone"`.
 * If no such permission exists, the file can only be accessed by specific
 * users/groups — meaning direct `drive.google.com` URLs will 403 for
 * unauthenticated visitors.
 */
export async function isFolderPublic(
  credentials: GDriveCredentials,
  folderId: string,
  tracker?: PerformanceTracker
): Promise<boolean> {
  try {
    const data = await driveRequest<{ permissions: DrivePermission[] }>(
      credentials,
      `/files/${folderId}/permissions?fields=permissions(id,type,role)`,
      true,
      tracker
    )
    return data.permissions.some((p) => p.type === "anyone")
  } catch {
    // If we can't check permissions (e.g., insufficient scope), assume restricted
    // to avoid accidentally exposing direct URLs for private files.
    return false
  }
}
