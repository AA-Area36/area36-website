"use server"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { fileMetadata } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { hashPassword } from "@/lib/security/passwords"

// Types for folder structure (used by client components)
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

  // Convert empty strings to null for optional fields
  const passwordValue = data.password?.trim() || null
  const password = passwordValue ? await hashPassword(passwordValue) : null
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
        password,
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
      password,
      category,
    })
  }

  revalidatePath("/admin/files")
  revalidatePath("/resources")
  revalidatePath("/committees")
  revalidatePath("/general-service-conference")
  revalidatePath("/service")

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
  revalidatePath("/service")

  return { success: true }
}
