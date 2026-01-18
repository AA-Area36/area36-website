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
