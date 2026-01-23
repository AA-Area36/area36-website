// Newsletter-specific Google Drive helpers

import {
  listFolders,
  listAllFiles,
  getGDriveCredentials,
  getPreviewUrl,
  getDownloadUrl,
} from "./client"
import { withCache, CACHE_KEYS } from "./cache"
import type { Newsletter, DriveFile, GDriveCredentials } from "./types"

// Month name to number mapping
const MONTH_MAP: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/**
 * Parse a newsletter filename to extract month and year
 * Handles various formats:
 * - "January 2026.pdf", "January 2026"
 * - "2026-01.pdf"
 * - "September-2025-Pigeon-Web-Edition-Final.pdf"
 * - "March-2025-Web-Edition-V2.pdf"
 */
function parseNewsletterFilename(filename: string): { month: number; year: number } | null {
  // Remove file extension
  const name = filename.replace(/\.[^.]+$/, "").trim()

  // Try "Month Year" format (e.g., "January 2026")
  const monthYearMatch = name.match(/^(\w+)\s+(\d{4})$/i)
  if (monthYearMatch) {
    const monthName = monthYearMatch[1].toLowerCase()
    const year = parseInt(monthYearMatch[2], 10)
    const month = MONTH_MAP[monthName]
    if (month && year) {
      return { month, year }
    }
  }

  // Try "YYYY-MM" format
  const isoMatch = name.match(/^(\d{4})-(\d{2})$/)
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10)
    const month = parseInt(isoMatch[2], 10)
    if (month >= 1 && month <= 12) {
      return { month, year }
    }
  }

  // Try "Month-Year-*" format (e.g., "September-2025-Pigeon-Web-Edition")
  const monthDashYearMatch = name.match(/^(\w+)-(\d{4})/i)
  if (monthDashYearMatch) {
    const monthName = monthDashYearMatch[1].toLowerCase()
    const year = parseInt(monthDashYearMatch[2], 10)
    const month = MONTH_MAP[monthName]
    if (month && year) {
      return { month, year }
    }
  }

  // Try to find month and year anywhere in the filename
  for (const [monthName, monthNum] of Object.entries(MONTH_MAP)) {
    const regex = new RegExp(`${monthName}[\\s_-]*(20\\d{2})`, "i")
    const match = name.match(regex)
    if (match) {
      return { month: monthNum, year: parseInt(match[1], 10) }
    }
  }

  // Try year then month anywhere
  for (const [monthName, monthNum] of Object.entries(MONTH_MAP)) {
    const regex = new RegExp(`(20\\d{2})[\\s_-]*${monthName}`, "i")
    const match = name.match(regex)
    if (match) {
      return { month: monthNum, year: parseInt(match[1], 10) }
    }
  }

  return null
}

/**
 * Parse description for highlights (comma or semicolon separated)
 */
function parseHighlights(description: string | undefined): string[] {
  if (!description) return []

  // Split by common delimiters
  const parts = description.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)

  // If no delimiters found, try to extract key phrases
  if (parts.length === 1) {
    // Check if it looks like a sentence vs a list
    if (description.length > 100) {
      // Long description - extract first few words as a single highlight
      return [description.substring(0, 80) + "..."]
    }
    return parts
  }

  return parts.slice(0, 5) // Limit to 5 highlights
}

/**
 * Convert a Drive file to a Newsletter object
 */
function driveFileToNewsletter(file: DriveFile, folderYear?: number): Newsletter | null {
  const parsed = parseNewsletterFilename(file.name)

  // Try to get year from filename or folder name
  let year = parsed?.year
  let month = parsed?.month

  if (!year && folderYear) {
    year = folderYear
  }

  // Fall back to modified date from Google Drive
  if (!year || !month) {
    if (file.modifiedTime) {
      const modDate = new Date(file.modifiedTime)
      year = year || modDate.getFullYear()
      month = month || (modDate.getMonth() + 1)
    }
  }

  if (!year || !month) {
    // If we still can't determine the date, skip this file
    console.warn(`Could not parse newsletter date from: ${file.name}`)
    return null
  }

  const monthName = MONTH_NAMES[month - 1]

  return {
    id: `${year}-${month.toString().padStart(2, "0")}-${file.id.substring(0, 8)}`,
    title: "The Pigeon",
    issue: `${monthName} ${year}`,
    year,
    month,
    description: file.description || `${monthName} ${year} issue of The Pigeon newsletter.`,
    highlights: parseHighlights(file.description),
    driveId: file.id,
    previewUrl: getPreviewUrl(file.id),
    downloadUrl: getDownloadUrl(file.id),
  }
}

/**
 * Fetch all newsletters from Google Drive
 * Expects folder structure: Newsletters/2026/, Newsletters/2025/, etc.
 */
export async function getNewsletters(
  credentials: GDriveCredentials,
  newslettersFolderId: string
): Promise<Newsletter[]> {
  return withCache(
    CACHE_KEYS.newsletters,
    async () => {
      const newsletters: Newsletter[] = []

      // Get year subfolders
      const yearFolders = await listFolders(credentials, newslettersFolderId)

      for (const folder of yearFolders) {
        const folderYear = parseInt(folder.name, 10)
        if (isNaN(folderYear)) continue

        // Get PDFs in this year folder
        const files = await listAllFiles(credentials, folder.id, {
          mimeType: "application/pdf",
          orderBy: "name desc",
        })

        for (const file of files) {
          const newsletter = driveFileToNewsletter(file, folderYear)
          if (newsletter) {
            newsletters.push(newsletter)
          }
        }
      }

      // Also check root Newsletters folder for any PDFs not in subfolders
      const rootFiles = await listAllFiles(credentials, newslettersFolderId, {
        mimeType: "application/pdf",
        orderBy: "name desc",
      })

      for (const file of rootFiles) {
        const newsletter = driveFileToNewsletter(file)
        if (newsletter) {
          // Avoid duplicates
          if (!newsletters.find((n) => n.driveId === newsletter.driveId)) {
            newsletters.push(newsletter)
          }
        }
      }

      // Sort by year and month descending (most recent first)
      newsletters.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        return b.month - a.month
      })

      return newsletters
    },
    { ttl: 5 * 60 } // 5 minute cache
  )
}

/**
 * Get newsletters filtered by year
 */
export async function getNewslettersByYear(
  credentials: GDriveCredentials,
  newslettersFolderId: string,
  year: number
): Promise<Newsletter[]> {
  const all = await getNewsletters(credentials, newslettersFolderId)
  return all.filter((n) => n.year === year)
}

/**
 * Get available years from newsletters
 */
export async function getNewsletterYears(
  credentials: GDriveCredentials,
  newslettersFolderId: string
): Promise<number[]> {
  const all = await getNewsletters(credentials, newslettersFolderId)
  const years = [...new Set(all.map((n) => n.year))]
  return years.sort((a, b) => b - a)
}
