// Utilities for enriching files with metadata from database

import { getDb } from "@/lib/db"
import { fileMetadata } from "@/lib/db/schema"
import type { Resource } from "@/lib/gdrive/types"
import type { CommitteeFile } from "@/lib/gdrive/committees"

export interface FileMetadataRecord {
  driveId: string
  displayName: string
  password: string | null
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
        },
      ])
    )
  } catch (error) {
    console.error("Error fetching file metadata:", error)
    return new Map()
  }
}

/**
 * Enrich resources with metadata from database
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

    return {
      ...resource,
      title: meta.displayName,
      isProtected: !!meta.password,
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
    }
  })
}
