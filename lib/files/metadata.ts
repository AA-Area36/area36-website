// Utilities for enriching files with metadata from database

import { getDb } from "@/lib/db"
import { inArray, sql } from "drizzle-orm"
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
    const ids = [...new Set(driveIds)]
    const filtered: FileMetadataRecord[] = []
    for (let offset = 0; offset < ids.length; offset += 100) {
      filtered.push(...await db.select({ driveId: fileMetadata.driveId, displayName: fileMetadata.displayName, password: fileMetadata.password, category: fileMetadata.category })
        .from(fileMetadata).where(inArray(fileMetadata.driveId, ids.slice(offset, offset + 100))))
    }
    
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
 * URLs are always proxied (set by driveFileToResource), so enrichment only
 * needs to override the display name and protection flag.
 */
export async function enrichResourcesWithMetadata(
  resources: Resource[],
  metadata?: Map<string, FileMetadataRecord>
): Promise<Resource[]> {
  if (resources.length === 0) return resources

  const driveIds = resources.map((r) => r.driveId)
  const metadataMap = metadata ?? await getFileMetadataByDriveIds(driveIds)

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
  files: CommitteeFile[],
  metadata?: Map<string, FileMetadataRecord>
): Promise<CommitteeFile[]> {
  if (files.length === 0) return files

  const driveIds = files.map((f) => f.id)
  const metadataMap = metadata ?? await getFileMetadataByDriveIds(driveIds)

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
    const filtered = await db.select().from(fileMetadata)
      .where(sql`lower(${fileMetadata.category}) = ${category.toLowerCase()}`)
    
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
