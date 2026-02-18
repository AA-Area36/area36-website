// Utilities for enriching files with metadata from database

import { getDb } from "@/lib/db"
import { fileMetadata } from "@/lib/db/schema"
import type { Resource } from "@/lib/gdrive/types"
import type { CommitteeFile } from "@/lib/gdrive/committees"

export interface FileMetadataRecord {
  driveId: string
  displayName: string
  password: string | null
  category: string | null
}

/**
 * Get file metadata for multiple drive IDs
 */
export async function getFileMetadataByDriveIds(
  driveIds: string[]
): Promise<Map<string, FileMetadataRecord>> {
  if (driveIds.length === 0) {
    return new Map()
  }

  try {
    const db = await getDb()
    const results = await db.select().from(fileMetadata)
    
    // Filter to only requested IDs
    const filtered = results.filter((r) => driveIds.includes(r.driveId))
    
    return new Map(
      filtered.map((r) => [
        r.driveId,
        {
          driveId: r.driveId,
          displayName: r.displayName,
          password: r.password,
          category: r.category,
        },
      ])
    )
  } catch (error) {
    console.error("Error fetching file metadata:", error)
    return new Map()
  }
}

/**
 * Enrich resources with metadata from database.
 *
 * When a file gains password protection via metadata AND/OR the resource is
 * already marked as restricted (folder not publicly shared), we swap its
 * URLs to the server-side proxy routes.
 */
export async function enrichResourcesWithMetadata(
  resources: Resource[]
): Promise<Resource[]> {
  if (resources.length === 0) return resources

  const driveIds = resources.map((r) => r.driveId)
  const metadataMap = await getFileMetadataByDriveIds(driveIds)

  return resources.map((resource) => {
    const meta = metadataMap.get(resource.driveId)
    if (!meta) return resource

    const isProtected = !!meta.password
    // If the file is now protected via metadata and the URLs are still
    // direct GDrive links, swap them to proxied routes.
    const needsProxy = isProtected || resource.isRestricted
    const previewUrl = needsProxy
      ? `/api/files/preview/${resource.driveId}`
      : resource.previewUrl
    const downloadUrl = needsProxy
      ? `/api/files/download/${resource.driveId}`
      : resource.downloadUrl

    return {
      ...resource,
      title: meta.displayName,
      isProtected,
      previewUrl,
      downloadUrl,
    }
  })
}

/**
 * Enrich committee files with metadata from database
 */
export async function enrichCommitteeFilesWithMetadata(
  files: CommitteeFile[]
): Promise<CommitteeFile[]> {
  if (files.length === 0) return files

  const driveIds = files.map((f) => f.id)
  const metadataMap = await getFileMetadataByDriveIds(driveIds)

  return files.map((file) => {
    const meta = metadataMap.get(file.id)
    if (!meta) return file

    return {
      ...file,
      name: meta.displayName,
      isProtected: !!meta.password,
      category: meta.category,
    }
  })
}

/**
 * Get all file metadata records with a specific category
 */
export async function getFilesByCategory(
  category: string
): Promise<FileMetadataRecord[]> {
  try {
    const db = await getDb()
    const results = await db.select().from(fileMetadata)
    
    // Filter to only files with matching category (case-insensitive)
    const filtered = results.filter(
      (r) => r.category?.toLowerCase() === category.toLowerCase()
    )
    
    return filtered.map((r) => ({
      driveId: r.driveId,
      displayName: r.displayName,
      password: r.password,
      category: r.category,
    }))
  } catch (error) {
    console.error("Error fetching files by category:", error)
    return []
  }
}
