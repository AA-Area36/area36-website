"use server"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { fileMetadata } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { getGDriveCredentials, listFolders, listAllFiles } from "@/lib/gdrive/client"
import type { DriveFile } from "@/lib/gdrive/types"
import { setUnlockedFile } from "@/lib/files/session"

// Types for folder structure
export interface FolderNode {
  id: string
  name: string
  type: "folder"
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
  displayName?: string
  category?: string | null
}

export type TreeNode = FolderNode | FileNode

// Get environment variables
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
  }
}

/**
 * Recursively build folder tree from Google Drive
 */
async function buildFolderTree(
  credentials: ReturnType<typeof getGDriveCredentials>,
  folderId: string,
  folderName: string,
  metadataMap: Map<string, { displayName: string; password: string | null; category: string | null }>
): Promise<FolderNode> {
  // Get subfolders and files in parallel
  const [subfolders, files] = await Promise.all([
    listFolders(credentials, folderId),
    listAllFiles(credentials, folderId, { orderBy: "name" }),
  ])

  // Build children
  const children: (FolderNode | FileNode)[] = []

  // Add subfolders recursively
  for (const subfolder of subfolders) {
    const childFolder = await buildFolderTree(
      credentials,
      subfolder.id,
      subfolder.name,
      metadataMap
    )
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
      parentId: folderId,
      hasMetadata: !!meta,
      isProtected: !!meta?.password,
      displayName: meta?.displayName,
      category: meta?.category,
    })
  }

  return {
    id: folderId,
    name: folderName,
    type: "folder",
    children,
  }
}

/**
 * Get folder structure from all configured Google Drive folders
 */
export async function getFolderStructure(): Promise<FolderNode[]> {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const env = await getEnv()
  if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL) {
    return []
  }

  const credentials = getGDriveCredentials(env)

  // Get all file metadata to mark files with custom settings
  const db = await getDb()
  const allMetadata = await db.select().from(fileMetadata)
  const metadataMap = new Map(
    allMetadata.map((m) => [m.driveId, { displayName: m.displayName, password: m.password, category: m.category }])
  )

  const folders: FolderNode[] = []

  // Build tree for each configured folder
  const folderConfigs = [
    { id: env.GDRIVE_RESOURCES_FOLDER_ID, name: "Resources" },
    { id: env.GDRIVE_COMMITTEES_FOLDER_ID, name: "Committees" },
    { id: env.GDRIVE_NEWSLETTERS_FOLDER_ID, name: "Newsletters" },
    { id: env.GDRIVE_RECORDINGS_FOLDER_ID, name: "Recordings" },
  ].filter((f) => f.id)

  for (const config of folderConfigs) {
    try {
      const tree = await buildFolderTree(
        credentials,
        config.id,
        config.name,
        metadataMap
      )
      folders.push(tree)
    } catch (error) {
      console.error(`Error building tree for ${config.name}:`, error)
    }
  }

  return folders
}

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
        password: data.password ?? null,
        category: data.category ?? null,
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
      password: data.password ?? null,
      category: data.category ?? null,
    })
  }

  revalidatePath("/admin/files")
  revalidatePath("/resources")
  revalidatePath("/committees")
  revalidatePath("/general-service-conference")

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

  revalidatePath("/admin/files")
  revalidatePath("/resources")
  revalidatePath("/committees")
  revalidatePath("/general-service-conference")

  return { success: true }
}

/**
 * Verify file password and unlock (public action)
 */
export async function verifyFilePassword(
  driveId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb()
  const results = await db
    .select()
    .from(fileMetadata)
    .where(eq(fileMetadata.driveId, driveId))
    .limit(1)

  const meta = results[0]
  if (!meta || !meta.password) {
    return { success: false, error: "File not found" }
  }

  if (meta.password !== password) {
    return { success: false, error: "Incorrect password" }
  }

  // Set cookie to unlock file
  await setUnlockedFile(driveId)

  return { success: true }
}
