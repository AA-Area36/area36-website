import { NextRequest, NextResponse } from "next/server"
import { enrichResourcesWithMetadata, enrichCommitteeFilesWithMetadata, getFileMetadataByDriveIds } from "@/lib/files/metadata"
import { getDb } from "@/lib/db"
import { recordingFolders } from "@/lib/db/schema"
import { recordError } from "@/lib/monitoring/errors"

// Valid types for the API
type GDriveType = 
  | "recordings" 
  | "newsletters" 
  | "resources" 
  | "committees" 
  | "service-resources" 
  | "conference-materials"

// Cache TTLs in seconds
const CACHE_TTL = {
  recordings: 60 * 30, // 30 minutes - recordings change rarely
  newsletters: 60 * 60, // 1 hour - newsletters change rarely
  resources: 60 * 15, // 15 minutes - resources may update more often
  committees: 60 * 30, // 30 minutes
  "service-resources": 60 * 30, // 30 minutes
  "conference-materials": 60 * 60, // 1 hour
} as const

// Generate a short request ID for tracing
function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Structured logging helper
function log(level: "info" | "warn" | "error", message: string, data: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  }
  if (level === "error") {
    console.error(JSON.stringify(entry))
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

// Get environment variables from Cloudflare context
async function getEnv() {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare")
    const { env } = await getCloudflareContext({ async: true })
    if (env.GDRIVE_SERVICE_ACCOUNT_EMAIL) {
      return env
    }
  } catch {
    // Not in Cloudflare environment
  }

  // Fall back to process.env
  return {
    GDRIVE_SERVICE_ACCOUNT_EMAIL: process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL || "",
    GDRIVE_PRIVATE_KEY: process.env.GDRIVE_PRIVATE_KEY || "",
    GDRIVE_PRIVATE_KEY_ID: process.env.GDRIVE_PRIVATE_KEY_ID || "",
    GDRIVE_RECORDINGS_FOLDER_ID: process.env.GDRIVE_RECORDINGS_FOLDER_ID || "",
    GDRIVE_NEWSLETTERS_FOLDER_ID: process.env.GDRIVE_NEWSLETTERS_FOLDER_ID || "",
    GDRIVE_RESOURCES_FOLDER_ID: process.env.GDRIVE_RESOURCES_FOLDER_ID || "",
    GDRIVE_COMMITTEES_FOLDER_ID: process.env.GDRIVE_COMMITTEES_FOLDER_ID || "",
    GDRIVE_SERVICE_RESOURCES_FOLDER_ID: process.env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID || "",
  }
}

// Timing helper
function timer() {
  const start = performance.now()
  return {
    elapsed: () => Math.round(performance.now() - start),
  }
}

// Fetch recordings with caching
async function fetchRecordingsData(requestId: string) {
  const { withCache } = await import("@/lib/gdrive/cache")
  
  return withCache(
    "api:recordings",
    async () => {
      const env = await getEnv()
      
      if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_RECORDINGS_FOLDER_ID) {
        log("warn", "GDrive not configured for recordings", { requestId })
        return { categories: [], recordings: {}, years: [], registeredFolders: [] }
      }

      const { getGDriveCredentials } = await import("@/lib/gdrive/client")
      const { getRecordings } = await import("@/lib/gdrive/recordings")

      const credentials = getGDriveCredentials(env)
      const folderId = env.GDRIVE_RECORDINGS_FOLDER_ID

      log("info", "Fetching recordings from GDrive (cache miss)", { requestId, folderId })

      const recordingsTimer = timer()
      const data = await getRecordings(credentials, folderId)
      const years = [...new Set(Object.values(data.recordings).flat().map((r) => r.year))]
        .sort((a, b) => b - a)
      
      // Fetch registered folders from DB (not cached - DB is fast)
      const db = await getDb()
      const folders = await db.select({ 
        driveId: recordingFolders.driveId, 
        folderName: recordingFolders.folderName 
      }).from(recordingFolders)
      
      log("info", "GDrive recordings fetched", { 
        requestId, 
        durationMs: recordingsTimer.elapsed(),
        categoryCount: data.categories.length,
        yearCount: years.length,
      })

      return {
        categories: data.categories,
        recordings: data.recordings,
        years,
        registeredFolders: folders,
      }
    },
    { ttl: CACHE_TTL.recordings }
  )
}

