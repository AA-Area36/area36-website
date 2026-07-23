import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { fileCacheBustPending, fileMetadata } from "@/lib/db/schema"
import { sql } from "drizzle-orm"
import { filterArchivedFolders } from "@/lib/gdrive/archive"
import {
  createApiErrorResponse,
  createApiRequestId,
  getRedactedErrorMetadata,
} from "@/lib/api/error-response"
import { recordError } from "@/lib/monitoring/errors"

// Types for folder structure
interface FolderNode {
  id: string
  name: string
  type: "folder"
  isRestricted?: boolean
  children: (FolderNode | FileNode)[]
}

interface FileNode {
  id: string
  name: string
  type: "file"
  mimeType: string
  size?: string
  parentId: string
  hasMetadata?: boolean
  isProtected?: boolean
  isRestricted?: boolean
  displayName?: string
  category?: string | null
}

// Folder type enum for per-folder requests
type FolderType = "resources" | "committees" | "newsletters" | "recordings" | "service-resources"

const FOLDER_CONFIG: Record<FolderType, { envKey: string; name: string }> = {
  resources: { envKey: "GDRIVE_RESOURCES_FOLDER_ID", name: "Resources" },
  committees: { envKey: "GDRIVE_COMMITTEES_FOLDER_ID", name: "Committees" },
  newsletters: { envKey: "GDRIVE_NEWSLETTERS_FOLDER_ID", name: "Newsletters" },
  recordings: { envKey: "GDRIVE_RECORDINGS_FOLDER_ID", name: "Recordings" },
  "service-resources": { envKey: "GDRIVE_SERVICE_RESOURCES_FOLDER_ID", name: "Service Resources" },
}

// Cache TTL for admin files (shorter since admins need fresh data)
const CACHE_TTL = 60 * 5 // 5 minutes

function isMissingPendingTableError(err: unknown): boolean {
  const msg = (
    err instanceof Error
      ? err.cause instanceof Error
        ? err.cause.message
        : err.message
      : String(err)
  ).toLowerCase()
  return msg.includes("no such table: file_cache_bust_pending")
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

  return {
    GDRIVE_SERVICE_ACCOUNT_EMAIL: process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL || "",
    GDRIVE_PRIVATE_KEY: process.env.GDRIVE_PRIVATE_KEY || "",
    GDRIVE_PRIVATE_KEY_ID: process.env.GDRIVE_PRIVATE_KEY_ID || "",
    GDRIVE_RESOURCES_FOLDER_ID: process.env.GDRIVE_RESOURCES_FOLDER_ID || "",
    GDRIVE_COMMITTEES_FOLDER_ID: process.env.GDRIVE_COMMITTEES_FOLDER_ID || "",
    GDRIVE_NEWSLETTERS_FOLDER_ID: process.env.GDRIVE_NEWSLETTERS_FOLDER_ID || "",
    GDRIVE_RECORDINGS_FOLDER_ID: process.env.GDRIVE_RECORDINGS_FOLDER_ID || "",
    GDRIVE_SERVICE_RESOURCES_FOLDER_ID: process.env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID || "",
  }
}

/**
 * Build folder tree for a single root folder
 * Uses caching to reduce CPU usage
 */
