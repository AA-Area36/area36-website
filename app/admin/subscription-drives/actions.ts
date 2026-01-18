"use server"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { subscriptionDrives, driveSubmissions, type SubscriptionDrive, type DriveSubmission, type DriveSubmissionStatus } from "@/lib/db/schema"
import { deleteImage, deleteImagesByPrefix } from "@/lib/r2"
import { createDriveSchema, updateDriveSchema, type CreateDriveData, type UpdateDriveData } from "@/lib/schemas/drive-submission"
import { eq, desc, and, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// Fetch all drives
export async function getAllDrives(): Promise<SubscriptionDrive[]> {
  const db = await getDb()
  return db.select().from(subscriptionDrives).orderBy(desc(subscriptionDrives.createdAt))
}

// Fetch submissions for a drive
export async function getDriveSubmissions(driveId: string, status?: DriveSubmissionStatus | "all"): Promise<DriveSubmission[]> {
  const db = await getDb()

  if (status && status !== "all") {
    return db
      .select()
      .from(driveSubmissions)
      .where(and(eq(driveSubmissions.driveId, driveId), eq(driveSubmissions.status, status)))
      .orderBy(desc(driveSubmissions.submittedAt))
  }

  return db
    .select()
    .from(driveSubmissions)
    .where(eq(driveSubmissions.driveId, driveId))
    .orderBy(desc(driveSubmissions.submittedAt))
}

// Get drive stats
export interface DriveStats {
  pendingCount: number
  approvedCount: number
  deniedCount: number
  totalApprovedSubscriptions: number
  totalPendingSubscriptions: number
  leadingDistrict: string | null
  leadingDistrictSubscriptions: number
}

export interface DriveLeaderboardEntry {
  district: string
  approved: number
  pending: number
  total: number
}

export async function getDriveStats(driveId: string): Promise<DriveStats> {
  const db = await getDb()

  const submissions = await db
    .select()
    .from(driveSubmissions)
    .where(eq(driveSubmissions.driveId, driveId))

  const pendingCount = submissions.filter((s) => s.status === "pending").length
  const approvedCount = submissions.filter((s) => s.status === "approved").length
  const deniedCount = submissions.filter((s) => s.status === "denied").length

  // Calculate total subscriptions from approved and pending submissions
  const approvedSubmissions = submissions.filter((s) => s.status === "approved")
  const pendingSubmissions = submissions.filter((s) => s.status === "pending")
  const totalApprovedSubscriptions = approvedSubmissions.reduce((sum, s) => sum + s.subscriptionCount, 0)
  const totalPendingSubscriptions = pendingSubmissions.reduce((sum, s) => sum + s.subscriptionCount, 0)

  // Find leading district (by approved only)
  const districtTotals = new Map<string, number>()
  for (const submission of approvedSubmissions) {
    const current = districtTotals.get(submission.district) || 0
    districtTotals.set(submission.district, current + submission.subscriptionCount)
  }

  let leadingDistrict: string | null = null
  let leadingDistrictSubscriptions = 0
  for (const [district, total] of districtTotals) {
    if (total > leadingDistrictSubscriptions) {
      leadingDistrictSubscriptions = total
      leadingDistrict = district
    }
  }

  return {
    pendingCount,
    approvedCount,
    deniedCount,
    totalApprovedSubscriptions,
    totalPendingSubscriptions,
    leadingDistrict,
    leadingDistrictSubscriptions,
  }
}

export async function getDriveLeaderboard(driveId: string): Promise<DriveLeaderboardEntry[]> {
  const db = await getDb()
  const allSubmissions = await db
    .select()
    .from(driveSubmissions)
    .where(eq(driveSubmissions.driveId, driveId))

  // Aggregate subscriptions by district (approved and pending separately)
  const districtTotals = new Map<string, { approved: number; pending: number }>()
  for (const submission of allSubmissions) {
    const current = districtTotals.get(submission.district) || { approved: 0, pending: 0 }
    if (submission.status === "approved") {
      current.approved += submission.subscriptionCount
    } else if (submission.status === "pending") {
      current.pending += submission.subscriptionCount
    }
    districtTotals.set(submission.district, current)
  }

  // Convert to array and sort by total (approved + pending)
  return Array.from(districtTotals.entries())
    .map(([district, { approved, pending }]) => ({
      district,
      approved,
      pending,
      total: approved + pending,
    }))
    .sort((a, b) => b.total - a.total)
}

// Approve submission
export async function approveSubmission(submissionId: string): Promise<void> {
  const session = await auth()

  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const db = await getDb()
  await db
    .update(driveSubmissions)
    .set({
      status: "approved",
      reviewedBy: session.user.email,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(driveSubmissions.id, submissionId))

  revalidatePath("/admin/subscription-drives")
  revalidatePath("/grapevine")
}

// Deny submission
export async function denySubmission(submissionId: string, reason: string): Promise<void> {
  const session = await auth()

  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const db = await getDb()
  await db
    .update(driveSubmissions)
    .set({
      status: "denied",
      denialReason: reason,
      reviewedBy: session.user.email,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(driveSubmissions.id, submissionId))

  revalidatePath("/admin/subscription-drives")
  revalidatePath("/grapevine")
}

// Delete submission
export async function deleteSubmission(submissionId: string): Promise<void> {
  const session = await auth()

  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const db = await getDb()

  // Get submission to find image key
  const [submission] = await db
    .select()
    .from(driveSubmissions)
    .where(eq(driveSubmissions.id, submissionId))

  if (!submission) {
    throw new Error("Submission not found")
  }

  // Delete image from R2
  try {
    await deleteImage(submission.confirmationImageKey)
  } catch (error) {
    console.error("Failed to delete image from R2:", error)
  }

  // Delete submission from database
  await db.delete(driveSubmissions).where(eq(driveSubmissions.id, submissionId))

  revalidatePath("/admin/subscription-drives")
  revalidatePath("/grapevine")
}

// Create drive
export async function createDrive(data: CreateDriveData): Promise<{ success: true; drive: SubscriptionDrive } | { success: false; error: string }> {
  const session = await auth()

  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const result = createDriveSchema.safeParse(data)
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message ?? "Invalid form data",
    }
  }

  const driveId = `drive_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  const db = await getDb()
  await db.insert(subscriptionDrives).values({
    id: driveId,
    name: result.data.name,
    description: result.data.description || null,
    startDate: result.data.startDate,
    endDate: result.data.endDate,
    prizeDescription: result.data.prizeDescription || null,
    isActive: true,
  })

  const [drive] = await db.select().from(subscriptionDrives).where(eq(subscriptionDrives.id, driveId))

  revalidatePath("/admin/subscription-drives")
  revalidatePath("/admin/subscription-drives/manage")
  revalidatePath("/grapevine")

  return { success: true, drive }
}

// Update drive
export async function updateDrive(driveId: string, data: UpdateDriveData): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth()

  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const result = updateDriveSchema.safeParse(data)
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message ?? "Invalid form data",
    }
  }

  const db = await getDb()
  await db
    .update(subscriptionDrives)
    .set({
      name: result.data.name,
      description: result.data.description || null,
      startDate: result.data.startDate,
      endDate: result.data.endDate,
      prizeDescription: result.data.prizeDescription || null,
      isActive: result.data.isActive,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(subscriptionDrives.id, driveId))

  revalidatePath("/admin/subscription-drives")
  revalidatePath("/admin/subscription-drives/manage")
  revalidatePath("/grapevine")

  return { success: true }
}

// End drive (deactivate and optionally delete images)
export async function endDrive(driveId: string, deleteImages: boolean = false): Promise<void> {
  const session = await auth()

  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const db = await getDb()

  // Mark drive as inactive
  await db
    .update(subscriptionDrives)
    .set({
      isActive: false,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(subscriptionDrives.id, driveId))

  // Optionally delete all images for this drive
  if (deleteImages) {
    try {
      const deletedCount = await deleteImagesByPrefix(`${driveId}/`)
      console.log(`Deleted ${deletedCount} images for drive ${driveId}`)
    } catch (error) {
      console.error("Failed to delete drive images:", error)
    }
  }

  revalidatePath("/admin/subscription-drives")
  revalidatePath("/admin/subscription-drives/manage")
  revalidatePath("/grapevine")
}

// Get a single drive by ID
export async function getDrive(driveId: string): Promise<SubscriptionDrive | null> {
  const db = await getDb()
  const [drive] = await db.select().from(subscriptionDrives).where(eq(subscriptionDrives.id, driveId))
  return drive || null
}

// Get active drive
export async function getActiveDrive(): Promise<SubscriptionDrive | null> {
  const db = await getDb()
  const [drive] = await db
    .select()
    .from(subscriptionDrives)
    .where(eq(subscriptionDrives.isActive, true))
    .orderBy(desc(subscriptionDrives.createdAt))
    .limit(1)

  return drive || null
}
