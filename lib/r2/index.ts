import { getCloudflareContext } from "@opennextjs/cloudflare"

export async function getR2Bucket() {
  const { env } = await getCloudflareContext({ async: true })
  return env.DRIVE_IMAGES
}

export async function uploadImage(
  key: string,
  file: File
): Promise<{ success: true; key: string } | { success: false; error: string }> {
  const bucket = await getR2Bucket()

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Invalid file type. Please upload a JPG, PNG, or WebP image." }
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { success: false, error: "File too large. Maximum size is 10MB." }
  }

  const arrayBuffer = await file.arrayBuffer()
  await bucket.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
    },
  })

  return { success: true, key }
}

export async function getImage(key: string): Promise<R2ObjectBody | null> {
  const bucket = await getR2Bucket()
  return bucket.get(key)
}

export async function deleteImage(key: string): Promise<void> {
  const bucket = await getR2Bucket()
  await bucket.delete(key)
}

export async function deleteImagesByPrefix(prefix: string): Promise<number> {
  const bucket = await getR2Bucket()
  let listed = await bucket.list({ prefix })

  let deletedCount = 0
  for (const object of listed.objects) {
    await bucket.delete(object.key)
    deletedCount++
  }

  // Handle truncated results (more than 1000 objects)
  while (listed.truncated) {
    listed = await bucket.list({ prefix, cursor: listed.cursor })
    for (const object of listed.objects) {
      await bucket.delete(object.key)
      deletedCount++
    }
  }

  return deletedCount
}

// Allowed MIME types for event flyers
const FLYER_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const

const FLYER_MAX_SIZE = 15 * 1024 * 1024 // 15MB for flyers (PDFs can be larger)

export interface UploadFlyerResult {
  success: true
  key: string
  fileName: string
  fileType: string
  fileSize: number
}

export interface UploadFlyerError {
  success: false
  error: string
}

/**
 * Upload an event flyer (image or PDF) to R2
 * @param eventId - The event ID (used for organizing files)
 * @param file - The file to upload
 * @returns Upload result with key and metadata, or error
 */
export async function uploadFlyer(
  eventId: string,
  file: File
): Promise<UploadFlyerResult | UploadFlyerError> {
  const bucket = await getR2Bucket()

  // Validate file type
  if (!FLYER_ALLOWED_TYPES.includes(file.type as typeof FLYER_ALLOWED_TYPES[number])) {
    return {
      success: false,
      error: "Invalid file type. Please upload a JPG, PNG, WebP, GIF, or PDF file.",
    }
  }

  // Validate file size
  if (file.size > FLYER_MAX_SIZE) {
    return { success: false, error: "File too large. Maximum size is 15MB." }
  }

  // Generate unique key with event ID prefix for organization
  // Format: flyers/{eventId}/{timestamp}-{sanitizedFileName}
  const timestamp = Date.now()
  const sanitizedName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
  const key = `flyers/${eventId}/${timestamp}-${sanitizedName}`

  try {
    const arrayBuffer = await file.arrayBuffer()
    await bucket.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    })

    return {
      success: true,
      key,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }
  } catch (error) {
    console.error("Failed to upload flyer:", error)
    return { success: false, error: "Failed to upload file. Please try again." }
  }
}

/**
 * Get a flyer from R2
 * @param key - The R2 object key
 * @returns The R2 object body or null if not found
 */
export async function getFlyer(key: string): Promise<R2ObjectBody | null> {
  const bucket = await getR2Bucket()
  return bucket.get(key)
}

/**
 * Delete a flyer from R2
 * @param key - The R2 object key to delete
 */
export async function deleteFlyer(key: string): Promise<void> {
  const bucket = await getR2Bucket()
  await bucket.delete(key)
}

/**
 * Delete all flyers for an event
 * @param eventId - The event ID
 * @returns Number of files deleted
 */
export async function deleteFlyersByEventId(eventId: string): Promise<number> {
  return deleteImagesByPrefix(`flyers/${eventId}/`)
}
