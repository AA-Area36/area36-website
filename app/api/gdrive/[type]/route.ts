import { NextRequest, NextResponse } from "next/server"
import { enrichResourcesWithMetadata, enrichCommitteeFilesWithMetadata, getFileMetadataByDriveIds } from "@/lib/files/metadata"
import { getDb } from "@/lib/db"
import { recordingFolders } from "@/lib/db/schema"

// Valid types for the API
type GDriveType = 
  | "recordings" 
  | "newsletters" 
  | "resources" 
  | "committees" 
  | "service-resources" 
  | "conference-materials"

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

// Fetch recordings with detailed logging - uses dynamic imports
async function fetchRecordingsData(requestId: string) {
  const env = await getEnv()
  
  if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_RECORDINGS_FOLDER_ID) {
    log("warn", "GDrive not configured for recordings", { requestId })
    return { categories: [], recordings: {}, years: [], registeredFolders: [] }
  }

  // Dynamic imports to reduce initial bundle size
  const { getGDriveCredentials } = await import("@/lib/gdrive/client")
  const { getRecordings, getRecordingYears } = await import("@/lib/gdrive/recordings")

  const credentials = getGDriveCredentials(env)
  const folderId = env.GDRIVE_RECORDINGS_FOLDER_ID

  log("info", "Fetching recordings from GDrive", { requestId, folderId })

  // Fetch recordings data
  const recordingsTimer = timer()
  const [data, years] = await Promise.all([
    getRecordings(credentials, folderId),
    getRecordingYears(credentials, folderId),
  ])
  log("info", "GDrive recordings fetched", { 
    requestId, 
    durationMs: recordingsTimer.elapsed(),
    categoryCount: data.categories.length,
    yearCount: years.length,
  })

  // Fetch registered folders from DB
  const dbTimer = timer()
  const db = await getDb()
  const folders = await db.select({ 
    driveId: recordingFolders.driveId, 
    folderName: recordingFolders.folderName 
  }).from(recordingFolders)
  log("info", "DB registered folders fetched", { 
    requestId, 
    durationMs: dbTimer.elapsed(),
    folderCount: folders.length,
  })

  return {
    categories: data.categories,
    recordings: data.recordings,
    years,
    registeredFolders: folders,
  }
}

// Fetch newsletters with detailed logging - uses dynamic imports
async function fetchNewslettersData(requestId: string) {
  const env = await getEnv()
  
  if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_NEWSLETTERS_FOLDER_ID) {
    log("warn", "GDrive not configured for newsletters", { requestId })
    return { newsletters: [], years: [] }
  }

  // Dynamic imports to reduce initial bundle size
  const { getGDriveCredentials } = await import("@/lib/gdrive/client")
  const { getNewsletters, getNewsletterYears } = await import("@/lib/gdrive/newsletters")

  const credentials = getGDriveCredentials(env)
  const folderId = env.GDRIVE_NEWSLETTERS_FOLDER_ID

  log("info", "Fetching newsletters from GDrive", { requestId, folderId })

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
}

// Fetch resources with detailed logging - uses dynamic imports
async function fetchResourcesData(requestId: string) {
  const env = await getEnv()
  
  if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_RESOURCES_FOLDER_ID) {
    log("warn", "GDrive not configured for resources", { requestId })
    return { delegateReports: [], areaDocuments: [], forms: [], conferenceMaterials: [] }
  }

  // Dynamic imports to reduce initial bundle size
  const { getGDriveCredentials } = await import("@/lib/gdrive/client")
  const { getResources } = await import("@/lib/gdrive/resources")

  const credentials = getGDriveCredentials(env)
  const folderId = env.GDRIVE_RESOURCES_FOLDER_ID

  log("info", "Fetching resources from GDrive", { requestId, folderId })

  const driveTimer = timer()
  const resources = await getResources(credentials, folderId)
  log("info", "GDrive resources fetched", { 
    requestId, 
    durationMs: driveTimer.elapsed(),
    delegateReports: resources.delegateReports.length,
    areaDocuments: resources.areaDocuments.length,
    forms: resources.forms.length,
    conferenceMaterials: resources.conferenceMaterials.length,
  })

  // Enrich with metadata from DB
  const enrichTimer = timer()
  const [delegateReports, areaDocuments, forms, conferenceMaterials] = await Promise.all([
    enrichResourcesWithMetadata(resources.delegateReports),
    enrichResourcesWithMetadata(resources.areaDocuments),
    enrichResourcesWithMetadata(resources.forms),
    enrichResourcesWithMetadata(resources.conferenceMaterials),
  ])
  log("info", "Resources enriched with metadata", { 
    requestId, 
    durationMs: enrichTimer.elapsed(),
  })

  return { delegateReports, areaDocuments, forms, conferenceMaterials }
}

