// Resources-specific Google Drive helpers

import {
  listFolders,
  listAllFiles,
  getDownloadUrl,
  getPreviewUrl,
} from "./client"
import { withCache, CACHE_KEYS } from "./cache"
import type {
  Resource,
  ResourceCategory,
  ResourcesByCategory,
  DriveFile,
  GDriveCredentials,
} from "./types"

// Folder name to category mapping (case-insensitive)
const FOLDER_CATEGORY_MAP: Record<string, ResourceCategory> = {
  "delegate reports": "delegate-reports",
  "delegate-reports": "delegate-reports",
  "area documents": "area-documents",
  "area-documents": "area-documents",
  documents: "area-documents",
  forms: "forms",
  "conference materials": "conference-materials",
  "conference-materials": "conference-materials",
}

/**
 * Parse file size to human-readable format
 */
function formatFileSize(bytes: string | undefined): string | undefined {
  if (!bytes) return undefined

  const size = parseInt(bytes, 10)
  if (isNaN(size)) return undefined

  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Extract date from filename or description
 * Supports formats like: "2025", "May 2025", "2025-03", "March 2024"
 */
function extractDate(file: DriveFile): string | undefined {
  const name = file.name.replace(/\.[^.]+$/, "")

  // Try to extract year and optional month
  const yearMatch = name.match(/\b(20\d{2})\b/)
  const monthYearMatch = name.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i
  )

  if (monthYearMatch) {
    return `${monthYearMatch[1]} ${monthYearMatch[2]}`
  }

  if (yearMatch) {
    return yearMatch[1]
  }

  // Try to use modified time year
  if (file.modifiedTime) {
    const year = new Date(file.modifiedTime).getFullYear()
    return year.toString()
  }

  return undefined
}

/**
 * Check if a resource is password protected
 * Convention: Include "[protected]" or "[password]" in description
 */
function isProtected(description: string | undefined): boolean {
  if (!description) return false
  const lower = description.toLowerCase()
  return lower.includes("[protected]") || lower.includes("[password]")
}

/**
 * Clean description by removing metadata tags
 */
function cleanDescription(description: string | undefined): string | undefined {
  if (!description) return undefined
  return description
    .replace(/\[protected\]/gi, "")
    .replace(/\[password\]/gi, "")
    .trim() || undefined
}

/**
 * Convert a Drive file to a Resource object
 */
function driveFileToResource(
  file: DriveFile,
  category: ResourceCategory
): Resource {
  return {
    id: file.id,
    title: file.name.replace(/\.[^.]+$/, ""), // Remove file extension
    description: cleanDescription(file.description),
    category,
    date: extractDate(file),
    size: formatFileSize(file.size),
    downloadUrl: getDownloadUrl(file.id),
    previewUrl: getPreviewUrl(file.id),
    isProtected: isProtected(file.description),
    driveId: file.id,
  }
}

/**
 * Get category from folder name
 */
function getCategoryFromFolderName(name: string): ResourceCategory | null {
  const normalized = name.toLowerCase().trim()
  return FOLDER_CATEGORY_MAP[normalized] || null
}

/**
 * Fetch all resources from Google Drive organized by category
 * Expects folder structure:
 *   Resources/
 *   ├── Delegate Reports/
 *   ├── Area Documents/
 *   ├── Forms/
 *   └── Conference Materials/
 */
export async function getResources(
  credentials: GDriveCredentials,
  resourcesFolderId: string
): Promise<ResourcesByCategory> {
  return withCache(
    CACHE_KEYS.resources,
    async () => {
      const result: ResourcesByCategory = {
        delegateReports: [],
        areaDocuments: [],
        forms: [],
        conferenceMaterials: [],
      }

      // Get category subfolders
      const categoryFolders = await listFolders(credentials, resourcesFolderId)

      for (const folder of categoryFolders) {
        const category = getCategoryFromFolderName(folder.name)
        if (!category) {
          console.warn(`Unknown resource category folder: ${folder.name}`)
          continue
        }

        // Get files in this category folder
        const files = await listAllFiles(credentials, folder.id, {
          orderBy: "modifiedTime desc",
        })

        // Filter to only include actual files (not folders)
        const resourceFiles = files.filter(
          (f) => f.mimeType !== "application/vnd.google-apps.folder"
        )

        for (const file of resourceFiles) {
          const resource = driveFileToResource(file, category)

          // Add to appropriate category
          switch (category) {
            case "delegate-reports":
              result.delegateReports.push(resource)
              break
            case "area-documents":
              result.areaDocuments.push(resource)
              break
            case "forms":
              result.forms.push(resource)
              break
            case "conference-materials":
              result.conferenceMaterials.push(resource)
              break
          }
        }
      }

      // Also check root Resources folder for any files not in subfolders
      const rootFiles = await listAllFiles(credentials, resourcesFolderId, {
        orderBy: "modifiedTime desc",
      })

      for (const file of rootFiles) {
        // Skip folders
        if (file.mimeType === "application/vnd.google-apps.folder") continue

        // Default to area-documents for uncategorized files
        const resource = driveFileToResource(file, "area-documents")

        // Check if already added
        const allIds = [
          ...result.delegateReports,
          ...result.areaDocuments,
          ...result.forms,
          ...result.conferenceMaterials,
        ].map((r) => r.driveId)

        if (!allIds.includes(resource.driveId)) {
          result.areaDocuments.push(resource)
        }
      }

      return result
    },
    { ttl: 5 * 60 } // 5 minute cache
  )
}

/**
 * Get resources for a specific category
 */
export async function getResourcesByCategory(
  credentials: GDriveCredentials,
  resourcesFolderId: string,
  category: ResourceCategory
): Promise<Resource[]> {
  const all = await getResources(credentials, resourcesFolderId)

  switch (category) {
    case "delegate-reports":
      return all.delegateReports
    case "area-documents":
      return all.areaDocuments
    case "forms":
      return all.forms
    case "conference-materials":
      return all.conferenceMaterials
    default:
      return []
  }
}
