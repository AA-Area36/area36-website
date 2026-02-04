import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { fileMetadata } from "@/lib/db/schema"

// Types for folder structure
interface FolderNode {
  id: string
  name: string
  type: "folder"
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
      const credentials = getGDriveCredentials(env)

      async function buildTree(
        currentFolderId: string,
        folderName: string
      ): Promise<FolderNode> {
        // Get subfolders and files in parallel
        const [subfolders, files] = await Promise.all([
          listFolders(credentials, currentFolderId),
          listAllFiles(credentials, currentFolderId, { orderBy: "name" }),
        ])

        const children: (FolderNode | FileNode)[] = []

        // Add subfolders recursively
        for (const subfolder of subfolders) {
          const childFolder = await buildTree(subfolder.id, subfolder.name)
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
            displayName: meta?.displayName,
            category: meta?.category,
          })
        }

        return {
          id: currentFolderId,
          name: folderName,
          type: "folder",
          children,
        }
      }

      return buildTree(folderId, config.name)
    },
    { ttl: CACHE_TTL }
  )
}

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const folderType = searchParams.get("folder") as FolderType | null

    // Get all file metadata (needed for both modes)
    const db = await getDb()
    const allMetadata = await db.select().from(fileMetadata)
    const metadataMap = new Map(
      allMetadata.map((m) => [m.driveId, { displayName: m.displayName, password: m.password, category: m.category }])
    )

    // If a specific folder is requested, fetch only that one
    if (folderType) {
      if (!FOLDER_CONFIG[folderType]) {
        return NextResponse.json(
          { error: `Invalid folder type. Valid types: ${Object.keys(FOLDER_CONFIG).join(", ")}` },
          { status: 400 }
        )
      }

      const folder = await buildSingleFolderTree(folderType, metadataMap)
      
      return NextResponse.json({
        folder,
        metadata: allMetadata,
      })
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

    return NextResponse.json({
      availableFolders,
      metadata: allMetadata,
    })
  } catch (error) {
    console.error("Error fetching admin files data:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch files" },
      { status: 500 }
    )
  }
}
