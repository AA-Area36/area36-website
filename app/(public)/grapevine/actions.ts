"use server"

import { verifyRecaptcha } from "@/lib/security/recaptcha"

import { getDb } from "@/lib/db"
import { subscriptionDrives, driveSubmissions, type SubscriptionDrive, type DriveSubmission } from "@/lib/db/schema"
import { deleteImage, uploadImage } from "@/lib/r2"
import { eq, and, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit"
import { persistUploadedObject } from "@/lib/storage/persist-upload"


/**
 * Get reCAPTCHA secret key from Cloudflare context or process.env
 */

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

export async function getApprovedSubmissions(driveId: string): Promise<DriveSubmission[]> {
  const db = await getDb()
  return db
    .select()
    .from(driveSubmissions)
    .where(
      and(
        eq(driveSubmissions.driveId, driveId),
        eq(driveSubmissions.status, "approved")
      )
    )
}

export interface DriveLeaderboardEntry {
  district: string
  approved: number
  pending: number
  total: number
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

export async function submitDriveConfirmation(formData: FormData) {
  const district = formData.get("district") as string
  const subscriptionCount = parseInt(formData.get("subscriptionCount") as string, 10)
  const submitterContact = formData.get("submitterContact") as string | null
  const privacyAcknowledged = formData.get("privacyAcknowledged") === "true"
  const recaptchaToken = formData.get("recaptchaToken") as string
  const confirmationImage = formData.get("confirmationImage") as File | null

  // Basic validation
  if (!district || isNaN(subscriptionCount) || subscriptionCount < 1) {
    return {
      success: false,
      error: "Please provide a valid district and subscription count.",
    }
  }

  if (!privacyAcknowledged) {
    return {
      success: false,
      error: "Please acknowledge the privacy notice.",
    }
  }

  if (!confirmationImage || confirmationImage.size === 0) {
    return {
      success: false,
      error: "Please upload a confirmation image.",
    }
  }

  const ip = await getClientIp()
  const rateLimit = await checkRateLimit(`grapevine:${ip}`, {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  })
  if (!rateLimit.ok) {
    return {
      success: false,
      error: "Too many submissions. Please try again later.",
    }
  }

  const recaptcha = await verifyRecaptcha(recaptchaToken, "submit_drive_confirmation")
  if (!recaptcha.success) return { success: false, error: recaptcha.error }

  try {
    // Get active drive
    const activeDrive = await getActiveDrive()
    if (!activeDrive) {
      return {
        success: false,
        error: "No active subscription drive found.",
      }
    }

    // Generate unique ID and image key
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const imageKey = `${activeDrive.id}/${submissionId}.${confirmationImage.type.split("/")[1] || "jpg"}`

    // Upload image to R2
    const uploadResult = await uploadImage(imageKey, confirmationImage)
    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error,
      }
    }

    await persistUploadedObject(async () => {
      const db = await getDb()
      await db.insert(driveSubmissions).values({
        id: submissionId,
        driveId: activeDrive.id,
        district,
        subscriptionCount,
        confirmationImageKey: uploadResult.key,
        submitterContact: submitterContact || null,
        status: "pending",
      })
    }, () => deleteImage(uploadResult.key))

    // Revalidate pages to show new submission in charts
    try {
      revalidatePath("/grapevine")
      revalidatePath("/admin/subscription-drives")
    } catch (error) {
      // The submission is committed; stale caches can recover independently.
      console.error("Drive submission saved but cache invalidation failed", error)
    }

    return {
      success: true,
      message: "Your subscription confirmation has been submitted for review. Thank you for participating in the drive!",
    }
  } catch (error) {
    console.error("Drive submission error:", error)
    return {
      success: false,
      error: "An error occurred while submitting your confirmation. Please try again.",
    }
  }
}
