// Recordings-specific Google Drive helpers

import {
  listFolders,
  listAllFiles,
  getStreamUrl,
} from "./client"
import { withCache, CACHE_KEYS } from "./cache"
import type {
  Recording,
  RecordingsData,
  CategoryInfo,
  DriveFile,
  GDriveCredentials,
} from "./types"

/**
 * Convert folder name to a URL-friendly slug
 * e.g., "Delegate Reports" -> "delegate-reports"
 */
function folderNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
}

/**
 * Format folder name for display
 * e.g., "delegate-reports" -> "Delegate Reports"
 */
function formatCategoryName(name: string): string {
  // Handle acronyms that should stay uppercase
  const acronyms = ["rusc", "aa"]

  return name
    .split(/[\s-]+/)
    .map(word => {
      if (acronyms.includes(word.toLowerCase())) {
        return word.toUpperCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")
}

// Audio MIME types we support
const AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/aac",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4", // Some MP4 audio files
  "audio/x-wav",
  "audio/vnd.wave",
]

/**
 * Check if a file is an audio file
 */
function isAudioFile(mimeType: string): boolean {
  return AUDIO_MIME_TYPES.includes(mimeType) || mimeType.startsWith("audio/")
}

/**
 * Extract year from filename or folder
 * Supports formats like: "2025", "Spring 2025", "2025-03-15", etc.
 */
function extractYear(file: DriveFile, folderName?: string): number {
  const name = file.name.replace(/\.[^.]+$/, "")

  // Try to extract year from filename
  const yearMatch = name.match(/\b(20\d{2})\b/)
  if (yearMatch) {
    return parseInt(yearMatch[1], 10)
  }

  // Try folder name
  if (folderName) {
    const folderYearMatch = folderName.match(/\b(20\d{2})\b/)
    if (folderYearMatch) {
      return parseInt(folderYearMatch[1], 10)
    }
  }

  // Fall back to modified time year
  if (file.modifiedTime) {
    return new Date(file.modifiedTime).getFullYear()
  }

  return new Date().getFullYear()
}

/**
 * Extract date string from filename
 */
function extractDate(file: DriveFile): string | undefined {
  const name = file.name.replace(/\.[^.]+$/, "")

  // Try full date format
  const fullDateMatch = name.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(20\d{2})\b/i
  )
  if (fullDateMatch) {
    return fullDateMatch[0]
  }

  // Try month year format
  const monthYearMatch = name.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i
  )
  if (monthYearMatch) {
    return `${monthYearMatch[1]} ${monthYearMatch[2]}`
  }

  // Try season year format
  const seasonMatch = name.match(/\b(Spring|Summer|Fall|Winter)\s+(20\d{2})\b/i)
  if (seasonMatch) {
    return `${seasonMatch[1]} ${seasonMatch[2]}`
  }

  return undefined
}

/**
 * Clean up title from filename
 */
function cleanTitle(filename: string): string {
  // Remove file extension
  let title = filename.replace(/\.[^.]+$/, "")

  // Remove common date patterns that we've already extracted
  title = title
    .replace(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d{2}\b/gi,
      ""
    )
    .replace(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2}\b/gi,
      ""
    )
    .replace(/\b(Spring|Summer|Fall|Winter)\s+20\d{2}\b/gi, "")
    .replace(/\b20\d{2}\b/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  // Capitalize first letter of each word
  return title || filename.replace(/\.[^.]+$/, "")
}

/**
 * Convert a Drive file to a Recording object
 */
function driveFileToRecording(
  file: DriveFile,
  categoryId: string,
  folderName?: string
): Recording {
  return {
    id: file.id,
    title: cleanTitle(file.name),
    description: file.description,
    category: categoryId,
    year: extractYear(file, folderName),
    date: extractDate(file),
    driveId: file.id,
    streamUrl: getStreamUrl(file.id),
    folder: folderName,
  }
}

/**
 * Sort recordings by year descending, then by title
 */
function sortRecordings(a: Recording, b: Recording): number {
  if (a.year !== b.year) return b.year - a.year
  return a.title.localeCompare(b.title)
}

