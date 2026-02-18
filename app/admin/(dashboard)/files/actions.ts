"use server"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { fileMetadata } from "@/lib/db/schema"
import { eq, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { hashPassword } from "@/lib/security/passwords"

const ADMIN_FOLDER_CACHE_KEYS = [
  "admin:folder:resources",
  "admin:folder:committees",
  "admin:folder:newsletters",
  "admin:folder:recordings",
  "admin:folder:service-resources",
] as const

const USER_GDRIVE_API_CACHE_KEYS = [
  "api:recordings",
  "api:newsletters",
  "api:resources",
  "api:committees",
  "api:service-resources",
  "api:conference-materials",
  "api:background-materials",
] as const

const ROOT_FOLDER_ENV_KEYS = [
  "GDRIVE_RESOURCES_FOLDER_ID",
  "GDRIVE_COMMITTEES_FOLDER_ID",
  "GDRIVE_NEWSLETTERS_FOLDER_ID",
  "GDRIVE_RECORDINGS_FOLDER_ID",
  "GDRIVE_SERVICE_RESOURCES_FOLDER_ID",
] as const

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder"

type FileAdminActionResult = {
  success: boolean
  message: string
  deletedCount?: number
}

async function getEnvForCacheInvalidation() {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare")
    const { env } = await getCloudflareContext({ async: true })
    if (env.GDRIVE_SERVICE_ACCOUNT_EMAIL || env.GDRIVE_COMMITTEES_FOLDER_ID || env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID) {
      return {
        GDRIVE_SERVICE_ACCOUNT_EMAIL: env.GDRIVE_SERVICE_ACCOUNT_EMAIL || "",
        GDRIVE_PRIVATE_KEY: env.GDRIVE_PRIVATE_KEY || "",
        GDRIVE_PRIVATE_KEY_ID: env.GDRIVE_PRIVATE_KEY_ID || "",
        GDRIVE_RESOURCES_FOLDER_ID: env.GDRIVE_RESOURCES_FOLDER_ID || "",
        GDRIVE_COMMITTEES_FOLDER_ID: env.GDRIVE_COMMITTEES_FOLDER_ID || "",
        GDRIVE_NEWSLETTERS_FOLDER_ID: env.GDRIVE_NEWSLETTERS_FOLDER_ID || "",
        GDRIVE_RECORDINGS_FOLDER_ID: env.GDRIVE_RECORDINGS_FOLDER_ID || "",
        GDRIVE_SERVICE_RESOURCES_FOLDER_ID: env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID || "",
      }
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

async function invalidateFileCaches(): Promise<void> {
  try {
    const { CACHE_KEYS, invalidateCacheEntries } = await import("@/lib/gdrive/cache")
    const env = await getEnvForCacheInvalidation()
    const keys = [
      ...ADMIN_FOLDER_CACHE_KEYS,
      ...USER_GDRIVE_API_CACHE_KEYS,
      CACHE_KEYS.newsletters,
      CACHE_KEYS.resources,
      CACHE_KEYS.recordings,
      "old-conference-reports",
    ]

    if (env.GDRIVE_COMMITTEES_FOLDER_ID) {
      keys.push(`committee-files-${env.GDRIVE_COMMITTEES_FOLDER_ID}`)
    }
    if (env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID) {
      keys.push(`service-resources-${env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID}`)
    }

    await invalidateCacheEntries(keys)
  } catch (error) {
    console.warn("Failed to invalidate file caches:", error)
  }
}

function revalidateFilePaths(): void {
  revalidatePath("/admin/files")
  revalidatePath("/resources")
  revalidatePath("/committees")
  revalidatePath("/general-service-conference")
  revalidatePath("/service-basics")
  revalidatePath("/events")
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

async function collectVisibleDriveFileIds(
  env: Awaited<ReturnType<typeof getEnvForCacheInvalidation>>,
  rootFolderIds: string[]
): Promise<Set<string>> {
  const { getGDriveCredentials, listFolders, listAllFiles } = await import("@/lib/gdrive/client")
  const { filterArchivedFolders } = await import("@/lib/gdrive/archive")

  const credentials = getGDriveCredentials(env)
  const visibleFileIds = new Set<string>()
  const visitedFolderIds = new Set<string>()
  const stack = [...rootFolderIds]

  while (stack.length > 0) {
    const currentFolderId = stack.pop()
    if (!currentFolderId || visitedFolderIds.has(currentFolderId)) continue

    visitedFolderIds.add(currentFolderId)

    const [subfolders, files] = await Promise.all([
      listFolders(credentials, currentFolderId),
      listAllFiles(credentials, currentFolderId, { orderBy: "name" }),
    ])

    for (const file of files) {
      if (file.mimeType !== FOLDER_MIME_TYPE) {
        visibleFileIds.add(file.id)
      }
    }

    for (const folder of filterArchivedFolders(subfolders)) {
      if (!visitedFolderIds.has(folder.id)) {
        stack.push(folder.id)
      }
    }
  }

  return visibleFileIds
}

export async function bustFileCaches(): Promise<FileAdminActionResult> {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  await invalidateFileCaches()
  revalidateFilePaths()

  return {
    success: true,
    message: "File caches were cleared.",
  }
}

export async function cleanupStaleFileMetadata(): Promise<FileAdminActionResult> {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const env = await getEnvForCacheInvalidation()
  if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_PRIVATE_KEY || !env.GDRIVE_PRIVATE_KEY_ID) {
    return {
      success: false,
      message: "Google Drive credentials are not configured; stale metadata cleanup was skipped.",
    }
  }
  const configuredRootFolderIds = ROOT_FOLDER_ENV_KEYS.map((key) => env[key]).filter(Boolean)
  if (configuredRootFolderIds.length === 0) {
    return {
      success: false,
      message: "No Google Drive root folders are configured; stale metadata cleanup was skipped.",
    }
  }

  const db = await getDb()
  const metadataRows = await db
    .select({
      driveId: fileMetadata.driveId,
    })
    .from(fileMetadata)

  if (metadataRows.length === 0) {
    await invalidateFileCaches()
    revalidateFilePaths()
    return {
      success: true,
      message: "No metadata rows found to clean.",
      deletedCount: 0,
    }
  }

  const visibleFileIds = await collectVisibleDriveFileIds(env, configuredRootFolderIds)
  const staleDriveIds = metadataRows
    .map((row) => row.driveId)
    .filter((driveId) => !visibleFileIds.has(driveId))

  for (const driveIdChunk of chunk(staleDriveIds, 250)) {
    await db.delete(fileMetadata).where(inArray(fileMetadata.driveId, driveIdChunk))
  }

  await invalidateFileCaches()
  revalidateFilePaths()

  return {
    success: true,
    message:
      staleDriveIds.length > 0
        ? `Removed ${staleDriveIds.length} stale metadata entr${staleDriveIds.length === 1 ? "y" : "ies"}.`
        : "No stale metadata found.",
    deletedCount: staleDriveIds.length,
  }
}

// Types for folder structure (used by client components)
export interface FolderNode {
  id: string
  name: string
  type: "folder"
  /** True when the Drive folder is not publicly shared (service-account only). */
  isRestricted?: boolean
  children: (FolderNode | FileNode)[]
}

export interface FileNode {
  id: string
  name: string
  type: "file"
  mimeType: string
  size?: string
  parentId: string
  hasMetadata?: boolean
  isProtected?: boolean
  /** True when the parent folder is not publicly shared (service-account only). */
  isRestricted?: boolean
  displayName?: string
  category?: string | null
}

export type TreeNode = FolderNode | FileNode

/**
 * Get all file metadata from database
 */
export async function getAllFileMetadata() {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const db = await getDb()
  return db.select().from(fileMetadata)
}

/**
 * Get metadata for a specific file
 */
export async function getFileMetadataById(driveId: string) {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const db = await getDb()
  const results = await db
    .select()
    .from(fileMetadata)
    .where(eq(fileMetadata.driveId, driveId))
    .limit(1)
  return results[0] || null
}

/**
 * Create or update file metadata
 */
export async function upsertFileMetadata(data: {
  driveId: string
  parentFolderId: string
  displayName: string
  password?: string | null
  category?: string | null
}) {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const db = await getDb()

  // password: undefined => keep existing, null => clear, string => set
  const passwordValue = data.password === undefined ? undefined : data.password?.trim() || null
  const password =
    passwordValue === undefined
      ? undefined
      : passwordValue === null
        ? null
        : await hashPassword(passwordValue)
  const category = data.category?.trim() || null

  // Check if metadata already exists
  const existing = await db
    .select()
    .from(fileMetadata)
    .where(eq(fileMetadata.driveId, data.driveId))
    .limit(1)

  if (existing.length > 0) {
    // Update existing
    await db
      .update(fileMetadata)
      .set({
        displayName: data.displayName,
        ...(password !== undefined && { password }),
        category,
        parentFolderId: data.parentFolderId,
        updatedAt: sql`datetime('now')`,
      })
      .where(eq(fileMetadata.driveId, data.driveId))
  } else {
    // Insert new
    await db.insert(fileMetadata).values({
      id: nanoid(),
      driveId: data.driveId,
      parentFolderId: data.parentFolderId,
      displayName: data.displayName,
      password: password ?? null,
      category,
    })
  }

  await invalidateFileCaches()
  revalidateFilePaths()

  return { success: true }
}

/**
 * Delete file metadata (reverts to using filename)
 */
export async function deleteFileMetadata(driveId: string) {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const db = await getDb()
  await db.delete(fileMetadata).where(eq(fileMetadata.driveId, driveId))

  await invalidateFileCaches()
  revalidateFilePaths()

  return { success: true }
}