async function buildSingleFolderTree(
  folderType: FolderType,
  metadataMap: Map<string, { displayName: string; password: string | null; category: string | null }>
): Promise<FolderNode | null> {
  const { withCache } = await import("@/lib/gdrive/cache")
  const config = FOLDER_CONFIG[folderType]
  
  return withCache(
    `admin:folder:${folderType}`,
    async () => {
      const env = await getEnv()
      const folderId = (env as Record<string, string>)[config.envKey]
      
      if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !folderId) {
        return null
      }

      const { getGDriveCredentials, listFolders, listAllFiles } = await import("@/lib/gdrive/client")
      const { isFolderRestricted } = await import("@/lib/gdrive/restricted")
      const credentials = getGDriveCredentials(env)

      async function buildTree(
        currentFolderId: string,
        folderName: string,
        parentRestricted = false
      ): Promise<FolderNode> {
        // Get subfolders, files, and restriction status in parallel
        const [subfolders, files, selfRestricted] = await Promise.all([
          listFolders(credentials, currentFolderId),
          listAllFiles(credentials, currentFolderId, { orderBy: "name" }),
          isFolderRestricted(credentials, currentFolderId),
        ])
        const restricted = selfRestricted || parentRestricted
        const visibleSubfolders = filterArchivedFolders(subfolders)

        const children: (FolderNode | FileNode)[] = []

        // Add subfolders recursively (inherit restriction from parent)
        for (const subfolder of visibleSubfolders) {
          const childFolder = await buildTree(subfolder.id, subfolder.name, restricted)
          children.push(childFolder)
        }

        // Add files (excluding folders)
        const fileItems = files.filter(
          (f) => f.mimeType !== "application/vnd.google-apps.folder"
        )
        for (const file of fileItems) {
          const meta = metadataMap.get(file.id)
          children.push({
            id: file.id,
            name: file.name,
            type: "file",
            mimeType: file.mimeType,
            size: file.size,
            parentId: currentFolderId,
            hasMetadata: !!meta,
            isProtected: !!meta?.password,
            isRestricted: restricted,
            displayName: meta?.displayName,
            category: meta?.category,
          })
        }

        return {
          id: currentFolderId,
          name: folderName,
          type: "folder",
          isRestricted: restricted,
          children,
        }
      }

      return buildTree(folderId, config.name)
    },
    { ttl: CACHE_TTL }
  )
}

export async function GET(request: NextRequest) {
  const requestId = createApiRequestId()
  const responseHeaders = {
    "Cache-Control": "no-store",
    "X-Request-Id": requestId,
  } as const

  // Check authentication
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized", requestId },
      { status: 401, headers: responseHeaders },
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const folderType = searchParams.get("folder") as FolderType | null

    // Get all file metadata (needed for both modes)
    const db = await getDb()
    const [allMetadata, pendingCacheBustCount] = await Promise.all([
      db.select().from(fileMetadata),
      (async () => {
        try {
          const [row] = await db
            .select({ count: sql<number>`count(*)` })
            .from(fileCacheBustPending)
          return row?.count ?? 0
        } catch (err) {
          if (isMissingPendingTableError(err)) return 0
          throw err
        }
      })(),
    ])
    const metadataMap = new Map(
      allMetadata.map((m) => [m.driveId, { displayName: m.displayName, password: m.password, category: m.category }])
    )

    // If a specific folder is requested, fetch only that one
    if (folderType) {
      if (!FOLDER_CONFIG[folderType]) {
        return NextResponse.json(
          {
            error: `Invalid folder type. Valid types: ${Object.keys(FOLDER_CONFIG).join(", ")}`,
            requestId,
          },
          { status: 400, headers: responseHeaders }
        )
      }

      const folder = await buildSingleFolderTree(folderType, metadataMap)
      
      return NextResponse.json(
        {
          folder,
          metadata: allMetadata,
          pendingCacheBustCount,
        },
        { headers: responseHeaders }
      )
    }

    // Otherwise, return just metadata and folder config (for initial load)
    // Client will fetch individual folders separately
    const env = await getEnv()
    const availableFolders = Object.entries(FOLDER_CONFIG)
      .filter(([, config]) => {
        const folderId = (env as Record<string, string>)[config.envKey]
        return env.GDRIVE_SERVICE_ACCOUNT_EMAIL && folderId
      })
      .map(([type, config]) => ({
        type,
        name: config.name,
      }))

    return NextResponse.json(
      {
        availableFolders,
        metadata: allMetadata,
        pendingCacheBustCount,
      },
      { headers: responseHeaders }
    )
  } catch (error) {
    console.error("Error fetching admin files data", {
      requestId,
      ...getRedactedErrorMetadata(error),
    })
    void recordError({
      kind: "FETCH_FAILED",
      route: "/api/admin/files",
      error,
      messageOverride: "Admin files API failed",
    })
    return createApiErrorResponse({
      message: "Failed to fetch files.",
      requestId,
    })
  }
}