// Fetch newsletters with caching
async function fetchNewslettersData(requestId: string) {
  const { withCache } = await import("@/lib/gdrive/cache")
  
  return withCache(
    "api:newsletters",
    async () => {
      const env = await getEnv()
      
      if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_NEWSLETTERS_FOLDER_ID) {
        log("warn", "GDrive not configured for newsletters", { requestId })
        return { newsletters: [], years: [] }
      }

      const { getGDriveCredentials } = await import("@/lib/gdrive/client")
      const { getNewsletters, getNewsletterYears } = await import("@/lib/gdrive/newsletters")

      const credentials = getGDriveCredentials(env)
      const folderId = env.GDRIVE_NEWSLETTERS_FOLDER_ID

      log("info", "Fetching newsletters from GDrive (cache miss)", { requestId, folderId })

      const t = timer()
      const [newsletters, years] = await Promise.all([
        getNewsletters(credentials, folderId),
        getNewsletterYears(credentials, folderId),
      ])
      
      log("info", "GDrive newsletters fetched", { 
        requestId, 
        durationMs: t.elapsed(),
        newsletterCount: newsletters.length,
        yearCount: years.length,
      })

      return { newsletters, years }
    },
    { ttl: CACHE_TTL.newsletters }
  )
}

// Fetch resources with caching
async function fetchResourcesData(requestId: string) {
  const { withCache } = await import("@/lib/gdrive/cache")
  
  return withCache(
    "api:resources",
    async () => {
      const env = await getEnv()
      
      if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_RESOURCES_FOLDER_ID) {
        log("warn", "GDrive not configured for resources", { requestId })
        return { delegateReports: [], areaDocuments: [], forms: [], conferenceMaterials: [] }
      }

      const { getGDriveCredentials } = await import("@/lib/gdrive/client")
      const { getResources } = await import("@/lib/gdrive/resources")

      const credentials = getGDriveCredentials(env)
      const folderId = env.GDRIVE_RESOURCES_FOLDER_ID

      log("info", "Fetching resources from GDrive (cache miss)", { requestId, folderId })

      const driveTimer = timer()
      const resources = await getResources(credentials, folderId)
      
      // Enrich with metadata from DB
      const [delegateReports, areaDocuments, forms, conferenceMaterials] = await Promise.all([
        enrichResourcesWithMetadata(resources.delegateReports),
        enrichResourcesWithMetadata(resources.areaDocuments),
        enrichResourcesWithMetadata(resources.forms),
        enrichResourcesWithMetadata(resources.conferenceMaterials),
      ])
      
      log("info", "GDrive resources fetched and enriched", { 
        requestId, 
        durationMs: driveTimer.elapsed(),
        delegateReports: delegateReports.length,
        areaDocuments: areaDocuments.length,
        forms: forms.length,
        conferenceMaterials: conferenceMaterials.length,
      })

      return { delegateReports, areaDocuments, forms, conferenceMaterials }
    },
    { ttl: CACHE_TTL.resources }
  )
}

// Fetch committee files with caching
async function fetchCommitteesData(requestId: string) {
  const { withCache } = await import("@/lib/gdrive/cache")
  
  return withCache(
    "api:committees",
    async () => {
      const env = await getEnv()
      
      if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_COMMITTEES_FOLDER_ID) {
        log("warn", "GDrive not configured for committees", { requestId })
        return {}
      }

      const { getGDriveCredentials } = await import("@/lib/gdrive/client")
      const { getCommitteeFiles } = await import("@/lib/gdrive/committees")
      type CommitteeFiles = Awaited<ReturnType<typeof getCommitteeFiles>>

      const credentials = getGDriveCredentials(env)
      const folderId = env.GDRIVE_COMMITTEES_FOLDER_ID

      log("info", "Fetching committee files from GDrive (cache miss)", { requestId, folderId })

      const driveTimer = timer()
      const files = await getCommitteeFiles(credentials, folderId)
      
      // Enrich with metadata
      const enrichedFiles: CommitteeFiles = {}
      for (const [slug, committeeFiles] of Object.entries(files)) {
        enrichedFiles[slug] = await enrichCommitteeFilesWithMetadata(committeeFiles)
      }
      
      const committeeCount = Object.keys(enrichedFiles).length
      const totalFiles = Object.values(enrichedFiles).reduce((sum, arr) => sum + arr.length, 0)
      log("info", "GDrive committee files fetched and enriched", { 
        requestId, 
        durationMs: driveTimer.elapsed(),
        committeeCount,
        totalFiles,
      })

      return enrichedFiles
    },
    { ttl: CACHE_TTL.committees }
  )
}