// Fetch committee files with detailed logging - uses dynamic imports
async function fetchCommitteesData(requestId: string) {
  const env = await getEnv()
  
  if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_COMMITTEES_FOLDER_ID) {
    log("warn", "GDrive not configured for committees", { requestId })
    return {}
  }

  // Dynamic imports to reduce initial bundle size
  const { getGDriveCredentials } = await import("@/lib/gdrive/client")
  const { getCommitteeFiles } = await import("@/lib/gdrive/committees")
  type CommitteeFiles = Awaited<ReturnType<typeof getCommitteeFiles>>

  const credentials = getGDriveCredentials(env)
  const folderId = env.GDRIVE_COMMITTEES_FOLDER_ID

  log("info", "Fetching committee files from GDrive", { requestId, folderId })

  const driveTimer = timer()
  const files = await getCommitteeFiles(credentials, folderId)
  const committeeCount = Object.keys(files).length
  const totalFiles = Object.values(files).reduce((sum, arr) => sum + arr.length, 0)
  log("info", "GDrive committee files fetched", { 
    requestId, 
    durationMs: driveTimer.elapsed(),
    committeeCount,
    totalFiles,
  })

  // Enrich with metadata
  const enrichTimer = timer()
  const enrichedFiles: CommitteeFiles = {}
  for (const [slug, committeeFiles] of Object.entries(files)) {
    enrichedFiles[slug] = await enrichCommitteeFilesWithMetadata(committeeFiles)
  }
  log("info", "Committee files enriched with metadata", { 
    requestId, 
    durationMs: enrichTimer.elapsed(),
  })

  return enrichedFiles
}

// Fetch service resources with detailed logging - uses dynamic imports
async function fetchServiceResourcesData(requestId: string) {
  const env = await getEnv()
  
  if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID) {
    log("warn", "GDrive not configured for service resources", { requestId })
    return []
  }

  // Dynamic imports to reduce initial bundle size
  const { getGDriveCredentials } = await import("@/lib/gdrive/client")
  const { getServiceResources } = await import("@/lib/gdrive/service-resources")
  type ServiceResource = Awaited<ReturnType<typeof getServiceResources>>[number]

  const credentials = getGDriveCredentials(env)
  const folderId = env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID

  log("info", "Fetching service resources from GDrive", { requestId, folderId })

  const driveTimer = timer()
  const resources = await getServiceResources(credentials, folderId)
  log("info", "GDrive service resources fetched", { 
    requestId, 
    durationMs: driveTimer.elapsed(),
    resourceCount: resources.length,
  })

  // Enrich with metadata
  if (resources.length === 0) return resources

  const enrichTimer = timer()
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
  log("info", "Service resources enriched with metadata", { 
    requestId, 
    durationMs: enrichTimer.elapsed(),
  })

  return enrichedResources
}

// Fetch conference materials with detailed logging - uses dynamic imports
async function fetchConferenceMaterialsData(requestId: string) {
  const env = await getEnv()
  
  if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_RESOURCES_FOLDER_ID) {
    log("warn", "GDrive not configured for conference materials", { requestId })
    return { materials: [], oldReports: [] }
  }

  // Dynamic imports to reduce initial bundle size
  const { getGDriveCredentials } = await import("@/lib/gdrive/client")
  const { getResourcesByCategory, getOldConferenceReports } = await import("@/lib/gdrive/resources")

  const credentials = getGDriveCredentials(env)
  const folderId = env.GDRIVE_RESOURCES_FOLDER_ID

  log("info", "Fetching conference materials from GDrive", { requestId, folderId })

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
        // Cache for 5 minutes on client, allow stale for 1 hour while revalidating
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
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

    return NextResponse.json(
      { error: errorMessage },
      { 
        status: 500,
        headers: { "X-Request-Id": requestId },
      }
    )
  }
}