/**
 * Fetch all recordings from Google Drive organized by category
 * Categories are discovered dynamically from folder structure:
 *   Recordings/
 *   ├── Assemblies/
 *   ├── Delegate Reports/
 *   ├── Workshops/
 *   └── [any other folders]
 */
export async function getRecordings(
  credentials: GDriveCredentials,
  recordingsFolderId: string
): Promise<RecordingsData> {
  return withCache(
    CACHE_KEYS.recordings,
    async () => {
      const categories: CategoryInfo[] = []
      const recordings: Record<string, Recording[]> = {}

      // Get category subfolders
      const categoryFolders = await listFolders(credentials, recordingsFolderId)

      for (const folder of categoryFolders) {
        const categoryId = folderNameToSlug(folder.name)
        const categoryName = formatCategoryName(folder.name)
        const categoryRecordings: Recording[] = []

        // Check for year subfolders within category
        const subfolders = await listFolders(credentials, folder.id)
        const hasYearSubfolders = subfolders.some((sf) => /^20\d{2}$/.test(sf.name))

        if (hasYearSubfolders) {
          // Process year subfolders
          for (const yearFolder of subfolders) {
            const files = await listAllFiles(credentials, yearFolder.id, {
              orderBy: "name desc",
            })

            const audioFiles = files.filter((f) => isAudioFile(f.mimeType))
            for (const file of audioFiles) {
              const recording = driveFileToRecording(file, categoryId, yearFolder.name)
              categoryRecordings.push(recording)
            }
          }
        }

        // Also get files directly in the category folder
        const files = await listAllFiles(credentials, folder.id, {
          orderBy: "name desc",
        })

        const audioFiles = files.filter((f) => isAudioFile(f.mimeType))
        for (const file of audioFiles) {
          // Check for duplicates (might already be included from year subfolder)
          if (!categoryRecordings.some((r) => r.driveId === file.id)) {
            const recording = driveFileToRecording(file, categoryId, folder.name)
            categoryRecordings.push(recording)
          }
        }

        // Sort and add to results
        categoryRecordings.sort(sortRecordings)

        // Only add categories that have recordings
        if (categoryRecordings.length > 0) {
          categories.push({
            id: categoryId,
            name: categoryName,
            folderId: folder.id,
            count: categoryRecordings.length,
          })
          recordings[categoryId] = categoryRecordings
        }
      }

      // Also check for audio files directly in the root recordings folder (misc category)
      const rootFiles = await listAllFiles(credentials, recordingsFolderId, {
        orderBy: "name desc",
      })
      const rootAudioFiles = rootFiles.filter((f) => isAudioFile(f.mimeType))

      if (rootAudioFiles.length > 0) {
        const miscRecordings: Recording[] = rootAudioFiles.map((file) =>
          driveFileToRecording(file, "misc", "Miscellaneous")
        )
        miscRecordings.sort(sortRecordings)

        categories.push({
          id: "misc",
          name: "Miscellaneous",
          count: miscRecordings.length,
        })
        recordings["misc"] = miscRecordings
      }

      // Sort categories alphabetically, but keep "misc" at the end if it exists
      categories.sort((a, b) => {
        if (a.id === "misc") return 1
        if (b.id === "misc") return -1
        return a.name.localeCompare(b.name)
      })

      return { categories, recordings }
    },
    { ttl: 5 * 60 } // 5 minute cache
  )
}

/**
 * Get recordings for a specific category
 */
export async function getRecordingsByCategory(
  credentials: GDriveCredentials,
  recordingsFolderId: string,
  categoryId: string
): Promise<Recording[]> {
  const data = await getRecordings(credentials, recordingsFolderId)
  return data.recordings[categoryId] || []
}

/**
 * Get available years from recordings
 */
export async function getRecordingYears(
  credentials: GDriveCredentials,
  recordingsFolderId: string
): Promise<number[]> {
  const data = await getRecordings(credentials, recordingsFolderId)

  const allRecordings = Object.values(data.recordings).flat()
  const years = [...new Set(allRecordings.map((r) => r.year))]
  return years.sort((a, b) => b - a)
}