// Fetch service resources with caching
async function fetchServiceResourcesData(requestId: string) {
  const { withCache } = await import("@/lib/gdrive/cache")
  
  return withCache(
    "api:service-resources",
    async () => {
      const env = await getEnv()
      
      if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID) {
        log("warn", "GDrive not configured for service resources", { requestId })
        return []
      }

      const { getGDriveCredentials } = await import("@/lib/gdrive/client")
      const { getServiceResources } = await import("@/lib/gdrive/service-resources")
      type ServiceResource = Awaited<ReturnType<typeof getServiceResources>>[number]

      const credentials = getGDriveCredentials(env)
      const folderId = env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID

      log("info", "Fetching service resources from GDrive (cache miss)", { requestId, folderId })

      const driveTimer = timer()
      const resources = await getServiceResources(credentials, folderId)
      
      if (resources.length === 0) return resources

      // Enrich with metadata
      const driveIds = resources.map((r) => r.id)
      const metadataMap = await getFileMetadataByDriveIds(driveIds)
      
      const enrichedResources: ServiceResource[] = resources.map((resource) => {
        const meta = metadataMap.get(resource.id)
        if (!meta) return resource
        return {
          ...resource,
          name: meta.displayName,
          isProtected: !!meta.password,
          category: meta.category,
        }
      })
      
      log("info", "GDrive service resources fetched and enriched", { 
        requestId, 
        durationMs: driveTimer.elapsed(),
        resourceCount: enrichedResources.length,
      })

      return enrichedResources
    },
    { ttl: CACHE_TTL["service-resources"] }
  )
}

// Fetch conference materials with caching
async function fetchConferenceMaterialsData(requestId: string) {
  const { withCache } = await import("@/lib/gdrive/cache")
  
  return withCache(
    "api:conference-materials",
    async () => {
      const env = await getEnv()
      
      if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_RESOURCES_FOLDER_ID) {
        log("warn", "GDrive not configured for conference materials", { requestId })
        return { materials: [], oldReports: [] }
      }

      const { getGDriveCredentials } = await import("@/lib/gdrive/client")
      const { getResourcesByCategory, getOldConferenceReports } = await import("@/lib/gdrive/resources")

      const credentials = getGDriveCredentials(env)
      const folderId = env.GDRIVE_RESOURCES_FOLDER_ID

      log("info", "Fetching conference materials from GDrive (cache miss)", { requestId, folderId })

      const driveTimer = timer()
      const [materials, oldReports] = await Promise.all([
        getResourcesByCategory(credentials, folderId, "conference-materials"),
        getOldConferenceReports(credentials, folderId),
      ])
      
      log("info", "GDrive conference materials fetched", { 
        requestId, 
        durationMs: driveTimer.elapsed(),
        materialsCount: materials.length,
        oldReportsCount: oldReports.length,
      })

      return { materials, oldReports }
    },
    { ttl: CACHE_TTL["conference-materials"] }
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  const requestId = generateRequestId()
  const totalTimer = timer()

  log("info", "GDrive API request started", { 
    requestId, 
    type,
    url: request.url,
  })

  // Validate type
  const validTypes: GDriveType[] = [
    "recordings", 
    "newsletters", 
    "resources", 
    "committees", 
    "service-resources", 
    "conference-materials"
  ]
  
  if (!validTypes.includes(type as GDriveType)) {
    log("error", "Invalid GDrive type requested", { requestId, type })
    return NextResponse.json(
      { error: `Invalid type. Valid types: ${validTypes.join(", ")}` },
      { status: 400 }
    )
  }

  try {
    let data: unknown

    switch (type as GDriveType) {
      case "recordings":
        data = await fetchRecordingsData(requestId)
        break
      case "newsletters":
        data = await fetchNewslettersData(requestId)
        break
      case "resources":
        data = await fetchResourcesData(requestId)
        break
      case "committees":
        data = await fetchCommitteesData(requestId)
        break
      case "service-resources":
        data = await fetchServiceResourcesData(requestId)
        break
      case "conference-materials":
        data = await fetchConferenceMaterialsData(requestId)
        break
    }

    log("info", "GDrive API request completed", { 
      requestId, 
      type,
      totalDurationMs: totalTimer.elapsed(),
    })

    return NextResponse.json(data, {
      headers: {
        "X-Request-Id": requestId,
        // Force browser revalidation so admin metadata updates appear on refresh,
        // while still allowing shared/CDN caching.
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    log("error", "GDrive API request failed", { 
      requestId, 
      type,
      totalDurationMs: totalTimer.elapsed(),
      error: errorMessage,
      stack: errorStack,
    })
    void recordError({ kind: "FETCH_FAILED", route: `/api/gdrive/${type}`, error })

    return NextResponse.json(
      { error: errorMessage },
      { 
        status: 500,
        headers: { "X-Request-Id": requestId },
      }
    )
  }
}
